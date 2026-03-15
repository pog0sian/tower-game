FROM oven/bun:1.2.23-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN bun run build

EXPOSE 80

CMD ["bun", "run", "scripts/server.ts"]
