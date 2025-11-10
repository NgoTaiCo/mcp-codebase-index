# Issue #1: Switch Base Model Between gemini-embedding-001 and text-embedding-004

## Implementation Summary

Successfully implemented the ability to switch between embedding models via environment variable configuration.

## Changes Made

### 1. Code Changes (`src/embedder.ts`)
- Added `SUPPORTED_MODELS` constant with type-safe model names
- Modified `CodeEmbedder` constructor to accept optional model parameter
- Implemented model selection priority: constructor param → env var → default
- Added validation to reject unsupported model names with clear error messages
- Added console log to display selected model on initialization

### 2. Documentation Updates

#### README.md
- Added "Optional Configuration" section explaining EMBEDDING_MODEL variable
- Listed both supported models with descriptions
- Updated optional variables table to include EMBEDDING_MODEL

#### SETUP.md
- Added EMBEDDING_MODEL to environment variables table
- Included default value and supported models

#### QUICK_REF.md
- Added EMBEDDING_MODEL to quick reference table

#### vscode_settings.example.json
- Added EMBEDDING_MODEL with default value to example configuration

## Usage

Users can now switch models in 3 ways:

### Method 1: Environment Variable (Recommended)
```json
{
  "env": {
    "EMBEDDING_MODEL": "gemini-embedding-001"
  }
}
```

### Method 2: Default Behavior
If not specified, uses `text-embedding-004` by default.

### Method 3: Programmatic (for library users)
```typescript
const embedder = new CodeEmbedder(apiKey, 'gemini-embedding-001');
```

## Supported Models

- ✅ `text-embedding-004` - Latest model (default)
- ✅ `gemini-embedding-001` - Earlier model for compatibility

## Error Handling

If an unsupported model is specified, the system will throw a clear error:
```
Unsupported embedding model: invalid-model. Supported models: gemini-embedding-001, text-embedding-004
```

## Testing

Tested all scenarios:
- ✅ Default model (no config) → uses `text-embedding-004`
- ✅ Environment variable → uses specified model
- ✅ Explicit constructor param → uses specified model
- ✅ Invalid model → throws descriptive error
- ✅ Build succeeds without errors

## Acceptance Criteria

- ✅ Code supports both `gemini-embedding-001` and `text-embedding-004`
- ✅ Switching between models does not require code changes (environment toggle)
- ✅ Documentation updated to explain how to set the desired model
- ✅ Proper error handling if an unsupported model name is specified

## Files Modified

1. `src/embedder.ts` - Core implementation
2. `README.md` - User documentation
3. `SETUP.md` - Setup guide
4. `QUICK_REF.md` - Quick reference
5. `vscode_settings.example.json` - Configuration example

## Ready for Release

The implementation is complete, tested, and ready to be committed and released.
