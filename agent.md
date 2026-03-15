# Agent Context -- Tower Stack Game (Fullstack Vue + Bun + Elysia)

## Project overview

This project is a small fullstack browser game inspired by Tower Stack /
Stack games where the player must stack moving blocks. The goal is to
build a clean, modern, well‑structured pet project that reflects modern
web development practices without unnecessary enterprise complexity.

This is NOT an enterprise system. The architecture should remain simple,
clean and practical.

The project should reflect knowledge of: - Modern Vue development (SPA
architecture) - REST API integration - Component architecture -
TypeScript usage - Clean project structure - Basic backend API design

Avoid overengineering.

------------------------------------------------------------------------

# Technology stack

## Frontend

Use:

-   Vue 3
-   Vite
-   TypeScript
-   Composition API
-   Vue Router
-   Fetch API or Axios
-   Scoped CSS or CSS modules
-   Component architecture

Allowed additions:

-   Three.js OR Canvas API for rendering
-   Pinia (only if state becomes complex)
-   Vue composables
-   Basic animations
-   Simple reusable UI components

Avoid:

-   Options API unless necessary
-   jQuery
-   Global messy scripts
-   Monolithic components
-   Business logic inside UI templates

Frontend goal:

A clean modern SPA structured like a real project.

------------------------------------------------------------------------

## Backend

Use:

-   Bun runtime
-   ElysiaJS
-   TypeScript
-   REST API
-   SQLite or PostgreSQL
-   Simple modular structure

Backend purpose:

Only provide:

-   Score storage
-   Leaderboard
-   Simple validation
-   API endpoints

Avoid:

-   Enterprise architecture
-   Complex layering
-   Dependency injection containers
-   Microservices
-   Heavy abstractions
-   Overcomplicated ORM usage

Prefer simple direct solutions.

------------------------------------------------------------------------

# Architecture guidelines

## Frontend structure

Preferred structure:

frontend/src/

components/ → reusable UI components\
views/ → pages\
router/ → routing\
services/ → API communication\
game/ → game logic\
composables/ → reusable logic\
assets/ → static files

Principles:

-   Separation of concerns
-   Keep game logic outside UI
-   API logic inside services
-   Reusable components
-   Clean folder structure

------------------------------------------------------------------------

## Backend structure

backend/src/

routes/ → API routes\
models/ → types/interfaces\
db/ → database logic\
utils/ → helpers\
index.ts → server entry

Do NOT force:

service layer\
repository layer

If logic is simple keep it inside routes.

Prefer pragmatic structure.

------------------------------------------------------------------------

# Functional requirements

## Game features

Game must include:

-   Moving block stacking mechanic
-   Score counter
-   Increasing difficulty
-   Game over detection
-   Restart ability
-   Smooth animations

Nice to have:

-   Sound effects
-   Subtle visual polish
-   Responsive layout

------------------------------------------------------------------------

## UI requirements

Game should include:

-   Start screen
-   Game screen
-   Leaderboard screen
-   Game Over modal
-   Score display

Focus on clarity and UX.

------------------------------------------------------------------------

# Backend API

Minimum endpoints:

GET /scores/top\
→ return leaderboard

POST /scores\
→ save result

Optional:

GET /scores/recent

Score model:

id\
playerName\
score\
createdAt

Basic validation required.

Reject obviously invalid scores.

------------------------------------------------------------------------

# Code quality rules

Always prefer:

-   Simple solutions
-   Readable code
-   Modularity
-   Type safety
-   Clear naming

Follow:

KISS\
DRY\
YAGNI

Avoid:

Premature abstraction\
Pattern overuse\
Complex architecture

This is a small game project.

------------------------------------------------------------------------

# Code generation rules for AI

When generating code:

Prefer:

Simple correct solution.

Avoid:

Overengineering.

If multiple solutions exist choose:

The simplest maintainable one.

Do not introduce architecture not justified by scale.

Avoid adding layers unless necessary.

------------------------------------------------------------------------

# Frontend coding preferences

Prefer:

Composition API

Small focused components

Composable logic extraction

Typed API calls

Clear reactive state

Avoid:

Huge components

Mixed responsibilities

Unstructured state

------------------------------------------------------------------------

# Backend coding preferences

Prefer:

Small route handlers

Simple DB queries

Minimal middleware

Typed request/response

Avoid:

Complex validation frameworks unless needed

Unnecessary abstractions

Complex patterns

------------------------------------------------------------------------

# Project goal

Create a clean modern fullstack pet project demonstrating:

-   Vue SPA architecture
-   Game UI logic
-   REST integration
-   Simple backend design
-   Clean code practices

Project should look like a real developer pet project.

Not a tutorial style project.

Not enterprise architecture.

------------------------------------------------------------------------

# AI behavior expectations

AI should act like a pragmatic senior developer.

Priorities:

1 Simplicity 2 Clarity 3 Maintainability 4 Modern practices

Avoid:

Academic solutions

Overly theoretical architecture

Unnecessary patterns

Prefer practical development decisions.

------------------------------------------------------------------------

# Short project definition

A modern Vue 3 SPA stacking game with Bun + Elysia backend leaderboard,
built with clean modular architecture and minimal backend complexity.

------------------------------------------------------------------------

# Key philosophy

Build something clean.

Build something understandable.

Build something modern.

Do NOT build something overengineered.
