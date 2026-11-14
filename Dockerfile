FROM node:26-slim AS build

WORKDIR /app
RUN npm install -g pnpm@12.18.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm typecheck && pnpm test && pnpm build

FROM node:26-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV SITE_URL=https://saibo.me
ENV PORT=3000

RUN npm install -g pnpm@12.18.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/dist ./dist
COPY --from=build /app/services/posts.json ./services/posts.json

EXPOSE 3000
CMD ["node", "dist/server/index.js"]
