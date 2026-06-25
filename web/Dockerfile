FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY web/package.json ./web/
COPY mobile/package.json ./mobile/

RUN npm ci

COPY tsconfig.base.json ./
COPY web ./web

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build -w web

FROM nginx:alpine AS runner

COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/web/dist /usr/share/nginx/html

EXPOSE 80
