# Tower Game Backend

Backend API for the tower stack game.

## Stack
- Bun
- Elysia
- TypeScript
- PostgreSQL (`postgres` driver)

## Local DB with Docker
From project root:
1. Start PostgreSQL:
   `docker compose up -d`
2. Check status:
   `docker compose ps`
3. Stop container:
   `docker compose down`

Default database settings from `docker-compose.yml`:
- DB: `tower_game`
- User: `postgres`
- Password: `postgres`
- Port: `55432`

## Setup
1. Install dependencies:
   `bun install`
2. Copy env file:
   `cp .env.example .env`
3. Run migrations:
   `bun run migrate`
4. Start dev server:
   `bun run dev`

## Scripts
- `bun run dev` - start API in watch mode
- `bun run start` - start API once
- `bun run build` - TypeScript build to `dist`
- `bun run migrate` - apply SQL migrations

## Endpoints
- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/games/start`
- `POST /api/games/finish`
