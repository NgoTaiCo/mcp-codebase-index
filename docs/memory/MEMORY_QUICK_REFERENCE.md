# Memory Integration - Quick Reference

**Version:** 3.2 (Optimized) | **Updated:** 2025-11-21

---

## 🚀 Quick Start

```bash
# 1. Enable memory
echo "ENABLE_INTERNAL_MEMORY=true" >> .env

# 2. Start server
npm start

# 3. Bootstrap via AI chat
Tell AI: "Bootstrap memory for this codebase"
```

**Done!** Two interaction methods: **(1) AI chat** or **(2) Web UI**

**New Features:**
- ⚡ 2.8-6.0x faster batch operations
- 🛡️ Entity validation prevents corruption
- 🧹 Auto-clears orphaned vectors
- 🔍 Health monitoring every 5 minutes

---

## 🔧 MCP Tools (4 Tools)

| Tool | Usage Example | Purpose |
|------|---------------|---------|
| bootstrap_memory | "Bootstrap memory" | Auto-generate entities |
| bootstrap_memory (clear) | "Bootstrap with clearExisting=true" | Clear old vectors first |
| search_memory | "Search memory for auth" | Conversational search |
| open_memory_ui | "Open memory UI" | Visual exploration |
| check_memory_sync | "Check memory health" | Manual health check |

---

## 💬 Examples

```
✅ "Bootstrap memory for this codebase"
✅ "Bootstrap memory with clearExisting=true" (removes old vectors)
✅ "Search memory for authentication entities"
✅ "Find features related to database"
✅ "Show me the memory graph"
✅ "Check memory sync status"
```

---

## 🎨 Web UI

**Launch:** Tell AI "Open memory UI"  
**URL:** http://localhost:3001

Features: Graph visualization, search, filters, statistics

---

## ⚙️ Configuration

```bash
# Required
ENABLE_INTERNAL_MEMORY=true

# Optional
QDRANT_URL=http://localhost:6333
GEMINI_API_KEY=your_key
```

---

## 🐛 Common Issues

| Issue | Fix |
|-------|-----|
| Memory disabled | ENABLE_INTERNAL_MEMORY=true |
| No entities | Restart server |
| Port in use | "Open UI on port 3002" |

---

## 🆚 Interaction Methods

| Method | Best For |
|--------|----------|
| **AI Chat** | Quick queries, automation |
| **Web UI** | Visual exploration |

**No CLI** - Use AI chat or Web UI

---

## 📚 See Also

- [MEMORY_USER_GUIDE.md](./MEMORY_USER_GUIDE.md) - Full documentation
- [README.md](./README.md) - Getting started

---

**Philosophy:** AI chat + Web UI only (no CLI)
