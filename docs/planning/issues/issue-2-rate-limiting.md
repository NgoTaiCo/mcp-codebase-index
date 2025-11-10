# Issue #2: Smart Rate Limiting for Gemini API

## Label
`enhancement`, `performance`

## Description

Implement intelligent rate limiting to work within Gemini API free tier limits (100 RPM, 30K TPM, 1K RPD) without triggering rate limit errors.

## Problem

Current implementation:
- No rate limit management
- Frequently hits 100 RPM limit causing errors
- Cannot handle large codebases (> 1000 chunks/day)
- No visibility into quota usage

## Proposed Solution

Implement a rate limiting system that:
1. Tracks requests per minute (RPM), tokens per minute (TPM), and requests per day (RPD)
2. Uses 10% safety margins (90 RPM, 27K TPM, 950 RPD)
3. Automatically throttles requests to stay under limits
4. Handles Pacific Time midnight reset for daily quota
5. Provides real-time quota usage visibility

## Acceptance Criteria

- [ ] Rate limiter tracks RPM, TPM, RPD accurately
- [ ] No rate limit errors during indexing
- [ ] Safety margins applied (10% for RPM/TPM, 5% for RPD)
- [ ] Automatic throttling when approaching limits
- [ ] Proper handling of time window resets
- [ ] Console logs show current quota usage
- [ ] Works with both free tier (100 RPM) and paid tier (15K RPM)
- [ ] Configuration option to set tier (`free` or `paid`)

## Expected Outcomes

**Free Tier Performance:**
- 940 chunks indexed in ~10.4 minutes (no errors)
- Daily updates (20-40 chunks) in ~30 seconds
- 100% success rate, 0% error rate

**Benefits:**
- Predictable indexing time
- No quota waste
- Safe for continuous use
- Clear visibility into usage

## Related

- Part of IMPROVEMENT_PLAN.md Section 1: Rate Limiting & Performance
- Blocks: #3 (needs rate limiter for incremental indexing)
- Related: #1 (model switching uses same rate limiter)
