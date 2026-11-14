FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY --from=build /app/dist ./dist
COPY --from=build /app/server/db ./server/db
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts

EXPOSE 5000
CMD sh -c "pnpm drizzle-kit migrate && pnpm db:seed && node dist/index.js"
