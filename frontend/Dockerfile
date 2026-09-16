# Build stage: compile the Vite/React app to static files.
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite bakes VITE_* vars into the JS bundle at BUILD time, not at container
# start time — so which URL the frontend calls the backend at must be
# decided here, via a build arg, not via a runtime environment variable.
ARG VITE_API_BASE_URL=http://localhost:5000/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Runtime stage: serve the static build with Nginx (the same reverse proxy
# technology this project's CLAUDE.md already specifies for the eventual
# AWS deployment).
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
