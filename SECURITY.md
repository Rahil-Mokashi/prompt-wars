# Security

Measures implemented in this repository:

- **No secrets in the repo.** The Firebase web config is public by design and is read from Vite env
  variables (`.env.example` lists them). `.env*` files are gitignored.
- **App Check** with reCAPTCHA Enterprise protects Firebase AI Logic. A debug token is used on
  localhost only, registered in the Firebase console, and never appears in code.
- **No `innerHTML`.** All model output is rendered with `textContent` and DOM APIs (`src/ui/render.ts`).
- **Input validation** (`src/utils/validate.ts`): text up to 5000 characters, up to 5 files of 10 MB,
  MIME whitelist (JPEG, PNG, WebP, PDF, WebM, OGG, MP3, WAV).
- **Schema validation of model output** (`src/ai/schemas.ts`). Invalid output is never shown; the app
  falls back to a safe "Call 112 now" result.
- **Prompt-injection guard** (`src/ai/prompts.ts`): user content is wrapped in delimiters and the
  system instructions state it is data, never instructions.
- **Escalate-only verification** (`src/domain/risk-flags.ts`, `src/domain/verifier.ts`): rules can raise
  severity or add safety actions, never lower or remove them.
- **Security headers** in `firebase.json`: Content-Security-Policy, Permissions-Policy,
  X-Content-Type-Options, Referrer-Policy, X-Frame-Options.
- **Client-side throttle:** one request in flight at a time.
- **No personal data in logs.**

Not implemented: replay protection with limited-use App Check tokens.

Report issues by opening a GitHub issue.
