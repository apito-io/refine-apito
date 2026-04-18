import goVectorsJson from './fixtures/goVectors.json';
import {
  apitoConnectionFilterConditionType,
  apitoGraphQLTypeName,
  apitoListGraphQLTypeName,
  apitoMultipleResourceName,
  apitoSingularGraphQLTypeName,
  apitoModelName,
  apitoWhereRelationFilterConditionType,
  apitoWhereInputType,
  apitoSortInputType,
  apitoListKeyConditionType,
  apitoListCountKeyConditionType,
  apitoListCountWhereInputType,
  buildApitoCreateMutation,
  strcaseToLowerCamel,
  apitoSingularResourceName,
} from './apitoGraphqlNames';

type GoVectorRow = {
  input: string;
  singularResourceName: string;
  multipleResourceName: string;
  graphqlTypeName: string;
  graphqlTypeNamePlural: string;
};

const goVectors = goVectorsJson as GoVectorRow[];

describe('apitoGraphqlNames Go parity (goVectors.json)', () => {
  test.each(goVectors.map((row) => [row.input, row] as const))(
    'matches engine for %s',
    (input, row) => {
      const {
        singularResourceName,
        multipleResourceName,
        graphqlTypeName,
        graphqlTypeNamePlural,
      } = row;
      expect(apitoSingularResourceName(input)).toBe(singularResourceName);
      expect(apitoMultipleResourceName(input)).toBe(multipleResourceName);
      expect(apitoModelName(input)).toBe(singularResourceName);
      expect(apitoSingularGraphQLTypeName(input)).toBe(graphqlTypeName);
      expect(apitoListGraphQLTypeName(input)).toBe(graphqlTypeNamePlural);
    }
  );
});

describe('apitoGraphqlNames', () => {
  test('apitoGraphQLTypeName matches Apito Go utility for foodcategory', () => {
    expect(apitoGraphQLTypeName('foodcategory')).toBe('Foodcategory');
    expect(apitoGraphQLTypeName('foodcategoryList')).toBe('Foodcategorylist');
    expect(apitoGraphQLTypeName('foodcategoryList_Upsert_Payload')).toBe(
      'Foodcategorylist_Upsert_Payload'
    );
  });

  test('strcaseToLowerCamel matches Go iancoleman/strcase vectors', () => {
    expect(strcaseToLowerCamel('bank_account')).toBe('bankAccount');
    expect(strcaseToLowerCamel('bankAccounts')).toBe('bankAccounts');
    expect(strcaseToLowerCamel('food_orders')).toBe('foodOrders');
    expect(strcaseToLowerCamel('foodCategories')).toBe('foodCategories');
    expect(strcaseToLowerCamel('test_label')).toBe('testLabel');
    expect(strcaseToLowerCamel('a_b_c')).toBe('aBC');
  });

  test('connection / list filter types use definedModel.Name and list GraphQL name', () => {
    expect(apitoConnectionFilterConditionType('foods')).toBe(
      'FOOD_CONNECTION_FILTER_CONDITION'
    );
    expect(apitoConnectionFilterConditionType('bankAccounts')).toBe(
      'BANKACCOUNT_CONNECTION_FILTER_CONDITION'
    );
    expect(apitoWhereRelationFilterConditionType('bankAccounts')).toBe(
      'BANKACCOUNT_WHERE_RELATION_FILTER_CONDITION'
    );
    expect(apitoWhereInputType('bankAccounts')).toBe(
      'BANKACCOUNTLIST_INPUT_WHERE_PAYLOAD'
    );
    expect(apitoSortInputType('bankAccounts')).toBe(
      'BANKACCOUNTLIST_INPUT_SORT_PAYLOAD'
    );
    expect(apitoListKeyConditionType('bankAccounts')).toBe(
      'BANKACCOUNTLIST_KEY_CONDITION'
    );
    expect(apitoListCountKeyConditionType('bankAccounts')).toBe(
      'BANKACCOUNTLIST_COUNT_KEY_CONDITION'
    );
    expect(apitoListCountWhereInputType('bankAccounts')).toBe(
      'BANKACCOUNTLIST_COUNT_INPUT_WHERE_PAYLOAD'
    );
  });

  test('all-lowercase Refine slug plural maps to Apito camel model id', () => {
    expect(apitoSingularResourceName('foodcategories')).toBe('foodCategory');
    expect(apitoMultipleResourceName('foodcategories')).toBe('foodCategoryList');
    expect(apitoSingularResourceName('bankaccounts')).toBe('bankAccount');
    expect(apitoMultipleResourceName('bankaccounts')).toBe('bankAccountList');
  });

  test('buildApitoCreateMutation uses Foodorder / createFoodorder for foodOrders', () => {
    const doc = buildApitoCreateMutation('foodOrders', [
      'order_no',
      'total_amount',
    ]);
    expect(doc).toContain('mutation CreateFoodorder(');
    expect(doc).toContain('Foodorder_Create_Payload!');
    expect(doc).toContain('Foodorder_Relation_Connect_Payload');
    expect(doc).toContain('createFoodorder(');
    expect(doc).not.toContain('FoodOrder');
    expect(doc).not.toContain('createFoodOrder');
  });
});
