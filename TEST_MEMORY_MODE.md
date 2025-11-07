# Test SimpleVectorStore

Quick test to verify in-memory vector store works:

```bash
# Create test directory
mkdir -p test_project

# Create test file
cat > test_project/test.ts << 'EOF'
export function hello(name: string): string {
  return `Hello, ${name}!`;
}

export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
  
  subtract(a: number, b: number): number {
    return a - b;
  }
}
EOF

# Update .env
cat > .env << 'EOF'
REPO_PATH=./test_project
MEMORY_FILE_PATH=./memory/test-metadata.json
VECTOR_STORE_TYPE=memory
GEMINI_API_KEY=your_key_here
WATCH_MODE=false
BATCH_SIZE=10
EOF

# Build and run (if you have Gemini API key)
npm run build
npm start
```

**Expected output:**

```
[VectorStore] Using in-memory SimpleVectorStore (no Docker needed)
[SimpleVectorStore] Created new collection: codebase
[Init] Scanning for changes...
[Init] Found 1 changed files
[Indexer] Processing 1 files...
[Embedder] Processed 1/1 chunks
[SimpleVectorStore] Upserted 2 vectors
[Indexer] Complete!
[MCP] Server started and listening...
```

**Check storage:**

```bash
cat vector_storage/codebase.json
```

Should see JSON with vectors and payloads.

## Test với MCP Inspector

```bash
npm run inspector
```

1. Open browser to localhost:5173
2. Call `search_codebase` tool
3. Query: "calculator add function"
4. Should return the Calculator.add method

---

**Success!** Memory mode working without Docker.
