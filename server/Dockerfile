# InfluConnect API — self-contained image: Node + an embedded MongoDB, so it runs
# on any Docker host (Render/Railway/HF) without a separate database service.
# If a real MONGO_URI (e.g. MongoDB Atlas) is provided, the embedded DB is
# skipped and that one is used instead — so this same image goes to production.
FROM node:20-slim

# Install MongoDB 7.0 server + shell
RUN apt-get update && apt-get install -y --no-install-recommends gnupg curl ca-certificates && \
    curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor && \
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" \
      > /etc/apt/sources.list.d/mongodb-org-7.0.list && \
    apt-get update && apt-get install -y --no-install-recommends mongodb-org-server mongodb-mongosh && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

RUN mkdir -p /data/db && chmod -R 777 /data && chmod +x start.sh

ENV NODE_ENV=production
EXPOSE 5050
CMD ["bash", "start.sh"]
