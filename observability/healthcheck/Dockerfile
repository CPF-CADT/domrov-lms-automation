ARG BASE_IMAGE=busybox:1.37.0
FROM golang:1.26.5-alpine AS build
WORKDIR /src
COPY main.go .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /healthcheck main.go

FROM ${BASE_IMAGE}
COPY --from=build /healthcheck /usr/local/bin/observability-healthcheck
