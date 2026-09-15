# Build stage
FROM node:26-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:26-alpine

WORKDIR /app

# Install dumb-init and http-server for proper signal handling and serving
RUN apk add --no-cache dumb-init && npm install -g http-server

COPY --from=builder /app/dist ./dist
COPY public ./public
COPY index.html style.css ./

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0 || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["http-server", "dist", "-p", "5173", "-a", "0.0.0.0", "--gzip"]
