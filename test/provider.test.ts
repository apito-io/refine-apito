/// <reference types="jest" />

import { apitoDataProvider } from '../src';

const mutationMock = jest.fn().mockReturnValue({
    toPromise: jest.fn().mockResolvedValue({
        data: { upsertFoodCategoryList: [] },
    }),
});

jest.mock('@urql/core', () => {
    return {
        Client: jest.fn().mockImplementation(() => ({
            query: jest.fn().mockReturnValue({
                toPromise: jest.fn().mockResolvedValue({
                    data: {
                        productList: [{ id: '1' }],
                        productListCount: { total: 1 },
                    },
                }),
            }),
            mutation: (...args: unknown[]) => mutationMock(...args),
        })),
        gql: jest.requireActual('@urql/core').gql,
        CombinedError: jest.fn().mockImplementation(function (this: Error, opts: { graphQLErrors?: { message: string }[] }) {
            this.message = opts.graphQLErrors?.[0]?.message || 'Error';
        }),
    };
});

describe('Apito Data Provider', () => {
    const apiUrl = 'https://api.apito.io/secured/graphql';
    const token = 'test-token';
    const provider = apitoDataProvider(apiUrl, token);

    it('should initialize with correct parameters', () => {
        expect(provider.getApiUrl()).toBe(apiUrl);
        expect(provider.getToken()).toBe(token);
    });

    it('should implement all required data provider methods', () => {
        expect(typeof provider.getList).toBe('function');
        expect(typeof provider.getOne).toBe('function');
        expect(typeof provider.create).toBe('function');
        expect(typeof provider.createMany).toBe('function');
        expect(typeof provider.update).toBe('function');
        expect(typeof provider.deleteOne).toBe('function');
        expect(typeof provider.custom).toBe('function');
    });

    it('createMany upsert uses Relation_Connect_Payload for $connect', async () => {
        mutationMock.mockClear();
        await provider.createMany!({
            resource: 'foodCategory',
            variables: [{ _id: '01KRQK3FG2H9Y5RD21N68A41D5', name: 'Desart' }],
            meta: { fields: ['name'] },
        });

        const [mutationDoc] = mutationMock.mock.calls[0] as [
            { loc?: { source: { body: string } } },
        ];
        const mutationText = mutationDoc?.loc?.source?.body ?? '';

        expect(mutationText).toContain('Food_Category_Relation_Connect_Payload');
        expect(mutationText).not.toContain('Food_Category_List_Connect');
    });
});
