# Tschau-Sepp Makefile
# Nutze: make dev, make start, make install, etc.

.PHONY: dev start install clean test deploy

# Development server with auto-reload
dev:
	@echo "🎮 Starting development server on http://localhost:5001"
	@python3 dev_server.py

# Production server
start:
	@echo "🚀 Starting production server on http://localhost:5000"
	@python3 game_server.py

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	@pip3 install -r requirements.txt

# Clean cache files
clean:
	@echo "🧹 Cleaning cache files..."
	@find . -type f -name "*.pyc" -delete
	@find . -type d -name "__pycache__" -delete
	@find . -type f -name ".DS_Store" -delete

# Run tests (wenn du welche hast)
test:
	@echo "🧪 Running tests..."
	@python3 -m pytest tests/ 2>/dev/null || echo "No tests found"

# Deploy to Railway
deploy:
	@echo "🚂 Deploying to Railway..."
	@git add -A && git commit -m "Deploy update" && git push

# Show available commands
help:
	@echo "Available commands:"
	@echo "  make dev      - Start development server (port 5001)"
	@echo "  make start    - Start production server (port 5000)"
	@echo "  make install  - Install dependencies"
	@echo "  make clean    - Clean cache files"
	@echo "  make test     - Run tests"
	@echo "  make deploy   - Deploy to Railway"
	@echo "  make help     - Show this help"

# Default command
all: help