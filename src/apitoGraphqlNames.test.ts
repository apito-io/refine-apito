import namingVectorsJson from './fixtures/naming_vectors.json';
import {
  apitoConnectionFilterConditionType,
  apitoListGraphQLTypeName,
  apitoMultipleResourceName,
  apitoSingularGraphQLTypeName,
  apitoModelName,
  apitoWhereRelationFilterConditionType,
  apitoWhereInputType,
  apitoSortInputType,
  apitoListKeyConditionType,
  apitoListCountKeyConditionType,
  apitoListCountSortInputType,
  apitoListCountWhereInputType,
  buildApitoCreateMutation,
  apitoSingularResourceName,
  canonicalizeModelName,
  formatApitoConnectionSubselections,
  apitoStoredSnakeModelId,
  apitoMutationConnectHasOneIdField,
  apitoMutationConnectHasManyIdsField,
  apitoConnectionFieldNameForRelation,
} from './apitoGraphqlNames';

type VectorRow = {
  input: string;
  singularResourceName: string;
  multipleResourceName: string;
  graphqlTypeName: string;
  graphqlTypeNamePlural: string;
};

const namingVectors = namingVectorsJson as VectorRow[];

describe('naming_vectors.json parity', () => {
  test.each(namingVectors.map((row) => [row.input, row] as const))(
    'resource %s',
    (input, row) => {
      expect(apitoSingularResourceName(input)).toBe(row.singularResourceName);
      expect(apitoMultipleResourceName(input)).toBe(row.multipleResourceName);
      expect(apitoModelName(input)).toBe(row.singularResourceName);
      expect(apitoSingularGraphQLTypeName(input)).toBe(row.graphqlTypeName);
      expect(apitoListGraphQLTypeName(input)).toBe(row.graphqlTypeNamePlural);
    }
  );
});

describe('Go SingularResourceName parity (no English singularize)', () => {
  test('singular vs plural legacy camel ids', () => {
    expect(apitoSingularResourceName('food')).toBe('food');
    expect(apitoMultipleResourceName('food')).toBe('foodList');
    expect(apitoSingularResourceName('foods')).toBe('foods');
    expect(apitoMultipleResourceName('foods')).toBe('foodsList');
  });
});

describe('canonicalizeModelName', () => {
  test('normalizes compound names', () => {
    expect(canonicalizeModelName('foodOrder')).toBe('food_order');
    expect(canonicalizeModelName('food_orders')).toBe('food_order');
  });
  test('rejects run-on', () => {
    expect(() => canonicalizeModelName('foodorder')).toThrow();
  });
});

describe('mutation connect / disconnect field names (stored model id + _id / _ids)', () => {
  test('has_one from camel relation id', () => {
    expect(apitoMutationConnectHasOneIdField('foodCategory')).toBe(
      'food_category_id'
    );
    expect(apitoMutationConnectHasOneIdField('food_category')).toBe(
      'food_category_id'
    );
  });
  test('has_many', () => {
    expect(apitoMutationConnectHasManyIdsField('foodOrder')).toBe(
      'food_order_ids'
    );
  });
  test('apitoStoredSnakeModelId matches filter snake segment', () => {
    expect(apitoStoredSnakeModelId('bankAccount')).toBe('bank_account');
  });
});

describe('filter / connection types (snake model id)', () => {
  test('bank_account-style resource', () => {
    expect(apitoConnectionFilterConditionType('bank_account')).toBe(
      'BANK_ACCOUNT_CONNECTION_FILTER_CONDITION'
    );
    expect(apitoWhereRelationFilterConditionType('bank_account')).toBe(
      'BANK_ACCOUNT_WHERE_RELATION_FILTER_CONDITION'
    );
    expect(apitoWhereInputType('bank_account')).toBe(
      'BANKACCOUNTLIST_INPUT_WHERE_PAYLOAD'
    );
    expect(apitoSortInputType('bank_account')).toBe(
      'BANKACCOUNTLIST_INPUT_SORT_PAYLOAD'
    );
    expect(apitoListKeyConditionType('bank_account')).toBe(
      'BANKACCOUNTLIST_KEY_CONDITION'
    );
    expect(apitoListCountKeyConditionType('bank_account')).toBe(
      'BANK_ACCOUNT_LIST_COUNT_KEY_CONDITION'
    );
    expect(apitoListCountWhereInputType('bank_account')).toBe(
      'BANK_ACCOUNT_LIST_COUNT_INPUT_WHERE_PAYLOAD'
    );
    expect(apitoListCountSortInputType('bank_account')).toBe(
      'BANK_ACCOUNT_LIST_COUNT_INPUT_SORT_PAYLOAD'
    );
  });

  test('food_order list vs list-count where types (avoid FOODORDERLIST_COUNT_*)', () => {
    expect(apitoWhereInputType('food_order')).toBe(
      'FOODORDERLIST_INPUT_WHERE_PAYLOAD'
    );
    expect(apitoListCountWhereInputType('food_order')).toBe(
      'FOOD_ORDER_LIST_COUNT_INPUT_WHERE_PAYLOAD'
    );
    expect(apitoListCountSortInputType('food_order')).toBe(
      'FOOD_ORDER_LIST_COUNT_INPUT_SORT_PAYLOAD'
    );
  });
});

describe('formatApitoConnectionSubselections', () => {
  test('normalizes legacy snake alias target to camelCase field', () => {
    const s = formatApitoConnectionSubselections(
      { foodCategory: 'id data { name }' },
      { foodCategory: 'food_category' }
    );
    expect(s).toContain('foodCategory {');
    expect(s).not.toContain('food_category');
  });

  test('collapses redundant alias when response key matches schema field', () => {
    const s = formatApitoConnectionSubselections(
      { foodCategory: 'id' },
      { foodCategory: 'foodCategory' }
    );
    expect(s.trim()).toBe('foodCategory { id }');
  });

  test('keeps distinct response key vs schema field', () => {
    const s = formatApitoConnectionSubselections(
      { cat: 'id' },
      { cat: 'foodCategory' }
    );
    expect(s.trim()).toBe('cat: foodCategory { id }');
  });

  test('normalizes connectionFields key without alias map', () => {
    const s = formatApitoConnectionSubselections({
      food_category: 'id',
    });
    expect(s.trim()).toBe('foodCategory { id }');
  });

  test('has_many connection field is model List not singular (food → foodList)', () => {
    expect(apitoConnectionFieldNameForRelation('food', 'has_many')).toBe('foodList');
    expect(apitoMultipleResourceName('food')).toBe('foodList');
    const wrongSingularKey = formatApitoConnectionSubselections({ food: 'id' });
    expect(wrongSingularKey.trim()).toBe('food { id }');
    const hasManyKey = formatApitoConnectionSubselections({ foodList: 'id' });
    expect(hasManyKey.trim()).toBe('foodList { id }');
  });
});

describe('buildApitoCreateMutation', () => {
  test('uses Food_Order_Create_Payload for food_order model', () => {
    const doc = buildApitoCreateMutation('food_order', ['name']);
    expect(doc).toContain('mutation CreateFoodOrder(');
    expect(doc).toContain('Food_Order_Create_Payload!');
    expect(doc).toContain('Food_Order_Relation_Connect_Payload');
    expect(doc).toContain('createFoodOrder(');
  });
});
