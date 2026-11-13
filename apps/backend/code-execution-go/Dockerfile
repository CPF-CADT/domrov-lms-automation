FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/code-execution ./cmd/server

FROM docker:27-cli
WORKDIR /app
COPY --from=build /out/code-execution /app/code-execution
USER root
EXPOSE 3005
ENTRYPOINT ["/app/code-execution"]
