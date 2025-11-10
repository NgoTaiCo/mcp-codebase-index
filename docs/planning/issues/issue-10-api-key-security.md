# Issue #10: API Key Security Best Practices

## Label
`security`, `documentation`, `best-practices`

## Description

Document and implement security best practices for protecting Gemini API keys and Qdrant credentials.

## Problem

Current state:
- No security documentation
- API keys may have weak permissions
- No guidance on key protection
- Risk of accidental key exposure
- No security audit tools

## Proposed Solution

Create comprehensive security documentation and implement basic security checks.

### SECURITY.md Documentation

1. **API Key Protection**
   - File permissions (600 for config files)
   - Environment variables vs config files
   - Git ignore patterns
   - Never hardcode keys
   - Rotation schedule recommendations

2. **Qdrant Security**
   - API key vs cluster URL security
   - TLS requirement
   - Network access controls
   - Free tier vs paid security features

3. **Operational Security**
   - Log redaction (never log keys)
   - Error message safety
   - Secure key transmission
   - Key storage best practices

4. **Incident Response**
   - What to do if key exposed
   - How to rotate keys safely
   - Contact information

### File Permission Checks

Add startup validation:
- Check config file permissions
- Warn if too permissive (>600)
- Suggest fix commands
- Optional auto-fix

### Log Redaction

Automatically redact sensitive data:
- API keys in logs
- Cluster URLs with tokens
- Sensitive file paths
- Error messages with credentials

### Security Audit Tool

Add `security_audit` MCP tool:
- Checks file permissions
- Validates .gitignore
- Scans for hardcoded keys
- Reviews log configuration
- Generates security report

## Acceptance Criteria

### Documentation
- [ ] `SECURITY.md` file created
- [ ] API key protection documented
- [ ] Qdrant security covered
- [ ] Operational security explained
- [ ] Incident response plan
- [ ] Key rotation guide
- [ ] Contact info for security issues

### README Updates
- [ ] Security section added
- [ ] Links to SECURITY.md
- [ ] Quick security checklist
- [ ] Vulnerability reporting process

### Permission Checks
- [ ] Config file permissions validated at startup
- [ ] Warning shown if permissions too open
- [ ] Fix commands suggested
- [ ] Optional auto-fix (with confirmation)

### Log Redaction
- [ ] API keys never logged
- [ ] Cluster URLs sanitized
- [ ] Error messages safe
- [ ] Configurable redaction patterns

### Security Audit Tool
- [ ] `security_audit` MCP tool implemented
- [ ] File permission checks
- [ ] .gitignore validation
- [ ] Hardcoded key detection (basic)
- [ ] Report generation
- [ ] Actionable recommendations

## SECURITY.md Sections

1. **Overview** - Security philosophy
2. **API Key Protection** - Gemini API keys
3. **Qdrant Security** - Cluster credentials
4. **Configuration Security** - File permissions
5. **Operational Security** - Logs, errors, transmission
6. **Gitignore Patterns** - What to exclude
7. **Key Rotation** - How to rotate safely
8. **Incident Response** - Key exposure handling
9. **Security Audit** - Using audit tool
10. **Reporting** - Vulnerability disclosure

## Security Checklist

Users can verify:
- [ ] Config files have 600 permissions
- [ ] API keys not in version control
- [ ] .gitignore includes config files
- [ ] No keys in environment publicly visible
- [ ] Logs don't contain keys
- [ ] Error messages sanitized
- [ ] TLS used for all API calls
- [ ] Keys rotated periodically
- [ ] Team members educated

## File Permission Recommendations

```
Recommended permissions:
- Config files: 600 (owner read/write only)
- Log files: 600 (owner read/write only)
- Scripts: 700 (owner execute only)
- Backup files: 600 (owner read/write only)

macOS/Linux commands:
chmod 600 ~/.mcp-codebase-index/config.json
chmod 600 ~/.mcp-codebase-index/*.log

Windows:
Use NTFS permissions to restrict access
```

## Log Redaction Examples

Before redaction:
```
Error: Gemini API failed with key AIzaSy...
Connecting to https://abc-123.qdrant.io?api-key=xyz...
```

After redaction:
```
Error: Gemini API failed with key [REDACTED]
Connecting to https://[CLUSTER].qdrant.io?api-key=[REDACTED]
```

## Security Audit Report Example

```
🔒 Security Audit Report

File Permissions:
✅ config.json: 600 (secure)
⚠️  logs/indexing.log: 644 (too permissive)
   Fix: chmod 600 logs/indexing.log

Gitignore:
✅ config.json excluded
✅ *.log excluded
✅ .env excluded
❌ backup/*.json not excluded
   Fix: Add "backup/" to .gitignore

Hardcoded Keys:
✅ No hardcoded keys detected

Log Configuration:
✅ Redaction enabled
✅ API keys filtered
✅ URLs sanitized

Recommendations:
1. Fix log file permissions
2. Update .gitignore for backups
3. Rotate API keys (last rotated: 45 days ago)
4. Review team access to config files

Overall Security Score: 8/10 (Good)
```

## Key Rotation Process

Step-by-step guide:
1. Generate new Gemini API key
2. Update config.json
3. Test new key
4. Revoke old key
5. Update documentation
6. Notify team (if applicable)

Recommended frequency:
- Personal use: Every 90 days
- Team use: Every 30 days
- After exposure: Immediately

## Benefits

- Prevents API key leaks
- Professional security posture
- Clear incident response
- Automated security checks
- User education
- Compliance readiness

## Related

- Part of IMPROVEMENT_PLAN.md Section 7: API Key Security
- Related: #7 (security/privacy for content filtering)
- Related: #8 (privacy documentation)
