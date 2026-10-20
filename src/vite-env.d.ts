/// <reference types="vite/client" />

// Phase 4A.2 — injected by vite.config.ts `define`. Format: "<semver>" or
// "<semver> · <short-sha>" when a CI/deploy step populates GIT_SHA /
// VERCEL_GIT_COMMIT_SHA / VITE_GIT_SHA / GITHUB_SHA.
declare const __APP_VERSION__: string;
