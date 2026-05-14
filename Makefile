.PHONY: build run dev uat test lint tidy clean help \
	compose/dev compose/dev-build compose/uat compose/uat-build compose/down-dev compose/down-uat compose/logs-dev compose/logs-uat \
	prisma/generate prisma/validate migrate/diff migrate/apply migrate/status migrate/down migrate/lint

# App variables
APP_NAME=crm2-backend
BACKEND_DIR=backend

# Docker Compose variables
COMPOSE_DEV=docker compose --env-file .env.dev -f docker-compose.dev.yml
COMPOSE_UAT=docker compose --env-file .env.uat -f docker-compose.uat.yml

# Node variables
NPM=npm
NODE=node

# Atlas variables
ATLAS=atlas
ENV ?= local
NAME ?= migration
DB_URL ?= postgresql://crm2_user:crm2_password@localhost:5432/crm2_dev?sslmode=disable
MIGRATION_DIR=file://internal/prisma/migrations

# Build backend Docker image
build:
	@echo "Building $(APP_NAME)..."
	@$(COMPOSE_DEV) build backend
	@echo "✓ Backend image built"

# Run backend locally with Node.js
run:
	@cd $(BACKEND_DIR) && $(NPM) start

# Run development stack with Docker Compose
# Use BUILD=1 to rebuild image: make dev BUILD=1
ifeq ($(BUILD),1)
dev: compose/dev-build
else
dev: compose/dev
endif

# Run UAT stack with Docker Compose
# Use BUILD=1 to rebuild image: make uat BUILD=1
ifeq ($(BUILD),1)
uat: compose/uat-build
else
uat: compose/uat
endif

# Run tests
test:
	@cd $(BACKEND_DIR) && $(NPM) test

# Run linter
lint:
	@cd $(BACKEND_DIR) && $(NPM) run lint

# Install dependencies
tidy:
	@cd $(BACKEND_DIR) && $(NPM) install

# Clean Docker Compose stacks
clean:
	@$(COMPOSE_DEV) down --remove-orphans
	@$(COMPOSE_UAT) down --remove-orphans
	@echo "✓ Cleaned compose stacks"

# Show help
help:
	@echo "Available targets:"
	@echo "  build              - Build backend Docker image"
	@echo "  run                - Run backend locally with Node.js"
	@echo "  dev                - Run dev stack (use BUILD=1 to rebuild)"
	@echo "  uat                - Run UAT stack (use BUILD=1 to rebuild)"
	@echo "  test               - Run backend tests"
	@echo "  lint               - Run backend linter"
	@echo "  tidy               - Install/update backend dependencies"
	@echo "  clean              - Stop dev and UAT compose stacks"
	@echo "  compose/dev        - Start dev stack"
	@echo "  compose/dev-build  - Start dev stack with rebuild"
	@echo "  compose/uat        - Start UAT stack"
	@echo "  compose/uat-build  - Start UAT stack with rebuild"
	@echo "  compose/down-dev   - Stop dev stack"
	@echo "  compose/down-uat   - Stop UAT stack"
	@echo "  compose/logs-dev   - Follow dev logs"
	@echo "  compose/logs-uat   - Follow UAT logs"
	@echo "  prisma/generate    - Generate Prisma client"
	@echo "  prisma/validate    - Validate Prisma schema fragments"
	@echo "  migrate/diff       - Create Atlas migration (usage: make migrate/diff NAME=add_users)"
	@echo "  migrate/apply      - Apply Atlas migrations (usage: make migrate/apply DB_URL=...)"
	@echo "  migrate/status     - Show Atlas migration status"
	@echo "  migrate/down       - Roll back latest Atlas migration"
	@echo "  migrate/lint       - Lint Atlas migrations"

# Docker Compose helpers
compose/dev:
	@$(COMPOSE_DEV) up -d

compose/dev-build:
	@$(COMPOSE_DEV) up -d --build

compose/uat:
	@$(COMPOSE_UAT) up -d

compose/uat-build:
	@$(COMPOSE_UAT) up -d --build

compose/down-dev:
	@$(COMPOSE_DEV) down

compose/down-uat:
	@$(COMPOSE_UAT) down

compose/logs-dev:
	@$(COMPOSE_DEV) logs -f

compose/logs-uat:
	@$(COMPOSE_UAT) logs -f

# Prisma helpers
prisma/generate:
	@cd $(BACKEND_DIR) && $(NPM) run prisma:generate

prisma/validate:
	@cd $(BACKEND_DIR) && npx prisma validate

# Create a new migration file based on Prisma schema changes
migrate/diff:
	@cd $(BACKEND_DIR) && $(ATLAS) migrate diff $(NAME) --env $(ENV)

# Apply pending migrations to the database
migrate/apply:
	@cd $(BACKEND_DIR) && $(ATLAS) migrate apply --dir "$(MIGRATION_DIR)" --url "$(DB_URL)"

# Show migration status
migrate/status:
	@cd $(BACKEND_DIR) && $(ATLAS) migrate status --dir "$(MIGRATION_DIR)" --url "$(DB_URL)"

# Roll back latest migration
migrate/down:
	@cd $(BACKEND_DIR) && $(ATLAS) migrate down --dir "$(MIGRATION_DIR)" --url "$(DB_URL)"

# Lint migrations
migrate/lint:
	@cd $(BACKEND_DIR) && $(ATLAS) migrate lint --env $(ENV)
