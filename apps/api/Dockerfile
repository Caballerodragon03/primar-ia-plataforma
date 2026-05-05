FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN npm ci --workspace=apps/api --workspace=packages/database --workspace=packages/shared --workspace=packages/email --include-workspace-root

RUN cd packages/database && npx prisma generate
RUN cd packages/database && npx tsc
RUN cd packages/shared && npx tsc
RUN cd packages/email && npx tsc || true
RUN cd apps/api && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/api/dist/ ./apps/api/dist/
COPY --from=builder /app/apps/api/package.json ./apps/api/

EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
