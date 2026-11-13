package messaging

import "testing"

func TestDecodeRequestUnwrapsNestEnvelopeAndNumericTeacherID(t *testing.T) {
	body := []byte(`{"pattern":"code.execution.requested","data":{"payload":{"executionId":"exec-1","submissionId":"submission-1","teacherId":12,"language":"cpp","command":"./main","files":[{"path":"main.cpp","content":"int main(){}"}]}}}`)

	request, err := decodeRequest(body)
	if err != nil {
		t.Fatalf("decodeRequest returned error: %v", err)
	}
	if request.ExecutionID != "exec-1" || request.SubmissionID != "submission-1" {
		t.Fatalf("unexpected identifiers: %#v", request)
	}
	if request.TeacherID != "12" {
		t.Fatalf("expected numeric teacher ID to normalize to 12, got %q", request.TeacherID)
	}
}
