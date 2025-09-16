# ===========================================
# HALOBUZZ V1.0 PRODUCTION READINESS MAKEFILE
# ===========================================
# This Makefile provides commands for development, testing, and production deployment

.PHONY: help setup test lint type build up down logs clean install deps security release

# Default target
.DEFAULT_GOAL := help

# Colors for output
RED=\033[0;31m
GREEN=\033[0;32m
YELLOW=\033[1;33m
BLUE=\033[0;34m
NC=\033[0m # No Color

# Project configuration
PROJECT_NAME=halobuzz
VERSION=1.0.0
BACKEND_DIR=backend
AI_ENGINE_DIR=ai-engine
MOBILE_DIR=apps/halobuzz-mobile
ADMIN_DIR=admin

# Docker configuration
DOCKER_COMPOSE_FILE=docker-compose.yml
DOCKER_COMPOSE_DEV=docker-compose.dev.yml
DOCKER_COMPOSE_PROD=docker-compose.prod.yml

# Help target
help: ## Show this help message
	@echo "$(BLUE)HaloBuzz v$(VERSION) - Production Ready Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Development Commands:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST) | grep -E "(setup|install|deps|dev|up|down|logs)"
	@echo ""
	@echo "$(GREEN)Testing & Quality:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST) | grep -E "(test|lint|type|security|coverage)"
	@echo ""
	@echo "$(GREEN)Build & Deploy:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST) | grep -E "(build|release|deploy|push)"
	@echo ""
	@echo "$(GREEN)Maintenance:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST) | grep -E "(clean|backup|restore|migrate)"

# ===========================================
# SETUP & INSTALLATION
# ===========================================

setup: ## Complete project setup (install deps, setup env, run tests)
	@echo "$(BLUE)Setting up HaloBuzz v$(VERSION)...$(NC)"
	@$(MAKE) install
	@$(MAKE) setup-env
	@$(MAKE) test
	@echo "$(GREEN)✅ Setup complete! Run 'make up' to start services$(NC)"

install: ## Install all dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	@npm install
	@cd $(BACKEND_DIR) && npm install
	@cd $(AI_ENGINE_DIR) && npm install
	@cd $(MOBILE_DIR) && npm install
	@cd $(ADMIN_DIR) && npm install
	@echo "$(GREEN)✅ Dependencies installed$(NC)"

setup-env: ## Setup environment files
	@echo "$(BLUE)Setting up environment files...$(NC)"
	@if [ ! -f $(BACKEND_DIR)/.env ]; then \
		cp $(BACKEND_DIR)/env.example $(BACKEND_DIR)/.env; \
		echo "$(YELLOW)⚠️  Created $(BACKEND_DIR)/.env - please update with your values$(NC)"; \
	fi
	@if [ ! -f $(AI_ENGINE_DIR)/.env ]; then \
		cp $(AI_ENGINE_DIR)/env.example $(AI_ENGINE_DIR)/.env; \
		echo "$(YELLOW)⚠️  Created $(AI_ENGINE_DIR)/.env - please update with your values$(NC)"; \
	fi
	@if [ ! -f $(MOBILE_DIR)/.env ]; then \
		cp $(MOBILE_DIR)/env.example $(MOBILE_DIR)/.env; \
		echo "$(YELLOW)⚠️  Created $(MOBILE_DIR)/.env - please update with your values$(NC)"; \
	fi
	@echo "$(GREEN)✅ Environment files created$(NC)"

# ===========================================
# DEVELOPMENT
# ===========================================

dev: ## Start development servers
	@echo "$(BLUE)Starting development servers...$(NC)"
	@$(MAKE) up
	@echo "$(GREEN)✅ Development servers started$(NC)"
	@echo "$(YELLOW)Backend: http://localhost:5010$(NC)"
	@echo "$(YELLOW)AI Engine: http://localhost:5020$(NC)"
	@echo "$(YELLOW)Admin: http://localhost:3000$(NC)"

up: ## Start all services with Docker Compose
	@echo "$(BLUE)Starting services...$(NC)"
	@docker-compose -f $(DOCKER_COMPOSE_FILE) up -d
	@echo "$(GREEN)✅ Services started$(NC)"

down: ## Stop all services
	@echo "$(BLUE)Stopping services...$(NC)"
	@docker-compose -f $(DOCKER_COMPOSE_FILE) down
	@echo "$(GREEN)✅ Services stopped$(NC)"

logs: ## Show logs for all services
	@docker-compose -f $(DOCKER_COMPOSE_FILE) logs -f

logs-backend: ## Show backend logs
	@docker-compose -f $(DOCKER_COMPOSE_FILE) logs -f backend

logs-ai: ## Show AI engine logs
	@docker-compose -f $(DOCKER_COMPOSE_FILE) logs -f ai

# ===========================================
# TESTING & QUALITY
# ===========================================

test: ## Run all tests
	@echo "$(BLUE)Running tests...$(NC)"
	@cd $(BACKEND_DIR) && npm run test
	@cd $(AI_ENGINE_DIR) && npm run test
	@echo "$(GREEN)✅ Tests completed$(NC)"

test-backend: ## Run backend tests only
	@cd $(BACKEND_DIR) && npm run test

test-ai: ## Run AI engine tests only
	@cd $(AI_ENGINE_DIR) && npm run test

test-coverage: ## Run tests with coverage
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	@cd $(BACKEND_DIR) && npm run test:coverage
	@cd $(AI_ENGINE_DIR) && npm run test:coverage
	@echo "$(GREEN)✅ Coverage report generated$(NC)"

lint: ## Run linting on all projects
	@echo "$(BLUE)Running linters...$(NC)"
	@cd $(BACKEND_DIR) && npm run lint
	@cd $(AI_ENGINE_DIR) && npm run lint
	@echo "$(GREEN)✅ Linting completed$(NC)"

type: ## Run TypeScript type checking
	@echo "$(BLUE)Running type checks...$(NC)"
	@cd $(BACKEND_DIR) && npm run typecheck
	@cd $(AI_ENGINE_DIR) && npm run typecheck
	@echo "$(GREEN)✅ Type checking completed$(NC)"

security: ## Run security checks
	@echo "$(BLUE)Running security checks...$(NC)"
	@npm run test:security
	@echo "$(GREEN)✅ Security checks completed$(NC)"

# ===========================================
# BUILD & DEPLOYMENT
# ===========================================

build: ## Build all projects
	@echo "$(BLUE)Building projects...$(NC)"
	@cd $(BACKEND_DIR) && npm run build
	@cd $(AI_ENGINE_DIR) && npm run build
	@echo "$(GREEN)✅ Build completed$(NC)"

build-docker: ## Build Docker images
	@echo "$(BLUE)Building Docker images...$(NC)"
	@docker-compose -f $(DOCKER_COMPOSE_FILE) build
	@echo "$(GREEN)✅ Docker images built$(NC)"

release: ## Create production release
	@echo "$(BLUE)Creating release v$(VERSION)...$(NC)"
	@$(MAKE) test
	@$(MAKE) lint
	@$(MAKE) type
	@$(MAKE) security
	@$(MAKE) build
	@git tag v$(VERSION)
	@git push origin v$(VERSION)
	@echo "$(GREEN)✅ Release v$(VERSION) created$(NC)"

deploy-staging: ## Deploy to staging environment
	@echo "$(BLUE)Deploying to staging...$(NC)"
	@$(MAKE) build-docker
	@docker-compose -f $(DOCKER_COMPOSE_FILE) -f $(DOCKER_COMPOSE_DEV) up -d
	@echo "$(GREEN)✅ Staging deployment complete$(NC)"

deploy-prod: ## Deploy to production environment
	@echo "$(BLUE)Deploying to production...$(NC)"
	@$(MAKE) build-docker
	@docker-compose -f $(DOCKER_COMPOSE_FILE) -f $(DOCKER_COMPOSE_PROD) up -d
	@echo "$(GREEN)✅ Production deployment complete$(NC)"

# ===========================================
# DATABASE OPERATIONS
# ===========================================

db-seed: ## Seed database with sample data
	@echo "$(BLUE)Seeding database...$(NC)"
	@cd $(BACKEND_DIR) && npm run seed
	@echo "$(GREEN)✅ Database seeded$(NC)"

db-backup: ## Create database backup
	@echo "$(BLUE)Creating database backup...$(NC)"
	@cd $(BACKEND_DIR) && npm run backup:create
	@echo "$(GREEN)✅ Database backup created$(NC)"

db-restore: ## Restore database from backup
	@echo "$(BLUE)Restoring database...$(NC)"
	@cd $(BACKEND_DIR) && npm run backup:restore
	@echo "$(GREEN)✅ Database restored$(NC)"

# ===========================================
# MONITORING & HEALTH
# ===========================================

health: ## Check service health
	@echo "$(BLUE)Checking service health...$(NC)"
	@curl -f http://localhost:5010/api/v1/monitoring/health || echo "$(RED)❌ Backend unhealthy$(NC)"
	@curl -f http://localhost:5020/api/v1/health || echo "$(RED)❌ AI Engine unhealthy$(NC)"
	@echo "$(GREEN)✅ Health check completed$(NC)"

monitor: ## Show monitoring dashboard
	@echo "$(BLUE)Opening monitoring dashboard...$(NC)"
	@echo "$(YELLOW)Backend Health: http://localhost:5010/api/v1/monitoring/health$(NC)"
	@echo "$(YELLOW)AI Engine Health: http://localhost:5020/api/v1/health$(NC)"
	@echo "$(YELLOW)Security Dashboard: http://localhost:5010/api/v1/security/dashboard$(NC)"

# ===========================================
# MAINTENANCE
# ===========================================

clean: ## Clean build artifacts and temporary files
	@echo "$(BLUE)Cleaning project...$(NC)"
	@rm -rf $(BACKEND_DIR)/dist
	@rm -rf $(AI_ENGINE_DIR)/dist
	@rm -rf node_modules
	@rm -rf $(BACKEND_DIR)/node_modules
	@rm -rf $(AI_ENGINE_DIR)/node_modules
	@rm -rf $(MOBILE_DIR)/node_modules
	@rm -rf $(ADMIN_DIR)/node_modules
	@docker system prune -f
	@echo "$(GREEN)✅ Project cleaned$(NC)"

clean-docker: ## Clean Docker containers and images
	@echo "$(BLUE)Cleaning Docker...$(NC)"
	@docker-compose -f $(DOCKER_COMPOSE_FILE) down -v
	@docker system prune -f
	@docker volume prune -f
	@echo "$(GREEN)✅ Docker cleaned$(NC)"

reset: ## Reset project to clean state
	@echo "$(BLUE)Resetting project...$(NC)"
	@$(MAKE) down
	@$(MAKE) clean-docker
	@$(MAKE) clean
	@echo "$(GREEN)✅ Project reset$(NC)"

# ===========================================
# MOBILE APP COMMANDS
# ===========================================

mobile-dev: ## Start mobile development server
	@echo "$(BLUE)Starting mobile development...$(NC)"
	@cd $(MOBILE_DIR) && npx expo start

mobile-build-ios: ## Build iOS app
	@echo "$(BLUE)Building iOS app...$(NC)"
	@cd $(MOBILE_DIR) && npx eas build -p ios --profile preview

mobile-build-android: ## Build Android app
	@echo "$(BLUE)Building Android app...$(NC)"
	@cd $(MOBILE_DIR) && npx eas build -p android --profile preview

mobile-build-dev: ## Build development version
	@echo "$(BLUE)Building development version...$(NC)"
	@cd $(MOBILE_DIR) && npx eas build --profile development

# ===========================================
# ADMIN PANEL COMMANDS
# ===========================================

admin-dev: ## Start admin panel development
	@echo "$(BLUE)Starting admin panel...$(NC)"
	@cd $(ADMIN_DIR) && npm run dev

admin-build: ## Build admin panel
	@echo "$(BLUE)Building admin panel...$(NC)"
	@cd $(ADMIN_DIR) && npm run build

# ===========================================
# UTILITY COMMANDS
# ===========================================

status: ## Show project status
	@echo "$(BLUE)HaloBuzz v$(VERSION) Status$(NC)"
	@echo "$(YELLOW)Services:$(NC)"
	@docker-compose -f $(DOCKER_COMPOSE_FILE) ps
	@echo ""
	@echo "$(YELLOW)Git Status:$(NC)"
	@git status --short
	@echo ""
	@echo "$(YELLOW)Recent Commits:$(NC)"
	@git log --oneline -5

version: ## Show version information
	@echo "$(BLUE)HaloBuzz Platform v$(VERSION)$(NC)"
	@echo "$(YELLOW)Node.js:$(NC) $$(node --version)"
	@echo "$(YELLOW)npm:$(NC) $$(npm --version)"
	@echo "$(YELLOW)Docker:$(NC) $$(docker --version)"
	@echo "$(YELLOW)Docker Compose:$(NC) $$(docker-compose --version)"

# ===========================================
# PRODUCTION READINESS CHECKLIST
# ===========================================

checklist: ## Run production readiness checklist
	@echo "$(BLUE)HaloBuzz v$(VERSION) Production Readiness Checklist$(NC)"
	@echo ""
	@echo "$(GREEN)✅ Build System:$(NC)"
	@$(MAKE) build > /dev/null 2>&1 && echo "  ✅ TypeScript compilation successful" || echo "  ❌ TypeScript compilation failed"
	@echo ""
	@echo "$(GREEN)✅ Testing:$(NC)"
	@$(MAKE) test > /dev/null 2>&1 && echo "  ✅ All tests passing" || echo "  ❌ Tests failing"
	@echo ""
	@echo "$(GREEN)✅ Code Quality:$(NC)"
	@$(MAKE) lint > /dev/null 2>&1 && echo "  ✅ Linting passed" || echo "  ❌ Linting failed"
	@echo ""
	@echo "$(GREEN)✅ Security:$(NC)"
	@$(MAKE) security > /dev/null 2>&1 && echo "  ✅ Security checks passed" || echo "  ❌ Security issues found"
	@echo ""
	@echo "$(GREEN)✅ Services:$(NC)"
	@docker-compose -f $(DOCKER_COMPOSE_FILE) ps | grep -q "Up" && echo "  ✅ Services running" || echo "  ❌ Services not running"
	@echo ""
	@echo "$(YELLOW)📋 Manual Checks Required:$(NC)"
	@echo "  • Environment variables configured"
	@echo "  • Database migrations applied"
	@echo "  • SSL certificates installed"
	@echo "  • Monitoring configured"
	@echo "  • Backup strategy implemented"
	@echo ""
	@echo "$(BLUE)Run 'make release' when all checks pass$(NC)"
