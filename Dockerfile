FROM node:26-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
ARG GOOGLE_MAPS_API_KEY
ARG CESIUM_ION_TOKEN
ENV GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY}
ENV CESIUM_ION_TOKEN=${CESIUM_ION_TOKEN}
COPY . .
RUN npm run build

FROM node:26-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/vite.config.js ./vite.config.js
COPY --from=builder /app/src ./src
COPY --from=builder /app/config ./config
COPY --from=builder /app/index.html ./index.html
COPY --from=builder /app/public ./public
COPY --from=builder /app/style.css ./style.css
COPY --from=builder /app/server.mjs ./server.mjs

ENV HOST=0.0.0.0
ENV PORT=5173

EXPOSE 5173
EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:${PORT}/ || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.mjs"]
