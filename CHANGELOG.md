# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.1] - 2026-04-19

### Fixed

- **All-lowercase Refine resources** (e.g. `foodcategories` from slugs): `singularize` produced run-on singulars (`foodcategory`) so list fields became `foodcategoryList` instead of explorer-correct `foodCategoryList`. Added `repairRunonLowercaseCompoundSingular` after `SingularResourceName` logic to recover common compound tails (`…category`, `…account`, `…draft`, and `food|bank|work|stock|back…order`) so names match Apito `definedModel.Name` casing when the slug omits inner capitals.

## [0.5.0] - 2026-04-19

### Changed

- **BREAKING (graphql-names API)**: Removed `apitoModelBaseName`, `apitoLowerCamelModelId`, `apitoListRootField`, `apitoSingularGraphQLName`, `apitoListGraphQLName`, and `apitoConnectionModelIdFromResource`. Naming is now **1:1 with Apito** via explicit ports of `utility.SingularResourceName`, `utility.MultipleResourceName`, and `utility.GraphQLTypeName` (`open-core/utility/name_extractor.go`, `graphql_typename.go`) plus filter helpers aligned with `open-core/schemas/objects/search_filter_arg.go` / `public_schema_builder_build.go`.
- **Dependency**: Replaced `pluralize` with npm **`inflection`** (Rails-style rules, matches Go `github.com/jinzhu/inflection`).

### Added

- **`apitoModelName`**, **`apitoMultipleResourceName`**, **`apitoSingularGraphQLTypeName`**, **`apitoListGraphQLTypeName`**, **`apitoListCountGraphQLTypeName`**, **`apitoWhereInputType`**, **`apitoSortInputType`**, **`apitoListKeyConditionType`**, **`apitoListCountKeyConditionType`**, **`apitoListCountWhereInputType`** in `src/apitoGraphqlNames.ts`.
- **`src/fixtures/goVectors.json`**: golden vectors from the engine’s Go `utility` package; Jest asserts TS output matches for every row.

## [0.4.3] - 2026-04-19

### Fixed

- **List / count / getOne root fields**: `apitoListRootField` and `getOne` now follow Apito `utility.SingularResourceName` / `MultipleResourceName` (Go `strcase.ToLowerCamel` + `inflection.Singular`), e.g. `bankAccounts` → `bankAccountList` / `bankAccount`, not `bankaccountList` / `bankaccount`. This matches the GraphQL explorer for compound model names (`foodOrderList`, `bankAccountList`, …).
- **`$connection` / relation filter types** for compound Refine resources: when the camel singular has inner capitals (`bankAccount`), types now use snake id (`bank_account` → `BANK_ACCOUNT_CONNECTION_FILTER_CONDITION`) to align with typical Apito `definedModel.Name` storage; single-token names still use flattened `apitoModelBaseName`.

### Added

- **`strcaseToLowerCamel`**, **`apitoSingularResourceName`**, and **`apitoConnectionModelIdFromResource`** in `apitoGraphqlNames.ts` (`strcaseToLowerCamel` is an ASCII port of `github.com/iancoleman/strcase`).

## [0.4.2] - 2026-04-19

### Added

- **`buildApitoCreateMutation(resource, fields)`** in `apitoGraphqlNames.ts`: returns the same `create*` mutation document the data provider uses (`Foodorder_*` / `createFoodorder`, not `FoodOrder_*` / `createFoodOrder`).
- **Package export `refine-apito/graphql-names`** (dual `tsup` entry) so apps can import naming helpers and the mutation builder without hand-copying GraphQL.

### Changed

- **`create()`** default path now builds the mutation via `buildApitoCreateMutation` (single source of truth).

## [0.4.1] - 2026-04-18

### Fixed

- **getList variable types**: `$connection` and `$relationWhere` / `$relationWhereCount` now match Apito `BuildConnectionArguments(definedModel.Name)` and `BuildWhereRelationConditionArgument(definedModel.Name)` (e.g. `FOOD_CONNECTION_FILTER_CONDITION`, not `FOODLIST_CONNECTION_FILTER_CONDITION`).

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
