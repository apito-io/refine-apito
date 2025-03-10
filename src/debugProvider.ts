import apitoDataProvider from './provider';
import {
    BaseRecord,
    GetListParams,
    GetOneParams,
    CreateParams,
    CreateManyParams,
    UpdateParams,
    DeleteOneParams,
    CustomParams
} from "@refinedev/core";
import { ExtendedDataProvider } from './types';

/**
 * A debug version of the Apito data provider that logs all method calls and their parameters.
 * This makes it easier to debug when the library is imported into another project.
 */
const debugApitoDataProvider = (
    apiUrl: string,
    token: string
): ExtendedDataProvider => {
    // Get the original provider
    const provider = apitoDataProvider(apiUrl, token);

    // Create a wrapped version with logging
    return {
        ...provider,

        // Utility methods
        getApiUrl: () => {
            console.log('[Apito Debug] getApiUrl called');
            return provider.getApiUrl();
        },

        getApiClient: () => {
            console.log('[Apito Debug] getApiClient called');
            return provider.getApiClient();
        },

        getToken: () => {
            console.log('[Apito Debug] getToken called');
            return provider.getToken();
        },

        // Data provider methods
        getList: async <TData extends BaseRecord = BaseRecord>(params: GetListParams) => {
            console.log('[Apito Debug] getList called with params:', JSON.stringify(params, null, 2));
            try {
                const result = await provider.getList<TData>(params);
                console.log('[Apito Debug] getList result:', JSON.stringify({
                    total: result.total,
                    data: result.data.length > 0 ? `${result.data.length} items` : 'empty array'
                }, null, 2));
                return result;
            } catch (error) {
                console.error('[Apito Debug] getList error:', error);
                throw error;
            }
        },

        getOne: async <TData extends BaseRecord = BaseRecord>(params: GetOneParams) => {
            console.log('[Apito Debug] getOne called with params:', JSON.stringify(params, null, 2));
            try {
                const result = await provider.getOne<TData>(params);
                console.log('[Apito Debug] getOne result:', JSON.stringify({
                    id: result.data.id
                }, null, 2));
                return result;
            } catch (error) {
                console.error('[Apito Debug] getOne error:', error);
                throw error;
            }
        },

        create: async <TData extends BaseRecord = BaseRecord, TVariables = any>(params: CreateParams<TVariables>) => {
            console.log('[Apito Debug] create called with params:', JSON.stringify(params, null, 2));
            try {
                const result = await provider.create<TData, TVariables>(params);
                console.log('[Apito Debug] create result:', JSON.stringify({
                    id: result.data.id
                }, null, 2));
                return result;
            } catch (error) {
                console.error('[Apito Debug] create error:', error);
                throw error;
            }
        },

        createMany: async <TData extends BaseRecord = BaseRecord, TVariables = any>(
            params: CreateManyParams<TVariables>
        ): Promise<{ data: TData[] }> => {
            console.log('[Apito Debug] createMany called with params:', JSON.stringify(params, null, 2));
            try {
                // Use type assertion to tell TypeScript that createMany exists
                const createManyFn = provider.createMany as any;
                const result = await createManyFn(params);
                console.log('[Apito Debug] createMany result:', JSON.stringify({
                    count: Array.isArray(result.data) ? result.data.length : 0
                }, null, 2));
                return result as { data: TData[] };
            } catch (error) {
                console.error('[Apito Debug] createMany error:', error);
                throw error;
            }
        },

        update: async <TVariables = any>(params: UpdateParams<TVariables>) => {
            console.log('[Apito Debug] update called with params:', JSON.stringify(params, null, 2));
            try {
                const result = await provider.update(params);
                console.log('[Apito Debug] update result:', JSON.stringify(result, null, 2));
                return result as any;
            } catch (error) {
                console.error('[Apito Debug] update error:', error);
                throw error;
            }
        },

        deleteOne: async <TVariables = any>(params: DeleteOneParams<TVariables>) => {
            console.log('[Apito Debug] deleteOne called with params:', JSON.stringify(params, null, 2));
            try {
                const result = await provider.deleteOne(params);
                console.log('[Apito Debug] deleteOne result:', JSON.stringify(result, null, 2));
                return result as any;
            } catch (error) {
                console.error('[Apito Debug] deleteOne error:', error);
                throw error;
            }
        },

        custom: async (params: CustomParams<any, any>) => {
            console.log('[Apito Debug] custom called with params:', JSON.stringify(params, null, 2));
            try {
                // Use type assertion to tell TypeScript that custom exists
                const customFn = provider.custom as any;
                const result = await customFn(params);
                console.log('[Apito Debug] custom result:', JSON.stringify(result, null, 2));
                return result;
            } catch (error) {
                console.error('[Apito Debug] custom error:', error);
                throw error;
            }
        },
    };
};

export default debugApitoDataProvider; 