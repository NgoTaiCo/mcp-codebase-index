# Issue #6: Prompt Enhancement Engine with Gemini 2.5 Flash

## Label
`enhancement`, `ai`, `search-quality`

## Description

Implement prompt enhancement using Gemini 2.5 Flash to improve search query quality by adding codebase context and technical understanding.

## Problem

Current search:
- Users must write perfect semantic queries
- No automatic context addition
- Generic queries return suboptimal results
- Cannot leverage codebase knowledge

Example:
- User query: "authentication"
- Better query: "Find authentication implementation including login, logout, token management in GetX controllers using OpenIM SDK and JWT tokens"

## Proposed Solution

Add `enhance_prompt` MCP tool that:
1. Analyzes user's query intent
2. Fetches relevant codebase context (languages, frameworks, patterns)
3. Uses Gemini 2.5 Flash to enhance the query
4. Allows custom prompt additions
5. Supports custom templates

### Features
- **Auto-context:** Automatically adds project info
- **Template system:** Pre-defined enhancement templates
- **Custom prompts:** User can add specific instructions
- **Model choice:** gemini-2.5-flash or gemini-2.5-flash-lite

## Acceptance Criteria

- [ ] `enhance_prompt` tool available in MCP
- [ ] Analyzes codebase to extract context (languages, frameworks)
- [ ] Uses Gemini 2.5 Flash for query enhancement
- [ ] Accepts custom prompt additions as array
- [ ] Supports template selection
- [ ] Model configurable (flash or flash-lite)
- [ ] Returns enhanced query only (no explanation)
- [ ] Handles enhancement errors gracefully
- [ ] Caches codebase context for reuse
- [ ] Template configuration file support

## Input Schema

```
{
  "query": "authentication",
  "customPrompts": ["focus on JWT tokens", "include error handling"],
  "template": "find_implementation",
  "model": "gemini-2.5-flash"
}
```

## Example Enhancement

**Before:**
```
"error handling"
```

**After (Enhanced):**
```
"Find error handling patterns in Dart/Flutter code including try-catch blocks, 
GetX error snackbars, logging utilities, and exception classes. Focus on 
controllers and services that handle OpenIM SDK errors and network failures."
```

## Cost Analysis

- Gemini 2.5 Flash: $0.30/1M input, $2.50/1M output
- Typical enhancement: ~500 input + ~200 output tokens
- Cost: ~$0.0007 per enhancement
- Monthly (1000 searches): ~$0.70

## Benefits

- Better search results without perfect queries
- Leverages codebase knowledge automatically
- Reduces user effort
- More relevant code snippets
- Customizable for specific needs

## Configuration

```json
{
  "PROMPT_ENHANCEMENT": "true",
  "ENHANCEMENT_MODEL": "gemini-2.5-flash",
  "AUTO_CONTEXT": "true",
  "MAX_CONTEXT_TOKENS": "1000"
}
```

## Related

- Part of IMPROVEMENT_PLAN.md Section 4: Prompt Enhancement
- Enhances: Search quality for all queries
