FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache git python3 py3-pip python3-dev build-base && \
    python3 -m venv .venv && \
    .venv/bin/pip install --no-cache-dir readmeai && \
    apk del python3-dev build-base

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/README.md ./README.md
COPY --from=builder /app/.git ./.git

ENV NODE_ENV=production
ENV PORT=7860
EXPOSE 7860

CMD ["npm", "start"]
