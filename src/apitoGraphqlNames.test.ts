import {
  apitoGraphQLTypeName,
  apitoListGraphQLName,
  apitoLowerCamelModelId,
  apitoModelBaseName,
  apitoSingularGraphQLName,
} from './apitoGraphqlNames';

describe('apitoGraphqlNames', () => {
  test('apitoGraphQLTypeName matches Apito Go utility for foodcategory', () => {
    expect(apitoGraphQLTypeName('foodcategory')).toBe('Foodcategory');
    expect(apitoGraphQLTypeName('foodcategoryList')).toBe('Foodcategorylist');
    expect(apitoGraphQLTypeName('foodcategoryList_Upsert_Payload')).toBe(
      'Foodcategorylist_Upsert_Payload'
    );
  });

  test('apitoModelBaseName lowercases camelCase singular', () => {
    expect(apitoModelBaseName('foodCategories')).toBe('foodcategory');
  });

  test('apitoSingularGraphQLName for Refine plural resource', () => {
    expect(apitoSingularGraphQLName('foodCategories')).toBe('Foodcategory');
  });

  test('apitoListGraphQLName', () => {
    expect(apitoListGraphQLName('foodCategories')).toBe('Foodcategorylist');
  });

  test('apitoLowerCamelModelId', () => {
    expect(apitoLowerCamelModelId('foodcategory')).toBe('foodcategory');
    expect(apitoLowerCamelModelId('food_category')).toBe('foodCategory');
  });
});
