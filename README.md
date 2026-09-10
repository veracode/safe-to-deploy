## Architecture

```text
GitHub Action (veracode-safe-to-deploy)
      │
      ▼
 HTTP Request
      │
      ▼
Your Security API
      │
      ▼
 JSON Response
      │
      ▼
Evaluate Policy
      │
   ┌──┴──┐
   ▼     ▼
 PASS   FAIL
   │     │
   ▼     ▼
Success Failure
```