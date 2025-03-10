/// <reference types="jest" />

import { apitoDataProvider } from '../src';

// Simple mock for the Client
jest.mock('@urql/core', () => {
    return {
        Client: jest.fn().mockImplementation(() => ({
            query: jest.fn().mockReturnValue({
                toPromise: jest.fn().mockResolvedValue({
                    data: {
                        productList: [{ id: '1' }],
                        productListCount: { total: 1 }
                    }
                })
            }),
            mutation: jest.fn().mockReturnValue({
                toPromise: jest.fn().mockResolvedValue({
                    data: { createProduct: { id: '1' } }
                })
            })
        })),
        CombinedError: jest.fn().mockImplementation(function (opts: any) {
            this.message = opts.graphQLErrors?.[0]?.message || 'Error';
        })
    };
});

describe('Apito Data Provider', () => {
    const apiUrl = 'https://api.apito.io/secured/graphql';
    const token = 'test-token';
    const tenant = false;
    const tokenKey = 'apito_token';

    const provider = apitoDataProvider(apiUrl, token, tenant, tokenKey);

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
}); 