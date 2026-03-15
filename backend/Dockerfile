FROM oven/bun:1.2.23-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

RUN sed -i 's/\r$//' /app/scripts/start.sh
RUN chmod +x /app/scripts/start.sh

EXPOSE 3001

CMD ["sh", "/app/scripts/start.sh"]
