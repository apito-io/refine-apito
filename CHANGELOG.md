# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.4] - 2026-04-18

### Security

- Hardened `getList` filter handling in the data provider: reject dynamic property names that could enable prototype pollution (`__proto__`, `constructor`, `prototype`), and build nested filter objects with null prototypes where appropriate.
- Set explicit GitHub Actions `permissions` on the publish workflow (`contents: read` for PR CI, `contents: write` for tag publish and GitHub Releases) to satisfy least-privilege / CodeQL guidance.

## [0.3.3] - 2026-04-18

### Security

- Dependency updates and `pnpm` overrides (including example app) to address known transitive vulnerabilities reported by auditing tools.
- Example: `react-router` and `vite` minimum ranges raised; shared overrides for lodash, minimatch, rollup, and related packages.

### Fixed

- Removed duplicate Jest configuration from `package.json` so Jest 30 uses `jest.config.js` only.
