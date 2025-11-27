# Memory Integration - Quick Reference

**Version:** 3.2 (Optimized) | **Updated:** 2025-11-27

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

**v3.2 Features:**
- ⚡ 2.8-6.0x faster batch operations
- 🛡️ Entity validation prevents corruption
- 🧹 Auto-clears orphaned vectors
- 🔍 Health monitoring every 5 minutes

---

## 🔧 MCP Tools (5 Tools)

| Tool | Usage Example | Purpose |
|------|---------------|---------|
| `bootstrap_memory` | "Bootstrap memory" | Auto-generate entities |
| `bootstrap_memory` | "Bootstrap with clearExisting=true" | Clear old vectors first |
| `search_memory` | "Search memory for auth" | Conversational search |
| `open_memory_ui` | "Open memory UI" | Visual exploration |
| `close_memory_ui` | "Close memory UI" | Stop UI server |
| `check_memory_sync` | "Check memory health" | Manual health check |

---

## 💬 AI Chat Examples

```
✅ "Bootstrap memory for this codebase"
✅ "Bootstrap memory with clearExisting=true" (removes old vectors)
✅ "Search memory for authentication entities"
✅ "Find features related to database"
✅ "Show me the memory graph"
✅ "Open memory UI"
✅ "Close memory UI"
✅ "Check memory sync status"
✅ "Check memory health"
```

---

## 🎨 Web UI

**Launch:** Tell AI "Open memory UI"  
**URL:** http://localhost:3001  
**Stop:** Tell AI "Close memory UI"

**Features:**
- 📊 D3.js graph visualization
- 🔍 Real-time search & filters
- 📈 Statistics dashboard
- 🖱️ Click nodes for details

---

## ⚙️ Configuration

```bash
# Required
ENABLE_INTERNAL_MEMORY=true

# Optional
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_key
GEMINI_API_KEY=your_key
```

---

## 🐛 Common Issues

| Issue | Fix |
|-------|-----|
| Memory disabled | `ENABLE_INTERNAL_MEMORY=true` |
| No entities | Run "Bootstrap memory" first |
| Port 3001 in use | "Open UI on port 3002" |
| Orphaned vectors | "Check memory sync" → auto-cleanup |
| Stale entities | "Bootstrap with clearExisting=true" |

---

## 🆚 Interaction Methods

| Method | Best For |
|--------|----------|
| **AI Chat** | Quick queries, automation, bootstrap |
| **Web UI** | Visual exploration, browsing, details |

**No CLI** - Use AI chat or Web UI only

---

## 📊 Performance (v3.2)

| Operation | Speed |
|-----------|-------|
| Search | 50-150ms |
| Bootstrap | 3-5 min |
| Batch store | 2.8-6.0x faster |
| Health check | <200ms |

---

## 📚 See Also

- [MEMORY_USER_GUIDE.md](./MEMORY_USER_GUIDE.md) - Full documentation
- [MEMORY_VISUAL_GUIDE.md](./MEMORY_VISUAL_GUIDE.md) - Diagrams & flowcharts
- [README.md](./README.md) - Getting started

---

**Philosophy:** AI chat + Web UI only (no CLI)
