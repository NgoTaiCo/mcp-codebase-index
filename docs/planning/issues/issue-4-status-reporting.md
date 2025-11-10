````markdown
# Issue #4: Enhanced Status Reporting with Real-time Progress

## Label
`enhancement`, `user-experience`

## Status
✅ **IMPLEMENTED** - 2025-11-08

## Description

Implement comprehensive status reporting that shows real-time indexing progress, ETA estimation, quota usage, and detailed error tracking.

## Problem

Current `indexing_status` tool:
- Only shows basic stats (vectors stored, is indexing)
- No progress percentage or ETA
- No visibility into quota usage
- Missing error details
- Cannot track per-file progress

## Proposed Solution

Enhanced status information including:
1. **Progress Tracking:** Current file, percentage, ETA
2. **Performance Metrics:** Files/sec, average time per file
3. **Quota Usage:** RPM, TPM, RPD with current usage
4. **Error Tracking:** Recent errors with file names and timestamps
5. **Queue Info:** Files queued for next day
6. **Storage Stats:** Collection size, vector count

## Implementation Summary

### 1. Added New Types (types.ts)
```typescript
export interface IndexingError {
    filePath: string;
    error: string;
    timestamp: number;
}

export interface IndexingProgress {
    totalFiles: number;
    processedFiles: number;
    currentFile: string | null;
    percentage: number;
    startTime: number;
    estimatedTimeRemaining: number | null;
}

export interface PerformanceMetrics {
    filesPerSecond: number;
    averageTimePerFile: number;
    totalDuration: number;
    chunksProcessed: number;
}
```

### 2. Updated Server State (server.ts)
- Added `indexingProgress` tracking
- Added `performanceMetrics` tracking
- Added `recentErrors` array (stores last 10 errors)
- Updated `DAILY_QUOTA_LIMIT` to 10,000 (from 950)
- Added `RPM_LIMIT = 1500` constant

### 3. Enhanced Rate Limiting (embedder.ts)
**Previous:** 
- BATCH_SIZE = 50
- DELAY_PER_REQUEST = 100ms
- Could cause quota errors at ~679 chunks

**Current (Optimized):**
- BATCH_SIZE = 25 (parallel processing)
- DELAY_PER_BATCH = 1000ms (1 second)
- Rate: **25 RPS = 1,500 RPM** (100% utilization)
- **Parallel indexing:** 25 chunks processed simultaneously
- Properly respects 1,500 RPM for text-embedding-004

**Speed improvement:**
- Sequential: 1 chunk/sec = 60 chunks/min
- Old parallel: 20 chunks/sec = 1,200 chunks/min
- **New parallel: 25 chunks/sec = 1,500 chunks/min** ⚡️
- **25x faster** than sequential!

### 4. Real-time Progress Updates
- Updates `currentFile` during processing
- Calculates percentage completion
- Estimates time remaining (ETA)
- Tracks files/sec and avg time per file
- Records errors with timestamps

### 5. Enhanced Status Tool
Added `verbose` parameter to `indexing_status` tool:
- Shows progress percentage and ETA during indexing
- Displays performance metrics (speed, avg time)
- Lists recent errors (3 by default, all with verbose=true)
- Shows rate limit info (1,500 RPM)
- Human-readable time and size formatting

## Acceptance Criteria

- [x] Shows progress percentage (0-100%)
- [x] Calculates accurate ETA based on average speed
- [x] Displays current file being processed
- [x] Shows quota usage with rate limit info
- [x] Lists recent errors (last 10) with details
- [x] Shows queued files count
- [x] Reports performance (files/sec, avg time)
- [x] Human-readable storage size
- [x] Updates in real-time during indexing
- [x] `verbose` flag for detailed logs

## Example Output

```
📊 Indexing Status

Progress: 45% (420/940 files)
Current File: src/controllers/chat_controller.dart
ETA: 5m 32s

⏱️ Performance:
- Speed: 1.5 files/sec
- Average: 667ms per file
- Total Time: 4m 20s
- Chunks Processed: 420

📈 Daily Quota (2025-11-08):
- Used: 420 / 10000 chunks
- Remaining: 9580 chunks
- Usage: 4.2%
- Rate Limit: 1500 RPM (text-embedding-004)

📦 Storage:
- Vectors: 420
- Collection: codebase
- Estimated Size: 1.4 MB

📊 File Categorization:
- ✨ New: 15
- 📝 Modified: 5
- ✅ Unchanged: 920
- 🗑️ Deleted: 0

⚠️ Recent Errors (2):
- lib/utils/helper.dart: Token limit exceeded (2m ago)
- lib/config/env.dart: File not found (5m ago)

⏳ Status: Indexing in progress...
```

## Rate Limit Clarification

### text-embedding-004 Limits:
- **RPM (Requests Per Minute):** 1,500 ✅
- **Daily Limit:** None (unlimited)
- **Cost:** Free

### Implementation:
- Batch size: **25 chunks per batch** (parallel processing with Promise.all)
- Delay: 1 second between batches
- Effective rate: **25 RPS = 1,500 RPM** (100% utilization)
- No safety margin needed (retry logic handles rate limits gracefully)

### Daily Quota Strategy:
- Set to 10,000 chunks/day (conservative)
- Purpose: Spread indexing over time for very large codebases
- Not a hard API limit, just a pacing mechanism
- Can be adjusted or removed if needed

## Benefits

- ✅ User knows exactly what's happening
- ✅ Can estimate completion time
- ✅ Early warning of quota issues
- ✅ Easy troubleshooting with error logs
- ✅ Better planning for large codebases
- ✅ No more 429 rate limit errors
- ✅ Efficient use of 1,500 RPM limit

## Testing Notes

To test:
1. Run indexing on a codebase with 1000+ files
2. Call `indexing_status` during indexing
3. Verify progress updates and ETA accuracy
4. Check that no 429 errors occur
5. Confirm verbose flag shows all errors

## Related

- Part of IMPROVEMENT_PLAN.md Section 2: Enhanced Status Reporting
- Works with: #2 (rate limiting), #3 (incremental indexing)
- Fixes: 679 chunk quota issue with text-embedding-004

````
