# Issue #3: Incremental Indexing with Priority System

## Label
`enhancement`, `performance`

## Description

Implement incremental indexing that prioritizes changed files and fits within daily quota limits (1000 RPD).

## Problem

Current implementation:
- Re-indexes entire codebase every time
- Wastes quota on unchanged files
- Cannot handle large codebases within daily limits
- No prioritization of critical files

## Proposed Solution

Implement priority-based incremental indexing:
1. **Day 1:** Index new + modified files first (critical)
2. **Day 2+:** Index remaining files gradually
3. **Ongoing:** Only re-index changed files (minimal quota)
4. Track file hashes to detect changes
5. Save unindexed queue for next day

## Acceptance Criteria

- [ ] Categorizes files into: new, modified, unchanged
- [ ] Prioritizes new/modified files for indexing
- [ ] Tracks file content hashes (MD5) to detect changes
- [ ] Saves unindexed file queue for next day
- [ ] Respects daily quota budget (950 RPD with safety margin)
- [ ] Loads and processes queued files on next run
- [ ] Metadata persisted in `memory/codebase.json`
- [ ] Console shows categorization stats
- [ ] Skip unchanged files automatically

## Expected Outcomes

**Initial Index (Day 1):**
- 940 chunks indexed completely
- Uses ~99% of daily quota

**Daily Updates (Ongoing):**
- Only 20-40 chunks (changed files)
- Uses 4-8% of daily quota
- 90%+ quota savings

**Large Codebases (> 1K chunks):**
- Spreads indexing over multiple days
- Critical files indexed first
- Automatic queue management

## Benefits

- 90%+ reduction in daily quota usage
- Faster indexing for typical workflows
- Handles large codebases gracefully
- No manual intervention needed

## Related

- Part of IMPROVEMENT_PLAN.md Section 1: Incremental Indexing
- Requires: #2 (rate limiting)
- Related: Enhanced status reporting for queue visibility
