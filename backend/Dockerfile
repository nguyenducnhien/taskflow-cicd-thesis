FROM node:20-alpine
WORKDIR /app

# Copy manifests first so `npm ci` is only re-run when dependencies
# actually change, not on every source edit (Docker layer caching).
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "src/server.js"]
