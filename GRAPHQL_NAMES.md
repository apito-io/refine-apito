# GraphQL names and Refine `resource`

Refine’s `resource` string must match what the Apito **public GraphQL schema** uses for that model: typically the **stored model id** in **canonical snake_case** (for example `food_order`), or legacy **lowerCamelCase** ids still present in older projects.

The data provider builds field and operation names from that id using the same rules as the engine (`refine-apito/src/apitoGraphqlNames.ts`, aligned with `open-core/utility/apito_naming.go`).

## Authoritative matrix (engine repo)

For the full mapping—root fields (`foodOrder`, `foodOrderList`, `foodOrderListCount`), mutation keys (`createFoodOrder`, …), Pascal types, and **why list filter types** (`FOODORDERLIST_*`) differ from **connection** types (`FOOD_ORDER_*`)—see:

**[Apito Engine: `open-core/docs/graphql_model_naming_matrix.md`](https://gitlab.com/apito.io/engine/-/blob/main/open-core/docs/graphql_model_naming_matrix.md)**

(If you have the engine checked out locally: `open-core/docs/graphql_model_naming_matrix.md`.)

## Quick rule

- **Stored id** `food_order` → lowerCamel **singular** `foodOrder`, list field **`foodOrderList`**, count **`foodOrderListCount`**.
- Use **canonical snake_case** for new models so explorer output stays consistent with composed types (`Food_Order_Create_Payload`, `FOOD_ORDER_CONNECTION_FILTER_CONDITION`, etc.).

## List `where` vs `*ListCount` `where`

- **`foodOrderList`** filters use types like **`FOODORDERLIST_INPUT_WHERE_PAYLOAD`** (Pascal list wrapper `FoodOrderList` + `_Input_Where_Payload`) — helper: `apitoWhereInputType`.
- **`foodOrderListCount`** uses **`FOOD_ORDER_LIST_COUNT_INPUT_WHERE_PAYLOAD`** (composed `Food_Order_List_Count` + `_Input_Where_Payload`) — helper: `apitoListCountWhereInputType`.

Do not build count types from `FoodOrderList` + `_Count_*` (that yields the invalid `FOODORDERLIST_COUNT_*` shape). Use the helpers in `apitoGraphqlNames.ts` or `import { apitoListCountWhereInputType } from 'refine-apito'` / `refine-apito/graphql-names`.

## `meta.connectionFields` / `meta.aliasFields` (refine-apito data provider)

Relation subfields in `getList` / `getOne` use **`formatApitoConnectionSubselections`** (`apitoGraphqlNames.ts`). The **schema field name** is always normalized with `apitoSingularResourceName`, so a legacy alias target like `food_category` still resolves to **`foodCategory`**, matching the engine’s public schema. `aliasFields` maps **response key** → **schema field name** (either form); if both normalize to the same string, the redundant `a: a` alias is omitted.

### `connectionFields` keys: has_many vs has_one

The **key** becomes the GraphQL field name on the parent row type (after normalization), so it must match what Apito exposes:

| Relation | Stored target model id (example) | GraphQL field on parent | Wrong |
|----------|----------------------------------|---------------------------|--------|
| **has_many** | `food` | **`foodList`** | `food` (singular is for has_one / document fields only) |
| **has_one** | `customer` | **`customer`** | — |

So for “order has many foods”, use `connectionFields: { foodList: 'id data { name }' }`, not `food`. Programmatically: `apitoConnectionFieldNameForRelation('food', 'has_many')` → `'foodList'` (same as `apitoMultipleResourceName('food')`).
