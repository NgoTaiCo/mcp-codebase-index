# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0] - 2025-11-18

### 🎉 Stable Release: Modular Architecture & Vector Visualization

This is a **major stable release** graduating from beta with comprehensive refactoring and new visualization capabilities.

### Added
- **🎨 Vector Visualization System** - Complete 2D/3D visualization of codebase embeddings
  - `visualize_collection`: Explore entire codebase in embedding space with UMAP dimensionality reduction
  - `visualize_query`: See how search queries relate to code in vector space
  - `export_visualization_html`: Generate interactive standalone HTML visualizations
  - K-means clustering support for identifying code patterns
  - Three output formats: `summary` (text), `plotly` (interactive JSON), `json` (structured data)
  - Smart sampling algorithms for large codebases (up to 5000 vectors)
  - Performance optimized: <5s for 1000 vectors, <15s for 5000 vectors
  
- **📚 Comprehensive Documentation**
  - New `docs/guides/VECTOR_VISUALIZATION.md` (700+ lines)
    - Complete tool reference with all parameters
    - 6 detailed use case scenarios with examples
    - Technical deep-dive (UMAP, K-means, sampling strategies)
    - Performance benchmarks and optimization tips
    - Troubleshooting guide and best practices
  - Updated main README with visualization section
  - Enhanced navigation and quick reference guides

### Changed
- **🏗️ Major Architecture Refactoring** (40% code reduction, zero breaking changes)
  - Reduced `server.ts` from 2060 lines to 1237 lines (823 lines removed)
  - Extracted 11 handler methods into 4 modular files:
    - `handlers/search.handler.ts` (74 lines): Search operations
    - `handlers/enhancement.handler.ts` (131 lines): Prompt enhancement & telemetry
    - `handlers/visualization.handler.ts` (296 lines): All visualization features
    - `handlers/indexing.handler.ts` (544 lines): Status, check, repair operations
  - Implemented context injection pattern for clean dependency management
  - Created `types/handlers.types.ts` for shared interfaces
  - Added `templates/visualization.template.ts` for HTML export

### Technical Details
- **Modular Handler Architecture**:
  - Context injection pattern for all handlers
  - Clean separation: server orchestrates, handlers execute
  - Fully typed with TypeScript interfaces
  - Easier testing and maintenance
  
- **Visualization Layer**:
  - `src/visualization/visualizer.ts`: UMAP dimensionality reduction
  - `src/visualization/reducer.ts`: Data sampling algorithms
  - `src/visualization/exporter.ts`: HTML template generation
  - `src/visualization/vectorRetriever.ts`: Efficient vector fetching
  - `src/visualization/types.ts`: Type definitions
  
- **Benefits**:
  - Better code organization and readability
  - Clear dependencies via context interfaces
  - Simpler to extend with new features
  - Improved maintainability
  
### Migration
- **Zero breaking changes** - Fully backward compatible
- All existing tools and APIs work exactly the same
- New visualization tools available immediately
- No configuration changes required

### Package Information
- **Size**: 109.4 KB (118 files)
- **Dependencies**: Stable and tested
- **Build**: TypeScript 5.x with strict mode
- **Node**: Compatible with Node.js 16+

---

## [1.5.4-beta.19] - 2025-11-18

### Changed
- **Major Refactoring: Extracted handlers into modular files for better maintainability**
  - Reduced `server.ts` from 2060 lines to 1237 lines (40% reduction, 823 lines removed)
  - Extracted 11 handler methods into 4 modular files with context injection pattern
  - Created `src/mcp/handlers/` directory structure:
    - `search.handler.ts` (74 lines): `handleSearch`
    - `enhancement.handler.ts` (131 lines): `handleEnhancePrompt`, `handleEnhancementTelemetry`
    - `visualization.handler.ts` (296 lines): `handleVisualizeCollection`, `handleVisualizeQuery`, `handleExportVisualizationHtml`
    - `indexing.handler.ts` (544 lines): `handleIndexingStatus`, `handleCheckIndex`, `handleRepairIndex`
  - Implemented context injection pattern for all handlers
  - Maintains identical public API (no breaking changes)
  - All handlers properly typed with context interfaces

### Technical Details
- **Pattern Used**: Context injection with interfaces
  - Each handler receives a context object with all required dependencies
  - Server methods create context and delegate to handler functions
  - Clean separation of concerns: server orchestrates, handlers execute
- **Benefits**:
  - Easier to test individual handlers
  - Clear dependencies via context interfaces
  - Simpler to maintain and extend
  - Better code organization and readability
- **Migration**: Fully backward compatible - no changes required for users

## [1.4.10] - 2025-11-08

### Fixed
- **CRITICAL: Checkpoint resume system not working correctly**
  - **Root cause**: FileWatcher.scanForChanges() updated hashes for ALL scanned files during scan, not just indexed files
  - **Issue**: After indexing 30 files and restarting, scan found 0 changed files because metadata contained hashes for all 470 files
  - **Solution**: Only update file hashes AFTER successful indexing via new `updateFileHash()` method
  - Metadata now contains hashes only for actually indexed files
  - Resume now correctly detects remaining files that need indexing

### Changed
- FileWatcher.scanForChanges() no longer updates hashes during scan
- Added FileWatcher.updateFileHash() method called after successful indexing
- Server now calls updateFileHash() for each indexed file to maintain accurate metadata
- Checkpoint resume now works as designed: Index 30 files → Stop → Restart → Index remaining 440 files

### Technical Details
- Before: scanForChanges() did `this.fileHashes.set(filePath, hash)` for all files
- After: scanForChanges() only detects changes, updateFileHash() stores hash after indexing
- This ensures metadata (index-metadata.json) only contains hashes for indexed files
- Fixes scenario: "qdrant empty → index 30 → stop → restart → shows 0 changed files"

## [1.4.9] - 2025-11-08

### Fixed
- **Checkpoint system appearing to work but not resuming correctly**
  - Added double-check with `getVectorCount()` to query actual Qdrant data
  - Fixed Case 1b in checkAndFixSync() to distinguish between:
    - Collection truly deleted (actualCount = 0) → Clear and re-index
    - Valid checkpoint (actualCount > 0) → Resume from checkpoint
  - Previous logic relied on collection metadata which could be stale

### Added
- QdrantVectorStore.getVectorCount() method to query actual point count
- Better logging for checkpoint resume vs collection deleted scenarios

## [1.4.2] - 2025-11-08

### Added
- **Debug logging for file scanning**
  - Shows total source files scanned
  - Shows number of changed files detected
  - Shows number of ignored directories
  - Helps diagnose why some files aren't being indexed

### Fixed
- Improved directory ignore logic with better pattern matching
  - Now checks directory basename directly
  - Better handling of nested ignore patterns
  - More accurate path separator matching

## [1.4.1] - 2025-11-08

### Fixed
- **Critical: Sync check between Qdrant and memory state**
  - Server now detects when Qdrant collection is deleted but memory state remains
  - Automatically resets state and forces full re-index when mismatch detected
  - Clears FileWatcher hashes to ensure all files are re-scanned
  - Prevents "stuck" state where server thinks files are indexed but vectors are missing
  - Logs clear warnings when sync issues are detected

### Added
- `checkAndFixSync()` method to verify Qdrant-memory consistency on startup
- `clearFileHashes()` method in FileWatcher for forced re-scanning
- Detailed sync check logging with vector count and file count comparison

### Changed
- Startup sequence now includes sync verification step
- Better error recovery for out-of-sync scenarios

## [1.4.0] - 2025-11-08

### Added
- **Enhanced Status Reporting** (Issue #4)
  - Real-time progress tracking with percentage and current file
  - ETA calculation based on average processing speed
  - Performance metrics (files/sec, avg time per file, total duration)
  - Error tracking with timestamps (last 10 errors)
  - Verbose flag for detailed error logs
  - Human-readable time and size formatting
  - RPM (Requests Per Minute) visibility in status

- **Incremental Indexing** (Issue #3)
  - File categorization: new, modified, unchanged, deleted
  - MD5 hash tracking for change detection
  - Priority queue: new/modified files indexed first
  - Pending queue for files exceeding daily quota
  - Persistent state in `memory/incremental_state.json`
  - Automatic queue processing on next run
  - 90%+ quota savings for daily updates

- **Progress Tracking Types**
  - `IndexingProgress` interface with totalFiles, processedFiles, currentFile, percentage, startTime, estimatedTimeRemaining
  - `PerformanceMetrics` interface with filesPerSecond, averageTimePerFile, totalDuration, chunksProcessed
  - `IndexingError` interface with filePath, error, timestamp

### Changed
- **Optimized Rate Limiting for text-embedding-004**
  - Increased batch size from 20 to 25 chunks
  - Parallel processing: 25 chunks/second = 1,500 RPM (100% API utilization)
  - Removed unnecessary delays within batches
  - Better handling of 1,500 RPM limit (was causing errors at ~679 chunks)

- **Daily Quota Management**
  - Increased daily quota limit from 950 to 10,000 chunks
  - Added RPM_LIMIT constant (1,500) for text-embedding-004
  - More accurate quota tracking per file
  - Better quota warning messages

- **Performance Improvements**
  - 25x faster than sequential processing
  - 1,500 chunks/minute with parallel batching
  - Real-time metrics calculation during indexing
  - Efficient batch processing with Promise.all()

### Fixed
- Rate limit errors when indexing >679 chunks
- Quota calculation accuracy
- Progress tracking during long indexing sessions
- Error propagation in batch processing

### Documentation
- Updated README.md with new features and performance metrics
- Added detailed implementation docs in `github-issues/issue-4-status-reporting.md`
- Enhanced performance comparison tables
- Added real-world indexing time examples

## [1.3.7] - 2025-11-07

### Changed
- Previous stable release

---

## Release Notes v1.4.0

### 🎯 Key Features

**Enhanced Status Reporting**
- Know exactly what's happening during indexing
- See progress, ETA, and performance in real-time
- Track errors with timestamps for easy debugging

**Incremental Indexing**
- Only re-indexes changed files after initial index
- Saves 90%+ API quota on subsequent runs
- Automatic queue management for large codebases

**Optimized Performance**
- 25 chunks/second parallel processing
- 100% utilization of 1,500 RPM limit
- Fixed quota errors that occurred at ~679 chunks

### 📈 Performance Impact

**Before v1.4.0:**
- 20 chunks/second
- Could hit quota errors at 679 chunks
- No progress visibility
- Re-indexed everything every time

**After v1.4.0:**
- 25 chunks/second (25% faster)
- No quota errors (tested up to 10,000+ chunks)
- Real-time progress with ETA
- Only indexes changed files (90%+ savings)

### 🔧 Breaking Changes

None - fully backward compatible!

### 📦 Upgrade Instructions

```bash
# If using npx (no action needed - auto-updates)
# Just restart VS Code

# If installed globally
npm update -g @ngotaico/mcp-codebase-index

# If installed locally
npm update @ngotaico/mcp-codebase-index
```

### 🙏 Acknowledgments

Thanks to all users who reported the 679-chunk quota issue!
