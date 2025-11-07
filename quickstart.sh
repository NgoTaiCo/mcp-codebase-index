#!/bin/bash

# Quick Start Script for MCP Codebase Index
# Usage: ./quickstart.sh

echo "🚀 MCP Codebase Index - Quick Start"
echo "===================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18+ first."
    exit 1
fi

echo "✅ Node.js detected: $(node --version)"

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    cp .env.example .env
    
    # Set memory mode by default (no Docker needed)
    sed -i '' 's/VECTOR_STORE_TYPE=.*/VECTOR_STORE_TYPE=memory/' .env 2>/dev/null || \
    sed -i 's/VECTOR_STORE_TYPE=.*/VECTOR_STORE_TYPE=memory/' .env
    
    echo "✅ Created .env with in-memory storage (no Docker needed!)"
    echo ""
    echo "⚠️  Please edit .env and add your GEMINI_API_KEY"
    echo "   Get API key from: https://makersuite.google.com/app/apikey"
    echo ""
    echo "   Then run: npm start"
    exit 0
fi

# Check if GEMINI_API_KEY is set
if grep -q "GEMINI_API_KEY=$" .env || grep -q "GEMINI_API_KEY=your_api_key_here" .env; then
    echo "⚠️  GEMINI_API_KEY not set in .env"
    echo "   Please add your API key and run: npm start"
    exit 0
fi

echo "✅ Configuration looks good"
echo ""

# Check if using Docker mode
if grep -q "VECTOR_STORE_TYPE=qdrant" .env; then
    echo "📦 Qdrant mode detected - checking Docker..."
    
    if ! docker info &> /dev/null; then
        echo "⚠️  Docker is not running but you're using qdrant mode."
        echo "   Option 1: Start Docker Desktop"
        echo "   Option 2: Switch to memory mode (no Docker):"
        echo "             Edit .env: VECTOR_STORE_TYPE=memory"
        exit 1
    fi
    
    # Check if Qdrant is running
    if ! curl -s http://localhost:6333/collections &> /dev/null; then
        echo "📦 Starting Qdrant..."
        docker run -d -p 6333:6333 -p 6334:6334 \
          -v $(pwd)/qdrant_storage:/qdrant/storage \
          --name mcp-qdrant \
          qdrant/qdrant
        
        echo "⏳ Waiting for Qdrant to start..."
        sleep 5
        
        if curl -s http://localhost:6333/collections &> /dev/null; then
            echo "✅ Qdrant started successfully"
        else
            echo "❌ Failed to start Qdrant"
            exit 1
        fi
    else
        echo "✅ Qdrant is already running"
    fi
else
    echo "✅ Using in-memory storage (no Docker needed)"
fi

# Build if dist doesn't exist
if [ ! -d "dist" ]; then
    echo "🔨 Building project..."
    npm run build
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "   1. Update REPO_PATH in .env to your codebase path"
echo "   2. Run: npm start"
echo "   3. Or test with inspector: npm run inspector"
echo ""
echo "💡 Tip: You're using $(grep VECTOR_STORE_TYPE .env | cut -d '=' -f2) mode"
echo "📖 See SETUP.md for IDE configuration"
echo ""
