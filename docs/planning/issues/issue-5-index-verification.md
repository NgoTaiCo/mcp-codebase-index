# Issue #5: Index Verification and Health Check Tool

## Label
`enhancement`, `reliability`

## Description

Implement tools to verify index health, detect issues, and optionally repair them automatically.

## Problem

Current limitations:
- No way to verify index integrity
- Cannot detect missing or corrupted entries
- No comparison with file system
- Orphaned vectors (deleted files still indexed)
- No diagnostics when search quality degrades

## Proposed Solution

Add MCP tools for index management:

### `check_index` Tool
Verifies index health and reports issues:
- Scan file system vs indexed files
- Detect missing files (not indexed yet)
- Detect orphaned vectors (file deleted but vector remains)
- Check vector dimension consistency
- Test search functionality
- Generate diagnostic report

### `repair_index` Tool
Fixes detected issues:
- Re-index missing files
- Remove orphaned vectors
- Fix dimension mismatches
- Validate after repair

## Acceptance Criteria

### check_index
- [ ] Scans repository file system
- [ ] Queries all vectors from Qdrant
- [ ] Compares file list with indexed list
- [ ] Detects missing files
- [ ] Detects orphaned vectors
- [ ] Checks embedding dimensions
- [ ] Tests search with sample query
- [ ] Generates comprehensive report
- [ ] Supports `autoRepair` flag
- [ ] Supports `deepScan` flag (slower but thorough)

### repair_index
- [ ] Accepts list of issue IDs to fix
- [ ] Re-indexes missing files
- [ ] Deletes orphaned vectors
- [ ] Validates repairs
- [ ] Reports success/failure for each fix
- [ ] Respects rate limits during repair

## Example Report

```
🔍 Index Health Check

✅ Overall Status: Healthy (minor issues)

📊 Statistics:
- Files in repo: 470
- Files indexed: 455
- Coverage: 96.8%

⚠️ Issues Found (3):

1. Missing Files (15):
   - lib/new_feature/controller.dart
   - lib/new_feature/view.dart
   - ... (13 more)
   
2. Orphaned Vectors (2):
   - lib/old_code/deprecated.dart (deleted)
   - test/old_test.dart (deleted)

3. Dimension Mismatch (0):
   - None found

💡 Recommendations:
- Run `repair_index` to fix missing files
- Clean orphaned vectors to save storage
- Estimated repair time: 2 minutes
```

## Benefits

- Confidence in index quality
- Easy troubleshooting
- Automatic issue detection
- Proactive maintenance
- Better search results

## Related

- Part of IMPROVEMENT_PLAN.md Section 3: Index Verification
- Works with: #3 (incremental indexing validation)
