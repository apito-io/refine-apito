/// <reference types="jest" />

import { apitoDataProvider } from '../src';
import { CombinedError } from '@urql/core';

// Mock the urql Client
jest.mock('@urql/core', () => {
    const originalModule = jest.requireActual('@urql/core');

    return {
        ...originalModule,
        Client: jest.fn().mockImplementation(() => ({
            query: jest.fn().mockReturnValue({
                toPromise: jest.fn().mockResolvedValue({
                    data: {
                        productList: [
                            {
                                id: '1',
                                data: { name: 'Test Product' },
                                meta: { created_at: '2023-01-01' }
                            }
                        ],
                        productListCount: { total: 1 }
                    }
                })
            }),
            mutation: jest.fn().mockReturnValue({
                toPromise: jest.fn().mockResolvedValue({
                    data: {
                        createProduct: {
                            id: '1',
                            data: { name: 'Test Product' },
                            meta: { created_at: '2023-01-01' }
                        }
                    }
                })
            })
        }))
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
        expect(typeof provider.getApiClient).toBe('function');
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

    it('should handle getList method', async () => {
        const result = await provider.getList({
            resource: 'product',
            pagination: { current: 1, pageSize: 10 },
            filters: [],
            sorters: []
        });

        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('total');
    });

    it('should handle error cases properly', async () => {
        // Mock the Client to return an error
        jest.spyOn(console, 'error').mockImplementation(() => { });

        const mockError = new CombinedError({
            graphQLErrors: [{ message: 'GraphQL Error' }]
        });

        const originalQuery = provider.getApiClient().query;
        provider.getApiClient().query = jest.fn().mockReturnValue({
            toPromise: jest.fn().mockResolvedValue({
                error: mockError
            })
        });

        try {
            await provider.getList({
                resource: 'product',
                pagination: { current: 1, pageSize: 10 },
                filters: [],
                sorters: []
            });
        } catch (error) {
            expect(error).toHaveProperty('statusCode', 400);
            expect(error).toHaveProperty('message', 'GraphQL Error');
        }

        // Restore the original implementation
        provider.getApiClient().query = originalQuery;
    });
}); 