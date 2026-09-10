# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV VITE_API_BASE_URL=/api/v1
RUN npm run build

FROM nginx:stable-alpine AS production
RUN apk add --no-cache ca-certificates
ENV PORT=8080
ENV NGINX_ENVSUBST_FILTER="^(PORT|BACKEND_HOST)$"
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker/nginx/19-validate-env.sh /docker-entrypoint.d/19-validate-env.sh
RUN chmod +x /docker-entrypoint.d/19-validate-env.sh
EXPOSE 8080
