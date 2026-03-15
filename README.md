# Tower Game

Tower Game - это браузерная аркада про набор очков в игровых ранах с авторизацией по имени и группе, а также с общим лидербордом.

## Что есть в проекте

- Frontend: Vue 3 + Vite + TypeScript
- Backend API: Bun + Elysia + TypeScript
- База данных: PostgreSQL 17
- Docker-окружение: единый запуск всего стека через `docker compose`

## Основные возможности

- Вход игрока по `fullName + groupName`
- Игровой цикл: `start -> event -> finish`
- Валидация игровых событий на сервере
- Сохранение результатов в PostgreSQL
- Общий leaderboard для всех игроков
- Health endpoint: `GET /api/health`

## Быстрый старт

Требования:
- Docker Engine
- Docker Compose plugin

Запуск:

```bash
docker compose up -d --build
```

Открыть в браузере:
- [http://localhost](http://localhost)

Проверить API:

```bash
curl http://localhost/api/health
```

## Переменные окружения

Для compose используйте файл `.env` в корне:

```bash
cp .env.example .env
```

Ключевые переменные:
- `GAME_PROOF_SECRET` - обязательный секрет (минимум 32 символа)
- `CORS_ORIGIN` - origin фронтенда (например `http://localhost` или ваш домен)

Дополнительно:
- `backend/.env.example` - локальные переменные backend
- `frontend/.env.example` - build-time переменные frontend

## Запуск на сервере

1. Скопировать проект на сервер (например, в `/opt/tower-game`).
2. Создать и заполнить `.env`:

```env
GAME_PROOF_SECRET=your_long_random_secret_32_plus_chars
CORS_ORIGIN=http://your-domain-or-ip
```

3. Поднять стек:

```bash
cd /opt/tower-game
docker compose up -d --build
```

4. Открыть в firewall входящий `TCP/80`.
5. Направить домен A-записью на IP сервера.

После этого приложение доступно по домену или IP, а leaderboard хранится в общей PostgreSQL базе в docker volume.

## Полезные команды

Статус контейнеров:

```bash
docker compose ps
```

Логи:

```bash
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

Остановка:

```bash
docker compose down
```

Остановка с удалением данных БД:

```bash
docker compose down -v
```
