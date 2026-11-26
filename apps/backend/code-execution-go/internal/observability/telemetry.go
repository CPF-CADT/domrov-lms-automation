package observability

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	serverSpan   = 2
	producerSpan = 4
	consumerSpan = 5
	internalSpan = 1
)

type traceContextKey struct{}

type traceContext struct {
	traceID string
	spanID  string
	sampled bool
}

type telemetry struct {
	endpoint string
	client   *http.Client
	spans    chan spanData
	started  time.Time
	mu       sync.Mutex
	metrics  map[measurement]*histogramPoint
}

// EnableTelemetry configures optional OTLP/HTTP JSON export before the service
// starts accepting requests. The URL is a base endpoint, without a signal path.
func (l *Logger) EnableTelemetry(endpoint string) error {
	if endpoint == "" {
		return nil
	}
	target, err := url.Parse(endpoint)
	if err != nil || (target.Scheme != "http" && target.Scheme != "https") ||
		target.Hostname() == "" || target.User != nil || target.RawQuery != "" || target.Fragment != "" ||
		target.ForceQuery {
		return errors.New("invalid OTLP base endpoint")
	}
	t := &telemetry{
		endpoint: strings.TrimRight(target.String(), "/"),
		client: &http.Client{
			Timeout:       2 * time.Second,
			CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
		},
		spans:   make(chan spanData, 512),
		started: time.Now(),
		metrics: make(map[measurement]*histogramPoint),
	}
	l.telemetry = t
	go t.run(l)
	return nil
}

type measurement struct {
	kind        int
	method      string
	route       string
	destination string
	outcome     string
	status      int
}

func (m measurement) attributes() []otlpAttribute {
	switch m.kind {
	case serverSpan:
		attrs := []otlpAttribute{stringAttr("http.request.method", m.method)}
		if m.route != "unmatched" {
			attrs = append(attrs, stringAttr("http.route", m.route))
		}
		return append(attrs, otlpAttribute{Key: "http.response.status_code", Value: map[string]string{"intValue": strconv.Itoa(m.status)}})
	case producerSpan, consumerSpan:
		operation := "send"
		if m.kind == consumerSpan {
			operation = "process"
		}
		return []otlpAttribute{
			stringAttr("messaging.system", "rabbitmq"),
			stringAttr("messaging.operation.type", operation),
			stringAttr("messaging.destination.name", m.destination),
		}
	default:
		return []otlpAttribute{stringAttr("outcome", m.outcome)}
	}
}

var metricNames = map[int]string{
	serverSpan:   "http.server.request.duration",
	producerSpan: "messaging.client.operation.duration",
	consumerSpan: "messaging.process.duration",
	internalSpan: "domrov.execution.duration",
}

type operation struct {
	telemetry *telemetry
	trace     traceContext
	parentID  string
	name      string
	started   time.Time
	measure   measurement
}

func (l *Logger) startHTTP(ctx context.Context, method, route, parent string) (context.Context, *operation) {
	name := method
	if route != "unmatched" {
		name += " " + route
	}
	return l.startOperation(ctx, name, parent, measurement{kind: serverSpan, method: method, route: route})
}

func (l *Logger) StartPublish(ctx context.Context, destination string) (context.Context, *operation) {
	destination = executionDestination(destination)
	return l.startOperation(ctx, "publish "+destination, "", measurement{kind: producerSpan, destination: destination})
}

func (l *Logger) StartConsume(ctx context.Context, destination, parent string) (context.Context, *operation) {
	destination = executionDestination(destination)
	return l.startOperation(ctx, "process "+destination, parent, measurement{kind: consumerSpan, destination: destination})
}

func (l *Logger) StartExecution(ctx context.Context) (context.Context, *operation) {
	return l.startOperation(ctx, "execution.run", "", measurement{kind: internalSpan})
}

func executionDestination(destination string) string {
	switch destination {
	case "code.execution.requested", "code.execution.completed":
		return destination
	default:
		return "other"
	}
}

func (l *Logger) startOperation(ctx context.Context, name, incoming string, measure measurement) (context.Context, *operation) {
	if l.telemetry == nil {
		return ctx, nil
	}
	parent := extractTraceparent(incoming)
	if parent.traceID == "" {
		parent = spanContext(ctx)
	}
	trace := traceContext{traceID: parent.traceID, spanID: randomHex(8), sampled: parent.sampled}
	if trace.traceID == "" {
		trace.traceID = randomHex(16)
		trace.sampled = true
	}
	ctx = context.WithValue(ctx, traceContextKey{}, trace)
	return ctx, &operation{telemetry: l.telemetry, trace: trace, parentID: parent.spanID, name: name, started: time.Now(), measure: measure}
}

func (o *operation) End(failed bool) {
	if o != nil {
		o.finish(failed, false)
	}
}

func (o *operation) endHTTP(status int) {
	if o != nil {
		if status < 100 || status > 599 {
			status = 0
		}
		o.measure.status = status
		probe := o.measure.route == "/health/live" || o.measure.route == "/health/ready"
		o.finish(status >= 500 || status == 499, probe && status < 400)
	}
}

func (o *operation) EndExecution(outcome string, failed bool) {
	if o == nil {
		return
	}
	switch outcome {
	case "COMPLETED", "COMPILE_ERROR", "RUNTIME_ERROR", "TIMEOUT", "CANCELLED", "FAILED":
		o.measure.outcome = outcome
	default:
		o.measure.outcome = "OTHER"
	}
	o.finish(failed, false)
}

func (o *operation) finish(failed, skipSpan bool) {
	now := time.Now()
	if skipSpan {
		return
	}
	o.telemetry.observe(o.measure, now.Sub(o.started).Seconds())
	if !o.trace.sampled {
		return
	}
	span := spanData{
		TraceID: o.trace.traceID, SpanID: o.trace.spanID, ParentSpanID: o.parentID,
		Name: o.name, Kind: o.measure.kind, Start: nanos(o.started), End: nanos(now),
		Flags: 1, Attributes: o.measure.attributes(),
	}
	if failed {
		span.Status = &spanStatus{Code: 2}
	}
	select {
	case o.telemetry.spans <- span:
	default: // A slow collector must not delay application work.
	}
}

func spanContext(ctx context.Context) traceContext {
	trace, _ := ctx.Value(traceContextKey{}).(traceContext)
	return trace
}

// Traceparent returns only W3C trace context. Baggage and tracestate are not
// forwarded because they can contain arbitrary application data.
func Traceparent(ctx context.Context) string {
	trace := spanContext(ctx)
	if trace.traceID == "" {
		return ""
	}
	flags := "00"
	if trace.sampled {
		flags = "01"
	}
	return "00-" + trace.traceID + "-" + trace.spanID + "-" + flags
}

func extractTraceparent(header string) traceContext {
	if len(header) != 55 || header[:3] != "00-" || header[35] != '-' || header[52] != '-' {
		return traceContext{}
	}
	traceID, spanID, flags := header[3:35], header[36:52], header[53:]
	if !isLowerHex(traceID) || !isLowerHex(spanID) || !isLowerHex(flags) ||
		traceID == "00000000000000000000000000000000" || spanID == "0000000000000000" {
		return traceContext{}
	}
	value, _ := strconv.ParseUint(flags, 16, 8)
	return traceContext{traceID: traceID, spanID: spanID, sampled: value&1 != 0}
}

func isLowerHex(value string) bool {
	for _, c := range value {
		if !(c >= '0' && c <= '9') && !(c >= 'a' && c <= 'f') {
			return false
		}
	}
	return true
}

func randomHex(size int) string {
	var value [16]byte
	// Generate a valid non-zero ID even if the generated bytes were all zero.
	for value == [16]byte{} {
		_, _ = rand.Read(value[:size])
	}
	return hex.EncodeToString(value[:size])
}

type otlpAttribute struct {
	Key   string            `json:"key"`
	Value map[string]string `json:"value"`
}

func stringAttr(key, value string) otlpAttribute {
	return otlpAttribute{Key: key, Value: map[string]string{"stringValue": value}}
}

func nanos(t time.Time) string { return strconv.FormatInt(t.UnixNano(), 10) }

type spanStatus struct {
	Code int `json:"code"`
}

type spanData struct {
	TraceID      string          `json:"traceId"`
	SpanID       string          `json:"spanId"`
	ParentSpanID string          `json:"parentSpanId,omitempty"`
	Name         string          `json:"name"`
	Kind         int             `json:"kind"`
	Start        string          `json:"startTimeUnixNano"`
	End          string          `json:"endTimeUnixNano"`
	Flags        int             `json:"flags"`
	Attributes   []otlpAttribute `json:"attributes"`
	Status       *spanStatus     `json:"status,omitempty"`
}

var durationBounds = []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60}

type histogramPoint struct {
	Attributes []otlpAttribute `json:"attributes"`
	Start      string          `json:"startTimeUnixNano"`
	Time       string          `json:"timeUnixNano"`
	Count      uint64          `json:"count,string"`
	Sum        float64         `json:"sum"`
	Bounds     []float64       `json:"explicitBounds"`
	Buckets    []uint64        `json:"bucketCounts"`
}

func (t *telemetry) observe(key measurement, seconds float64) {
	t.mu.Lock()
	defer t.mu.Unlock()
	point := t.metrics[key]
	if point == nil {
		// The route and operation dimensions are already bounded. Cap the
		// total defensively in case a future handler emits new status codes.
		if len(t.metrics) >= 512 {
			return
		}
		point = &histogramPoint{
			Attributes: key.attributes(), Start: nanos(t.started), Bounds: durationBounds,
			Buckets: make([]uint64, len(durationBounds)+1),
		}
		t.metrics[key] = point
	}
	point.Count++
	point.Sum += seconds
	point.Buckets[sort.SearchFloat64s(durationBounds, seconds)]++
}

func (t *telemetry) metricSnapshot() []map[string]any {
	t.mu.Lock()
	now := nanos(time.Now())
	grouped := make(map[int][]histogramPoint)
	for key, point := range t.metrics {
		snapshot := *point
		snapshot.Time = now
		snapshot.Buckets = append([]uint64(nil), point.Buckets...)
		grouped[key.kind] = append(grouped[key.kind], snapshot)
	}
	t.mu.Unlock()
	var records []map[string]any
	for kind, points := range grouped {
		records = append(records, map[string]any{
			"name": metricNames[kind], "unit": "s",
			"histogram": map[string]any{"aggregationTemporality": 2, "dataPoints": points},
		})
	}
	return records
}

func (t *telemetry) run(logger *Logger) {
	traces := time.NewTicker(2 * time.Second)
	metrics := time.NewTicker(10 * time.Second)
	defer traces.Stop()
	defer metrics.Stop()
	var batch []spanData
	failed := make(map[string]bool)
	export := func(signal, resourceKey, scopeKey string, data any) {
		ok := t.post(signal, resourceKey, scopeKey, data)
		if !ok && !failed[signal] {
			logger.Log(context.Background(), slog.LevelWarn, "telemetry.export.failed",
				"Telemetry exporter could not send data", slog.String("operation", signal))
		}
		failed[signal] = !ok
	}
	flush := func() {
		if len(batch) > 0 {
			export("traces", "resourceSpans", "scopeSpans", batch)
			batch = batch[:0]
		}
	}
	for {
		select {
		case record := <-t.spans:
			batch = append(batch, record)
			if len(batch) >= 128 {
				flush()
			}
		case <-traces.C:
			flush()
		case <-metrics.C:
			if records := t.metricSnapshot(); len(records) > 0 {
				export("metrics", "resourceMetrics", "scopeMetrics", records)
			}
		}
	}
}

func (t *telemetry) post(signal, resourceKey, scopeKey string, data any) bool {
	scope := map[string]any{"scope": map[string]string{"name": "domrov/code-execution"}, signalToPayloadKey(signal): data}
	payload := map[string]any{resourceKey: []map[string]any{{
		"resource": map[string]any{"attributes": []otlpAttribute{stringAttr("service.name", "code-execution")}},
		scopeKey:   []map[string]any{scope},
	}}}
	body, err := json.Marshal(payload)
	if err != nil {
		return false
	}
	request, err := http.NewRequest(http.MethodPost, t.endpoint+"/v1/"+signal, bytes.NewReader(body))
	if err != nil {
		return false
	}
	request.Header.Set("Content-Type", "application/json")
	response, err := t.client.Do(request)
	if err != nil {
		return false
	}
	defer response.Body.Close()
	return response.StatusCode >= 200 && response.StatusCode < 300
}

func signalToPayloadKey(signal string) string {
	if signal == "traces" {
		return "spans"
	}
	return signal
}
