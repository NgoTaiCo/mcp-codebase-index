# 📚 Documentation Navigation Guide

Quick guide to find what you need in the MCP Codebase Index documentation.

---

## 🚀 Getting Started (New Users)

**Start here if you're new to the project:**

1. **[Main README](./README.md)** - Overview, features, and quick start guide
2. **[Setup Guide - VS Code](./SETUP.md)** - Installation for VS Code Copilot
3. **[Setup Guide - CLI](./guides/COPILOT_CLI_SETUP.md)** - Installation for GitHub Copilot CLI
4. **[Setup Guide - Gemini CLI](./guides/GEMINI_CLI_SETUP.md)** - Installation for Google Gemini CLI
5. **[Setup Guide - Kiro](./guides/KIRO_SETUP.md)** - Installation for Kiro AI Editor
6. **[Setup Guide - Roo Cline](./guides/ROO_CLINE_SETUP.md)** - Installation for Roo Cline (VS Code)
7. **[Qdrant Cloud Setup](./guides/QDRANT_CLOUD_SETUP.md)** - Get your Qdrant credentials
8. **[Quick Reference](./QUICK_REF.md)** - Command cheat sheet

**Estimated time:** 15-20 minutes to get up and running

---

## 📖 Documentation Structure

```
docs/
├── README.md                    # Main documentation (start here!)
├── SETUP.md                     # Setup guide for VS Code Copilot
├── QUICK_REF.md                 # Quick reference card
├── CHANGELOG.md                 # Version history
├── COPILOT_INSTRUCTIONS.md      # GitHub Copilot usage guide
├── NAVIGATION.md                # This file
│
├── memory/                      # Memory system docs (v3.2)
│   ├── README.md               # Memory overview
│   ├── MEMORY_USER_GUIDE.md    # Complete user guide
│   ├── MEMORY_QUICK_REFERENCE.md # Quick reference
│   └── MEMORY_VISUAL_GUIDE.md  # Diagrams & flowcharts
│
├── guides/                      # Detailed guides
│   ├── COPILOT_CLI_SETUP.md    # Setup for GitHub Copilot CLI
│   ├── GEMINI_CLI_SETUP.md     # Setup for Google Gemini CLI
│   ├── KIRO_SETUP.md           # Setup for Kiro AI Editor
│   ├── ROO_CLINE_SETUP.md      # Setup for Roo Cline (VS Code)
│   ├── QDRANT_CLOUD_SETUP.md   # Qdrant setup walkthrough
│   ├── BOOTSTRAP_GUIDE.md      # Bootstrap memory guide
│   ├── MEMORY_WEB_UI.md        # Memory Web UI guide
│   ├── PROMPT_ENHANCEMENT_GUIDE.md  # Prompt enhancement guide
│   ├── VECTOR_VISUALIZATION.md  # Vector visualization guide
│   ├── mcp-server-guide.md     # Build your own MCP server
│   └── TEST_SEARCH.md          # Test search functionality
│
└── planning/                    # Development planning
    ├── IMPROVEMENT_PLAN.md      # Roadmap and future features
    ├── RAGxplore.md            # Research and exploration
    └── issues/                  # Detailed issue documentation
        ├── issue-1-implementation.md
        ├── issue-2-rate-limiting.md
        ├── issue-3-incremental-indexing.md
        ├── issue-4-status-reporting.md
        ├── issue-5-index-verification.md
        ├── issue-6-prompt-enhancement.md
        ├── issue-7-security-privacy.md
        ├── issue-8-privacy-docs.md
        ├── issue-9-backup-system.md
        └── issue-10-api-key-security.md
```

---

## 🎯 Find What You Need

### Installation & Setup
| Question | Document |
|----------|----------|
| How do I install on VS Code? | [Setup Guide - VS Code](./SETUP.md) |
| How do I install on Copilot CLI? | [Setup Guide - CLI](./guides/COPILOT_CLI_SETUP.md) |
| How do I install on Gemini CLI? | [Setup Guide - Gemini CLI](./guides/GEMINI_CLI_SETUP.md) |
| How do I install on Kiro? | [Setup Guide - Kiro](./guides/KIRO_SETUP.md) |
| How do I install on Roo Cline? | [Setup Guide - Roo Cline](./guides/ROO_CLINE_SETUP.md) |
| Where do I get Qdrant credentials? | [Qdrant Setup](./guides/QDRANT_CLOUD_SETUP.md) |
| What environment variables do I need? | Any setup guide above |
| How do I configure multiple projects? | [CLI](./guides/COPILOT_CLI_SETUP.md) / [Gemini](./guides/GEMINI_CLI_SETUP.md) / [Kiro](./guides/KIRO_SETUP.md) / [Roo](./guides/ROO_CLINE_SETUP.md) |

### Usage
| Question | Document |
|----------|----------|
| How do I search my codebase? | [Main README](./README.md) - Usage section |
| How do I visualize my codebase? | [Vector Visualization Guide](./guides/VECTOR_VISUALIZATION.md) |
| What commands are available? | [Quick Reference](./QUICK_REF.md) |
| How do I test if it's working? | [Testing Guide](./guides/TEST_SEARCH.md) |
| How do I use prompt enhancement? | [Prompt Enhancement Guide](./guides/PROMPT_ENHANCEMENT_GUIDE.md) |

### Memory System
| Question | Document |
|----------|----------|
| What is Memory Integration? | [Memory README](./memory/README.md) |
| How do I bootstrap memory? | [Memory User Guide](./memory/MEMORY_USER_GUIDE.md) |
| What MCP tools are available? | [Memory Quick Reference](./memory/MEMORY_QUICK_REFERENCE.md) |
| How does memory work? | [Memory Visual Guide](./memory/MEMORY_VISUAL_GUIDE.md) |
| How do I use Web UI? | [Memory Web UI Guide](./guides/MEMORY_WEB_UI.md) |
| How do I check memory health? | [Memory User Guide](./memory/MEMORY_USER_GUIDE.md#check_memory_sync) |

### Troubleshooting
| Question | Document |
|----------|----------|
| Server not appearing in Copilot? | [Main README](./README.md) - Troubleshooting |
| Can't connect to Qdrant? | [Main README](./README.md) - Troubleshooting |
| Indexing too slow? | [Main README](./README.md) - Troubleshooting |
| Embedding errors? | [Main README](./README.md) - Troubleshooting |

### Development
| Question | Document |
|----------|----------|
| How does the code work? | [Source Code Structure](../src/README.md) |
| How do I build my own MCP server? | [MCP Server Guide](./guides/mcp-server-guide.md) |
| What's the architecture? | [Source Code Structure](../src/README.md) |
| How do I contribute? | [Improvement Plan](./planning/IMPROVEMENT_PLAN.md) |

### Features & Capabilities
| Question | Document |
|----------|----------|
| What features are available? | [Main README](./README.md) - Features |
| How do I visualize code relationships? | [Vector Visualization Guide](./guides/VECTOR_VISUALIZATION.md) |
| How does incremental indexing work? | [Issue #3](./planning/issues/issue-3-incremental-indexing.md) |
| What is prompt enhancement? | [Prompt Enhancement Guide](./guides/PROMPT_ENHANCEMENT_GUIDE.md) |
| How does index verification work? | [Issue #5](./planning/issues/issue-5-index-verification.md) |
| What about rate limiting? | [Issue #2](./planning/issues/issue-2-rate-limiting.md) |

### Security & Privacy
| Question | Document |
|----------|----------|
| Is my code secure? | [Issue #7](./planning/issues/issue-7-security-privacy.md) |
| How are API keys handled? | [Issue #10](./planning/issues/issue-10-api-key-security.md) |
| What data is stored? | [Issue #8](./planning/issues/issue-8-privacy-docs.md) |

---

## 📚 Documentation by Role

### 👤 End User (Using the MCP Server)
**You want to:** Search your codebase with GitHub Copilot

**Read these:**
1. [Main README](./README.md) - Overview and features
2. [Setup Guide](./SETUP.md) - Installation
3. [Qdrant Setup](./guides/QDRANT_CLOUD_SETUP.md) - Get credentials
4. [Quick Reference](./QUICK_REF.md) - Commands
5. [Testing Guide](./guides/TEST_SEARCH.md) - Verify it works

### 👨‍💻 Developer (Contributing to the Project)
**You want to:** Understand and modify the codebase

**Read these:**
1. [Source Code Structure](../src/README.md) - Code organization
2. [MCP Server Guide](./guides/mcp-server-guide.md) - MCP concepts
3. [Improvement Plan](./planning/IMPROVEMENT_PLAN.md) - Roadmap
4. [Issues](./planning/issues/) - Detailed feature docs

### 🏗️ MCP Server Builder (Learning to Build MCP Servers)
**You want to:** Build your own MCP server

**Read these:**
1. [MCP Server Guide](./guides/mcp-server-guide.md) - Complete tutorial
2. [Source Code Structure](../src/README.md) - Reference implementation
3. [Main README](./README.md) - See what's possible

---

## 🔄 Common Workflows

### First Time Setup
```
1. Read: Main README (overview)
2. Follow: Setup Guide (installation)
3. Get: Qdrant credentials (Qdrant Setup)
4. Test: Testing Guide (verify)
5. Use: Quick Reference (commands)
```

### Troubleshooting Issues
```
1. Check: Main README > Troubleshooting
2. Review: Setup Guide (configuration)
3. Test: Testing Guide (verify setup)
4. Search: Issues folder (known problems)
```

### Understanding a Feature
```
1. Read: Main README (high-level)
2. Check: Relevant issue doc (details)
3. Review: Source Code (implementation)
```

### Contributing
```
1. Read: Improvement Plan (roadmap)
2. Pick: Issue to work on
3. Study: Source Code Structure
4. Review: Relevant issue doc
```

---

## 📊 Documentation Maturity

| Document | Status | Last Updated |
|----------|--------|--------------|
| Main README | ✅ Complete | Current |
| Setup Guide | ✅ Complete | Current |
| Quick Reference | ✅ Complete | Current |
| Qdrant Setup | ✅ Complete | Current |
| MCP Server Guide | ✅ Complete | Current |
| Testing Guide | ✅ Complete | Current |
| Source Code Structure | ✅ Complete | Current |
| Changelog | 🔄 Updated regularly | Current |
| Improvement Plan | 🔄 Living document | Current |
| Issue Docs | ✅ Complete | Current |

---

## 🆘 Still Can't Find What You Need?

1. **Search the docs:** Use your editor's search (Cmd/Ctrl+F) across all markdown files
2. **Check the code:** [Source Code Structure](../src/README.md) has detailed comments
3. **Ask for help:** [GitHub Issues](https://github.com/NgoTaiCo/mcp-codebase-index/issues)
4. **Contact:** ngotaico.flutter@gmail.com

---

## 💡 Tips for Reading Documentation

- **Start with README:** Always start with the main README for context
- **Follow links:** Documentation is interconnected - follow the links
- **Check examples:** Most guides have practical examples
- **Try it out:** Best way to learn is to try the commands
- **Read issues:** Issue docs have detailed technical information

---

**Happy reading! 📖**

