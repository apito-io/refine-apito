import pluralize from 'pluralize';

/**
 * ASCII approximation of Apito open-core `utility.GraphQLTypeName` (golang.org/x/text/cases Title, English):
 * split on `_`, title-case each segment (first char upper, rest lower per segment).
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

/**
 * Singular model id aligned with Apito storage: pluralize then lowercase entire string
 * so Refine camelCase singulars (e.g. foodCategory) match lowercase model names (foodcategory).
 */
export function apitoModelBaseName(resource: string): string {
  return pluralize.singular(resource).toLowerCase();
}

/**
 * lowerCamel GraphQL field prefix from underscore model id (matches strcase.ToLowerCamel + list suffix pattern).
 * e.g. foodcategory -> foodcategory, food_category -> foodCategory
 */
export function apitoLowerCamelModelId(modelBase: string): string {
  const parts = modelBase.toLowerCase().split('_').filter((p) => p.length > 0);
  if (parts.length === 0) return modelBase;
  return (
    parts[0].toLowerCase() +
    parts
      .slice(1)
      .map(
        (p) =>
          p.charAt(0).toLocaleUpperCase('en-US') +
          p.slice(1).toLocaleLowerCase('en-US')
      )
      .join('')
  );
}

/** List root field name, e.g. foodcategoryList (matches Apito MultipleResourceName for simple models). */
export function apitoListRootField(resource: string): string {
  const base = apitoLowerCamelModelId(apitoModelBaseName(resource));
  return `${base}List`;
}

/** Pascal fragment for singular model GraphQL types, e.g. Foodcategory_Update_Payload */
export function apitoSingularGraphQLName(resource: string): string {
  return apitoGraphQLTypeName(apitoModelBaseName(resource));
}

/** Pascal fragment for list / connection types built from model + List, e.g. Foodcategorylist */
export function apitoListGraphQLName(resource: string): string {
  return apitoGraphQLTypeName(apitoModelBaseName(resource) + 'List');
}

/**
 * SCREAMING_SNAKE input name for the `connection` argument on list/count queries.
 * Matches Apito `objects.BuildConnectionArguments(definedModel.Name)` →
 * `strings.ToUpper(name + "_Connection_Filter_Condition")` (singular model id, not the list GraphQL name).
 */
export function apitoConnectionFilterConditionType(resource: string): string {
  return (
    apitoModelBaseName(resource) + '_Connection_Filter_Condition'
  ).toUpperCase();
}

/**
 * SCREAMING_SNAKE input name for the `relation` / `relationWhere` argument.
 * Matches Apito `BuildWhereRelationConditionArgument(definedModel.Name, ...)`.
 */
export function apitoWhereRelationFilterConditionType(resource: string): string {
  return (
    apitoModelBaseName(resource) + '_Where_Relation_Filter_Condition'
  ).toUpperCase();
}
