FROM oven/bun:1.4.4-slim AS build

WORKDIR /app

# 静态站点在构建期固化域名；如需换域名请用 --build-arg 重建镜像
ARG SITE_URL=https://saibo.me
ENV SITE_URL=$SITE_URL

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build:content && bun run typecheck && bun run lint && bun run test && bun run build

FROM oven/bun:1.4.4-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# 运行时只需要静态产物与零依赖的 node:http 服务；bun 兼容该 API，无需安装任何依赖
COPY --from=build /app/dist ./dist
COPY --from=build /app/scripts/serve.mjs ./scripts/serve.mjs

EXPOSE 3000
CMD ["bun", "scripts/serve.mjs"]
