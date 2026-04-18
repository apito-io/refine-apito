import { singularize } from 'inflection';

/**
 * Port of `github.com/iancoleman/strcase` `ToLowerCamel` (`toCamelInitCase` with initCase=false),
 * ASCII-only (matches Go’s `[]byte` loop for Apito model ids).
 * Used by `utility.SingularResourceName` (`name_extractor.go`).
 */
export function strcaseToLowerCamel(s: string): string {
  s = s.trim();
  if (!s) return s;
  let out = '';
  let capNext = false;
  let prevIsCap = false;
  for (let i = 0; i < s.length; i++) {
    const orig = s.charCodeAt(i);
    let v = orig;
    const vIsCap = orig >= 65 && orig <= 90; // A-Z
    const vIsLow = orig >= 97 && orig <= 122; // a-z
    if (capNext) {
      if (vIsLow) {
        v -= 32;
      }
    } else if (i === 0) {
      if (vIsCap) {
        v += 32;
      }
    } else if (prevIsCap && vIsCap) {
      v += 32;
    }
    prevIsCap = vIsCap;

    if (vIsCap || vIsLow) {
      out += String.fromCharCode(v);
      capNext = false;
    } else if (orig >= 48 && orig <= 57) {
      out += String.fromCharCode(v);
      capNext = true;
    } else {
      capNext =
        orig === 95 || orig === 32 || orig === 45 || orig === 46;
    }
  }
  return out;
}

/**
 * Refine / URL slugs often use all-lowercase plurals (`foodcategories`). `inflection` then yields
 * run-on singulars (`foodcategory`) which do **not** match Apito `definedModel.Name` (`foodCategory`)
 * and break list roots (`foodCategoryList`). When the singular is letters-only lowercase, recover
 * common compound tails so GraphQL field names match the explorer.
 *
 * Inputs that already contain capitals, `_`, or `-` are unchanged (still 1:1 with Go `SingularResourceName`).
 */
export function repairRunonLowercaseCompoundSingular(singular: string): string {
  if (!/^[a-z]+$/.test(singular)) {
    return singular;
  }
  const tailCompound =
    /^([a-z]{2,})(category|account|draft)$/.exec(singular);
  if (tailCompound) {
    const [, head, tail] = tailCompound;
    const cap =
      tail === 'category'
        ? 'Category'
        : tail === 'account'
          ? 'Account'
          : 'Draft';
    return head + cap;
  }
  const orderCompound = /^([a-z]+)(order)$/.exec(singular);
  if (
    orderCompound &&
    /^(food|bank|work|stock|back)$/.test(orderCompound[1])
  ) {
    return orderCompound[1] + 'Order';
  }
  return singular;
}

/**
 * Mirrors Apito `utility.SingularResourceName(name)` (`open-core/utility/name_extractor.go`).
 * `ListCount` is checked before `List` so inputs like `fooListCount` match Go’s branch order.
 */
export function apitoSingularResourceName(name: string): string {
  const t = name.trim();
  const lc = strcaseToLowerCamel(t);
  let raw: string;
  if (t.endsWith('ListCount')) {
    raw = singularize(lc).replace(/ListCount$/, '');
  } else if (t.endsWith('List')) {
    raw = singularize(lc).replace(/List$/, '');
  } else {
    raw = singularize(lc);
  }
  return repairRunonLowercaseCompoundSingular(raw);
}

/** Alias: same as `definedModel.Name` after engine normalization. */
export const apitoModelName = apitoSingularResourceName;

/**
 * Mirrors Apito `utility.MultipleResourceName(name)` → `SingularResourceName(name) + "List"`.
 */
export function apitoMultipleResourceName(name: string): string {
  return `${apitoSingularResourceName(name)}List`;
}

/**
 * Mirrors Apito `utility.GraphQLTypeName` (`open-core/utility/graphql_typename.go`):
 * split on `_`, English title per segment (first char upper, rest lower per segment).
 */
export function apitoGraphQLTypeName(modelId: string): string {
  const parts = modelId
    .trim()
    .split('_')
    .filter((p) => p.length > 0);
  const titleSeg = (s: string) =>
    s.charAt(0).toLocaleUpperCase('en-US') +
    s.slice(1).toLocaleLowerCase('en-US');
  return parts.map(titleSeg).join('_');
}

/** `GraphQLTypeName(MultipleResourceName(resource))` — list filter / sort / operation name base. */
export function apitoListGraphQLTypeName(resource: string): string {
  return apitoGraphQLTypeName(apitoMultipleResourceName(resource));
}

/** `GraphQLTypeName(MultipleResourceName(resource) + "_Count")` — count query filter name base. */
export function apitoListCountGraphQLTypeName(resource: string): string {
  return apitoGraphQLTypeName(`${apitoMultipleResourceName(resource)}_Count`);
}

/** `GraphQLTypeName(apitoModelName(resource))` — singular object / mutation type base. */
export function apitoSingularGraphQLTypeName(resource: string): string {
  return apitoGraphQLTypeName(apitoModelName(resource));
}

/** `strings.ToUpper(name + "_Connection_Filter_Condition")` with `name = definedModel.Name` (here: `apitoModelName`). */
export function apitoConnectionFilterConditionType(resource: string): string {
  return (
    apitoModelName(resource) + '_Connection_Filter_Condition'
  ).toUpperCase();
}

/** `BuildWhereRelationConditionArgument` name prefix. */
export function apitoWhereRelationFilterConditionType(resource: string): string {
  return (
    apitoModelName(resource) + '_Where_Relation_Filter_Condition'
  ).toUpperCase();
}

/** List `where` input (BuildFilterArgument with list GraphQL name). */
export function apitoWhereInputType(resource: string): string {
  return (
    apitoListGraphQLTypeName(resource) + '_Input_Where_Payload'
  ).toUpperCase();
}

/** List `sort` input. */
export function apitoSortInputType(resource: string): string {
  return (
    apitoListGraphQLTypeName(resource) + '_Input_Sort_Payload'
  ).toUpperCase();
}

/** List `_key` filter input. */
export function apitoListKeyConditionType(resource: string): string {
  return (apitoListGraphQLTypeName(resource) + '_Key_Condition').toUpperCase();
}

/** Count query `_key` filter input. */
export function apitoListCountKeyConditionType(resource: string): string {
  return (
    apitoListCountGraphQLTypeName(resource) + '_Key_Condition'
  ).toUpperCase();
}

/** Count query `where` input. */
export function apitoListCountWhereInputType(resource: string): string {
  return (
    apitoListCountGraphQLTypeName(resource) + '_Input_Where_Payload'
  ).toUpperCase();
}

/**
 * Default `create*` mutation document (matches `public_schema_builder_build.go` single create).
 */
export function buildApitoCreateMutation(
  resource: string,
  fields: string[]
): string {
  const typeBase = apitoSingularGraphQLTypeName(resource);
  return `                  mutation Create${typeBase}($payload: ${typeBase}_Create_Payload!, $connect: ${typeBase}_Relation_Connect_Payload) {
                      create${typeBase}(payload: $payload, connect: $connect, status: published) {
                          id
                          data {
                              ${fields.join('\n')}
                          }
                          meta {
                              created_at
                              status
                              updated_at
                          }
                      }
                  }`;
}
