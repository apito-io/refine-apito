# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-04-18

### Changed

- **BREAKING (auto-generated GraphQL)**: Data provider queries and mutations now follow Apito’s naming (`utility.GraphQLTypeName` and list/mutation patterns from `public_schema_builder_build`). Operation names, variable types, and root fields match the engine (e.g. `Foodcategory_Update_Payload`, `updateFoodcategory`, `foodcategoryList`) instead of the previous Refine-only casing (`FoodCategory_Update_Payload`, `updateFoodCategory`, etc.). Apps that embedded the old strings or assumed camelCase model fragments may need to rely on the provider defaults or update custom `meta.gqlQuery` / `meta.gqlMutation` strings.

### Added

- `src/apitoGraphqlNames.ts` helpers and Jest coverage in `src/apitoGraphqlNames.test.ts`.

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
