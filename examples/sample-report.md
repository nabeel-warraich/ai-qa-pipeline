# QA Report — https://www.saucedemo.com

> _Illustrative example of the pipeline's output. Your real runs write to `runs/<timestamp>/report.md`._

- **Verdict:** ⛔ NO-SHIP — 1 blocking finding(s) at high/critical severity.
- **Run:** 2026-07-12T09:14:03.221Z  |  **AI provider:** none (heuristic)
- **Pages explored:** 3  |  **Tests:** 5 (4 passed, 1 failed)  |  **Findings:** 3

## Findings (severity-ranked)

| Sev | Area | Finding | Evidence | Recommendation |
|-----|------|---------|----------|----------------|
| 🟠 high | functional | loads with a successful status and renders content | no console errors on load: expected [ '...' ] to have a length of 0 | Investigate the console error and confirm it is not masking a functional break. |
| 🟡 medium | accessibility | Form fields without an accessible label | 2 occurrence(s) on https://www.saucedemo.com | Associate each field with a `<label>` or `aria-label` per WCAG 2.2 AA. |
| 🟡 medium | performance | Page load exceeds performance budget | Load time 4310ms > budget 4000ms | Investigate render-blocking resources and image sizes. |

## Features analyzed
- **Form submission on "Swag Labs"** _(authentication, risk: high)_
- **Page loads and renders: "Swag Labs"** _(navigation, risk: medium)_

## Test results
- ✅ loads with a successful status and renders content (612ms)
- ✅ primary form exposes a submit control (498ms)
- ❌ loads with a successful status and renders content (740ms) — no console errors on load
- ✅ page loads and renders (521ms)
- ✅ primary form exposes a submit control (503ms)
