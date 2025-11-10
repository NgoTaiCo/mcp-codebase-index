# Issue #7: Security & Privacy - Gitignore Integration and Content Filtering

## Label
`enhancement`, `security`, `privacy`

## Description

Implement security features to prevent indexing of sensitive files and filter out sensitive content like API keys, passwords, and private keys.

## Problem

Current implementation:
- Indexes ALL files in repository
- No respect for .gitignore patterns
- Sensitive files could be embedded (API keys, .env, credentials)
- No content filtering before embedding
- Privacy concerns for production configs

## Proposed Solution

Two-layer security approach:

### Layer 1: File Filtering (Gitignore Integration)
- Parse and respect `.gitignore` patterns
- Additional sensitive file patterns:
  - `**/.env*`
  - `**/secrets.*`
  - `**/credentials.*`
  - `**/*_key.*`, `**/*.pem`, `**/*.key`, `**/*.crt`
- Configurable exclusion patterns
- Privacy mode: `strict`, `balanced`, `permissive`

### Layer 2: Content Filtering
- Scan content for sensitive patterns before embedding
- Detect and redact:
  - API keys (Gemini, OpenAI, GitHub tokens)
  - Private keys (RSA, SSH)
  - Passwords in configs
  - Bearer tokens
  - Database credentials
- Log warnings when sensitive data detected
- Option to skip or redact

## Acceptance Criteria

### Gitignore Integration
- [ ] Parses `.gitignore` file from repository root
- [ ] Respects all gitignore patterns
- [ ] Additional sensitive patterns configurable
- [ ] Privacy mode setting (strict/balanced/permissive)
- [ ] Logs skipped files (if verbose mode)
- [ ] Works with nested .gitignore files

### Content Filtering
- [ ] Detects common API key patterns
- [ ] Detects private key headers
- [ ] Detects password/credential patterns
- [ ] Redacts sensitive content with `[REDACTED]`
- [ ] Logs warnings when sensitive data found
- [ ] Option to skip file entirely or redact
- [ ] Configurable pattern list
- [ ] No false positives on code examples

## Sensitive Patterns (Examples)

- Gemini API: `AIzaSy[a-zA-Z0-9_-]{33}`
- OpenAI: `sk-[a-zA-Z0-9]{48}`
- GitHub Token: `ghp_[a-zA-Z0-9]{36}`
- Private Keys: `-----BEGIN (RSA |)PRIVATE KEY-----`
- Bearer Tokens: `Bearer [a-zA-Z0-9_-]+`
- Passwords: `password\s*=\s*["'].*["']`

## Configuration

```json
{
  "RESPECT_GITIGNORE": "true",
  "SENSITIVE_PATTERNS": ".env*,*secret*,*.pem,*.key",
  "PRIVACY_MODE": "strict",
  "CONTENT_FILTER": "true",
  "FILTER_ACTION": "redact"
}
```

## Privacy Modes

- **strict**: Skip all gitignored files + sensitive patterns
- **balanced**: Skip gitignored, redact sensitive content
- **permissive**: Only redact extremely sensitive content

## Benefits

- Prevents accidental API key leakage
- GDPR compliance support
- Respects developer's .gitignore intent
- Configurable security level
- Peace of mind for production usage

## Related

- Part of IMPROVEMENT_PLAN.md Section 5: Security & Privacy
- Compliance: Google ToS, Qdrant ToS, GDPR
