# frontend build
FROM node:22-alpine AS webbuild
WORKDIR /web
ARG VITE_OPENFREEMAP_STYLE_URL=
ARG VITE_OPENFREEMAP_TILEJSON_URL=https://tiles.openfreemap.org/planet
ARG VITE_TERRAIN_TILEJSON_URL=https://demotiles.maplibre.org/terrain-tiles/tiles.json
ARG VITE_TERRAIN_EXAGGERATION=1.25
ENV VITE_OPENFREEMAP_STYLE_URL=$VITE_OPENFREEMAP_STYLE_URL
ENV VITE_OPENFREEMAP_TILEJSON_URL=$VITE_OPENFREEMAP_TILEJSON_URL
ENV VITE_TERRAIN_TILEJSON_URL=$VITE_TERRAIN_TILEJSON_URL
ENV VITE_TERRAIN_EXAGGERATION=$VITE_TERRAIN_EXAGGERATION
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# backend build
FROM golang:1.25-alpine AS gobuild
WORKDIR /src
RUN apk add --no-cache ca-certificates
COPY backend/go.mod backend/go.sum ./backend/
WORKDIR /src/backend
RUN go mod download
COPY backend/ ./
COPY --from=webbuild /web/dist ./internal/api/static
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/meshcore-live ./cmd/app

# runtime
FROM alpine:3.22
RUN apk add --no-cache ca-certificates tzdata
RUN adduser -D -h /app appuser
WORKDIR /app
COPY --from=gobuild /out/meshcore-live /app/meshcore-live
RUN mkdir -p /app/data/fixtures && chown -R appuser:appuser /app
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
ENTRYPOINT ["/app/meshcore-live"]
