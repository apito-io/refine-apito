import { BaseRecord, DataProvider } from "@refinedev/core";
import { Client } from "@urql/core";

/**
 * Custom response type for the Apito data provider
 */
export type CustomResponse<TData = BaseRecord> = {
    data: TData;
};

/**
 * Extended data provider interface with Apito-specific methods
 */
export type ExtendedDataProvider = DataProvider & {
    /**
     * Returns the GraphQL client instance
     */
    getApiClient: () => Client;

    /**
     * Returns the current API token
     */
    getToken: () => string;

    /**
     * Returns the API URL
     */
    getApiUrl: () => string;
};

/**
 * Type for a single response item from Apito
 */
export type SingleResponseType = {
    id: string | undefined;
    data: any;
    meta?: {
        totalCount?: number;
        createdAt?: string;
        createdBy?: string;
    };
    total: number;
};

/**
 * Type for the response from Apito GraphQL API
 */
export type ResponseType = {
    [key: string]: SingleResponseType;
};

/**
 * Type for Apito GraphQL errors
 */
export type ApitoGraphQLError = {
    message: string;
    locations?: { line: number; column: number }[];
    path?: string[];
}; 