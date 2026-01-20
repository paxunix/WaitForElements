# AGENTS

This repository contains WaitForElements and its browser-based Jasmine test suite.

## Quick Start
- Install deps:
  - `nvm install --lts`
  - `nvm use --lts`
  - `npm install`
- Run tests (headless browser):
  - `npm test`
- Run tests in a visible browser:
  - `npm run test:browser`
- Run coverage (browser + nyc report):
  - `npm run coverage`

## Coverage Notes
- Coverage is collected from the browser via `window.__coverage__`.
- `npm run coverage` does:
  - `nyc instrument WaitForElements.js coverage`
  - run specs using `jasmine-browser-coverage.json`
  - collect `window.__coverage__` into `.nyc_output/coverage.json`
  - generate `nyc report` (text + html).  The report is in ./coverage/index.html .

## Key Files
- `WaitForElements.js`: main source under test.
- `test/WaitForElements-spec.js`: Jasmine specs.
- `jasmine-browser.json`: normal test runner config.
- `jasmine-browser-coverage.json`: coverage runner config (uses `coverage/`).
- `scripts/coverage-runner.js`: collects browser coverage to `.nyc_output/`.
- `INSTALL.md`: developer setup instructions.

## Test Semantics
- Filtering is a final gate (applied right before emitting matches).  Intent of the filters is once an element has satisfied
  all criteria to be returned, the filter is applied, and if the filter removes that element, everything should continue as
  though that element were never present on input to the algorithm.
- `onlyOnce` applies even without a filter.
- `requireVisible` uses IntersectionObserver; tests use small deterministic fakes where needed.
- `stop()` marks the instance as stopped; further `match()` calls throw/reject.

## Working with Tests
- Many tests use async DOM mutations; prefer deterministic hooks (e.g., fake IntersectionObserver) to avoid flake.
- If you add tests that touch globals (e.g., `window.IntersectionObserver`, `jasmine.clock()`), restore/uninstall in the same spec.
- if updating a test plan to indicate a test was implemented, remove it from the plan

## Tips
- Use `rg` for fast search.
- When debugging nondeterministic tests, run:
  - `npx jasmine-browser-runner runSpecs --config=jasmine-browser.json --seed=<seed> --fail-fast`
