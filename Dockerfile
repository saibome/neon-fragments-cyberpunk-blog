FROM node:26-slim AS build

WORKDIR /app
RUN npm install -g pnpm@12.18.0

# 静态站点在构建期固化域名；如需换域名请用 --build-arg 重建镜像
ARG SITE_URL=https://saibo.me
ENV SITE_URL=$SITE_URL

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build:content && pnpm typecheck && pnpm lint && pnpm test && pnpm build

FROM node:26-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# 运行时只需要静态产物与零依赖的 node:http 服务，无需安装任何 npm 包
COPY --from=build /app/dist ./dist
COPY --from=build /app/scripts/serve.mjs ./scripts/serve.mjs

EXPOSE 3000
CMD ["node", "scripts/serve.mjs"]
