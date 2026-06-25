FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY web/package.json ./web/
COPY mobile/package.json ./mobile/

RUN npm ci

COPY tsconfig.base.json ./
COPY backend ./backend

WORKDIR /app/backend
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY web/package.json ./web/
COPY mobile/package.json ./mobile/

RUN npm ci --workspace=@tunas-workflow/backend --omit=dev

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

WORKDIR /app/backend

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && (npx prisma db seed || true) && node dist/server.js"]
