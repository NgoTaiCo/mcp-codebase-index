# Test MCP Codebase Index

## How to Test

1. **Check if server is running**: Look for "Connection state: Running" in logs ✅

2. **Test search in VS Code**:
   - Open Copilot Chat
   - Use the `@codebase` mention (if configured)
   - Or ask: "Search the codebase for authentication code"

3. **Expected behavior**:
   - Server processes the query
   - Returns relevant code chunks from your project
   - You see results in chat

## What the warnings mean

```
[warning] Failed to parse message: "[Embedder] Processed 2/2 chunks\n"
```

**This is NORMAL** - These are info logs from the server that VS Code can't parse as MCP protocol messages. They don't indicate errors.

## Real errors to look for

❌ **These are actual errors:**
```
[error] Request payload size exceeds the limit: 36000 bytes
[error] Failed to embed /path/to/file
[error] Connection refused
[error] GEMINI_API_KEY not found
```

✅ **Current status:**
- ✅ Connection state: Running
- ✅ Loaded 1472 vectors
- ✅ Processing files without size limit errors
- ✅ No "exceeds the limit" messages

## Troubleshooting

If search doesn't work:

1. **Wait for indexing to complete** - Check logs for "[Indexer] Indexing complete"
2. **Verify tool is available** - In Copilot Chat, type `@` and see if codebase search appears
3. **Check config** - Ensure `REPO_PATH` and `GEMINI_API_KEY` are set correctly

## Test queries

Try these in Copilot Chat:

```
"Find authentication logic in the codebase"
"Show me how database connections are configured"
"Where is error handling implemented?"
"Find all API endpoint definitions"
```
