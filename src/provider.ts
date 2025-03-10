import {
  BaseRecord,
  CreateManyParams,
  CreateManyResponse,
  CreateParams,
  CreateResponse,
  CustomParams,
  DataProvider,
  GetListParams,
  GetListResponse,
  GetOneParams,
  GetOneResponse,
  HttpError,
} from "@refinedev/core";
import { Client, CombinedError, fetchExchange, gql } from "@urql/core";
import pluralize from "pluralize";

/*
Apito Typical Graphql Error Response:
{
  "data": {
    "deleteTestLabel": null
  },
  "errors": [
    {
      "message": "there are 1 relations that are using this document, please delete them first",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": [
        "deleteTestLabel"
      ]
    }
  ]
}
*/

/*
Apito Typical Graphql Success Response:
{
  "data": {
    "testLabelList": [
      {
        "data": {
          "description": {
            "text": null
          },
          "measure_unit": "mmol/l",
          "name": "Corres. Urine Sugar",
          "reference_range": "<7.8 mmol/l"
        },
        "id": "1ac785e3-a190-44a5-bc36-d858df8a3868",
        "meta": {
          "created_at": "2025-03-10T08:10:55Z",
          "status": true,
          "updated_at": "2025-03-10T08:10:55Z"
        }
      },
      {
        "data": {
          "description": {
            "text": null
          },
          "measure_unit": "mmol/l",
          "name": "P Glucose (F)",
          "reference_range": "3.6-5.6 mmol/l"
        },
        "id": "0c7e3a18-765c-4fed-a091-768578804fdc",
        "meta": {
          "created_at": "2025-03-10T08:10:05Z",
          "status": true,
          "updated_at": "2025-03-10T08:10:05Z"
        }
      },
      {
        "data": {
          "description": {
            "text": null
          },
          "measure_unit": "mmol/L",
          "name": "T4",
          "reference_range": "3.6-5.6 mmol/L"
        },
        "id": "13123014-8bb7-4850-9699-8eb4f0607305",
        "meta": {
          "created_at": "2025-02-17T13:32:56Z",
          "status": true,
          "updated_at": "2025-02-17T13:32:56Z"
        }
      },
      {
        "data": {
          "description": {
            "text": null
          },
          "measure_unit": "mg/dl",
          "name": "S. Creatinine",
          "reference_range": "0.6-1.2 mg/dl"
        },
        "id": "c9c9c9c9-c9c9-c9c9-c9c9-c9c9c9c9c9c9",
        "meta": {
          "created_at": "2025-02-17T13:32:56Z",
          "status": true,
          "updated_at": "2025-02-17T13:32:56Z"
        }
      }
    ],
    "testLabelListCount": {
      "total": 4
    }
  }
}
*/

export type CustomResponse<TData = BaseRecord> = {
  data: TData;
};

export type ExtendedDataProvider = DataProvider & {
  getApiClient: () => Client;
  getToken: () => string;
};

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

type ResponseType = {
  [key: string]: SingleResponseType;
};

/**
 * Type for Apito GraphQL errors
 */
type ApitoGraphQLError = {
  message: string;
  locations?: { line: number; column: number }[];
  path?: string[];
};

/**
 * Handles GraphQL errors from Apito responses
 * @param error The error object from urql client
 * @returns An HttpError object with appropriate status code and message
 */
const handleGraphQLError = (error: CombinedError | undefined): HttpError => {
  if (!error) {
    return {
      message: 'Unknown error occurred',
      statusCode: 500,
    };
  }

  // Handle network errors
  if (error.networkError) {
    return {
      message: `Network error: ${error.networkError.message}`,
      statusCode: 503, // Service Unavailable
    };
  }

  // Handle GraphQL errors
  if (error.graphQLErrors && error.graphQLErrors.length > 0) {
    const errorMessages = error.graphQLErrors.map(err => err.message).join(', ');
    return {
      message: errorMessages,
      statusCode: 400, // Bad Request for GraphQL validation errors
    };
  }

  // Fallback error
  return {
    message: error.message || 'An error occurred during the GraphQL operation',
    statusCode: 400,
  };
};

const apitoDataProvider = (
  apiUrl: string,
  token: string,
  tenant: boolean,
  tokenKey: string
): ExtendedDataProvider => {
  const client = new Client({
    url: apiUrl,
    exchanges: [fetchExchange],
    fetchOptions: () => ({ headers: { Authorization: `Bearer ${token}` } }),
  });

  return {
    getApiUrl: () => apiUrl,
    getApiClient: () => {
      if (tenant) {
        token = localStorage.getItem(tokenKey) ?? "not-set";
      }
      return new Client({
        url: apiUrl,
        exchanges: [fetchExchange],
        fetchOptions: () => ({ headers: { Authorization: `Bearer ${token}` } }),
      });
    },
    getToken: () => token,
    async getList<TData extends BaseRecord = BaseRecord>(
      params: GetListParams
    ): Promise<GetListResponse<TData>> {
      try {
        const { resource, filters, sorters, pagination, meta } = params;
        const connectionFields = meta?.connectionFields || {};
        const reverseLookup = meta?.reverseLookup || {};

        let data: TData[] = [];
        let total = 0;

        let query = null;
        let variables = null;
        if (meta?.gqlQuery) {
          query = meta.gqlQuery;
          variables = meta.variables;
          const queryKey = meta.queryKey || resource;
          const response = await client
            .query<ResponseType>(query, variables)
            .toPromise();

          if (response.error) {
            return Promise.reject(handleGraphQLError(response.error));
          }

          const queryResponse = response?.data?.[queryKey];
          const responseData = (Array.isArray(queryResponse) ? queryResponse as unknown as TData[] : []) as TData[];
          const responseTotal = responseData.length ?? 0;

          return {
            data: responseData,
            total: responseTotal,
          };
        } else {
          const fields = meta?.fields || ["id"]; // Fallback to 'id' if fields are not provided
          const pluralResource =
            pluralize.plural(resource).charAt(0).toUpperCase() +
            pluralize.plural(resource).slice(1);
          query = gql`
              query Get${pluralResource}(
              $_key: ${resource.toUpperCase()}LIST_KEY_CONDITION
              $connection: ${resource.toUpperCase()}_CONNECTION_FILTER_CONDITION
              $where: ${resource.toUpperCase()}LIST_INPUT_WHERE_PAYLOAD
              $_keyCount: ${resource.toUpperCase()}LIST_COUNT_KEY_CONDITION
              $whereCount: ${resource.toUpperCase()}LIST_COUNT_INPUT_WHERE_PAYLOAD
              $sort: ${resource.toUpperCase()}LIST_INPUT_SORT_PAYLOAD
              $page: Int
              $limit: Int
              $local: LOCAL_TYPE_ENUM
          ) {
              ${resource}List(connection: $connection _key: $_key where: $where, sort: $sort, page: $page, limit: $limit, local: $local) {
                  id
                  data {
                      ${fields.join("\n")}
                  }
                  ${Object.keys(connectionFields).map((key) => `${key} { ${connectionFields[key]} }`).join("\n")}
                  meta {
                      created_at
                      status
                      updated_at
                  }
                  }
              }
              ${resource}ListCount(connection: $connection _key: $_keyCount where: $whereCount, page: $page, limit: $limit) {
                  total
              }
          }`;

          // _key filter
          let _key = null;

          // Transform filters into a `where` object
          const where = filters?.reduce(
            (acc: Record<string, any>, filter: any) => {
              const { field, operator, value } = filter;
              if (field === '_key') {
                _key = { [operator || "eq"]: value };
                return acc;
              }
              if (operator && value !== undefined) {
                // Adjust `data.name` to `name`
                const adjustedField = field.startsWith("data.")
                  ? field.replace("data.", "")
                  : field;
                acc[adjustedField] = { [operator || "eq"]: value };
              }
              return acc;
            },
            {}
          );

          // Transform sorters into a `sort` object
          const sort = sorters?.reduce(
            (acc: Record<string, any>, sorter: any) => {
              const { field, order } = sorter;
              if (field && order) {
                acc[field] = order.toUpperCase(); // Convert to ASC/DESC
              }
              return acc;
            },
            {}
          );

          variables = {
            connection: reverseLookup || {},
            _key: _key || {},
            where: where || {},
            whereCount: where || {},
            sort: sort || {},
            page: pagination?.current,
            limit: pagination?.pageSize,
          };

          const response = await client
            .query<ResponseType>(query, variables)
            .toPromise();

          if (response.error) {
            return Promise.reject(handleGraphQLError(response.error));
          }

          data = (response?.data?.[`${resource}List`] ?? []) as unknown as TData[];
          total = ('total' in (response?.data?.[`${resource}ListCount`] || {})
            ? (response?.data?.[`${resource}ListCount`] as SingleResponseType).total
            : 0);
        }

        return {
          data: data,
          total: total,
        };
      } catch (error) {
        if ((error as any).statusCode !== undefined) {
          return Promise.reject(error);
        }

        const httpError: HttpError = {
          message: (error as Error)?.message || "Failed to fetch list data",
          statusCode: 500,
        };
        return Promise.reject(httpError);
      }
    },

    async getOne<TData extends BaseRecord = BaseRecord>(
      params: GetOneParams
    ): Promise<GetOneResponse<TData>> {
      try {
        const { resource, id, meta } = params;
        const fields = meta?.fields || ["id"]; // Fallback to 'id' if fields are not provided
        const connectionFields = meta?.connectionFields || {};
        const singularResource = pluralize.singular(resource);
        const query = gql`
                query Get${singularResource.charAt(0).toUpperCase() + singularResource.slice(1)}($id: String!) {
                    ${singularResource}(_id: $id) {
                        id
                        data {
                            ${fields.join("\n")}
                        }
                        ${Object.keys(connectionFields).map((key) => `${key} { ${connectionFields[key]} }`).join("\n")}
                        meta {
                            created_at
                            status
                            updated_at
                        }
                    }
                }
            `;

        const response = await client
          .query<ResponseType>(query, { id })
          .toPromise();

        if (response.error) {
          return Promise.reject(handleGraphQLError(response.error));
        }

        const data = (response?.data?.[singularResource] ?? {}) as TData;

        return {
          data: data,
        };
      } catch (error) {
        if ((error as any).statusCode !== undefined) {
          return Promise.reject(error);
        }

        const httpError: HttpError = {
          message: (error as Error)?.message || `Failed to fetch ${params.resource} with id ${params.id}`,
          statusCode: 500,
        };
        return Promise.reject(httpError);
      }
    },

    async create<TData extends BaseRecord = BaseRecord, TVariables = any>(
      params: CreateParams<TVariables>
    ): Promise<CreateResponse<TData>> {
      try {
        const { resource, variables, meta } = params;
        const singularResource = pluralize.singular(resource);
        const fields = meta?.fields || ["id"]; // Fallback to 'id' if fields are not provided
        const name =
          singularResource.charAt(0).toUpperCase() + singularResource.slice(1);

        const query = gql`
                mutation Create${name}($payload: ${name}_Create_Payload!, $connect: ${name}_Relation_Connect_Payload) {
                    create${name}(payload: $payload, connect: $connect, status: published) {
                        id
                        data {
                            ${fields.join("\n")}
                        }
                        meta {
                            created_at
                            status
                            updated_at
                        }
                    }
                }
            `;

        const variableData = variables as Record<string, any>;

        const response = await client
          .mutation<ResponseType>(query, {
            payload: variableData.data,
            connect: variableData.connect,
          })
          .toPromise();

        if (response.error) {
          return Promise.reject(handleGraphQLError(response.error));
        }

        const data = (response?.data?.[`create${name}`] ?? {}) as TData;
        return { data: data };
      } catch (error) {
        if ((error as any).statusCode !== undefined) {
          return Promise.reject(error);
        }

        const httpError: HttpError = {
          message: (error as Error)?.message || `Failed to create ${params.resource}`,
          statusCode: 500,
        };
        return Promise.reject(httpError);
      }
    },

    async createMany<TData extends BaseRecord = BaseRecord, TVariables = any>(
      params: CreateManyParams<TVariables>
    ): Promise<CreateManyResponse<TData>> {
      try {
        const { resource, variables, meta } = params;
        const singularResource = pluralize.singular(resource);
        const fields = meta?.fields || ["id"]; // Fallback to 'id' if fields are not provided
        const name =
          singularResource.charAt(0).toUpperCase() + singularResource.slice(1);

        const mutation = gql`
                mutation Create${name}List($payloads: [${name}List_Create_Payload!]!, $connect: ${name}_Relation_Connect_Payload) {
                    create${name}List(payloads: $payloads, connect: $connect, status: published) {
                        id
                        data {
                            ${fields.join("\n")}
                        }
                        meta {
                            created_at
                            status
                            updated_at
                        }
                    }
                }
            `;

        const variableData = variables as Record<string, any>;

        const response = await client
          .mutation<ResponseType>(mutation, {
            payloads: variableData,
            //connect: variableData.connect,
          })
          .toPromise();

        if (response.error) {
          return Promise.reject(handleGraphQLError(response.error));
        }

        const data = (response?.data?.[`create${name}List`] ?? []) as unknown as TData[];
        return { data: data };
      } catch (error) {
        if ((error as any).statusCode !== undefined) {
          return Promise.reject(error);
        }

        const httpError: HttpError = {
          message: (error as Error)?.message || `Failed to create multiple ${params.resource} records`,
          statusCode: 500,
        };
        return Promise.reject(httpError);
      }
    },

    async update({ resource, id, variables, meta }) {
      try {
        let query = null;
        let _variables = null;
        if (meta?.gqlMutation) {
          query = meta.gqlMutation;
          if (variables) {
            _variables = variables;
          } else {
            _variables = meta.variables;
          }
          const response = await client
            .mutation<ResponseType>(query, _variables)
            .toPromise();

          if (response.error) {
            return Promise.reject(handleGraphQLError(response.error));
          }

          return {
            data:
              (response?.data?.[
                `update${resource.charAt(0).toUpperCase() + resource.slice(1)}`
              ] as SingleResponseType)?.data ?? {},
          };
        } else {
          const fields = meta?.fields || ["id"]; // Fallback to 'id' if fields are not provided
          const singularResource = pluralize.singular(resource);
          const name =
            singularResource.charAt(0).toUpperCase() + singularResource.slice(1);
          query = gql`
                    mutation Update${name}(
                        $id: String!, 
                        $payload: ${name}_Update_Payload!, 
                        $connect: ${name}_Relation_Connect_Payload,
                        $disconnect: ${name}_Relation_Disconnect_Payload
                    ) {
                        update${name}(_id: $id, payload: $payload, connect: $connect, disconnect: $disconnect, status: published) {
                            id
                            data {
                                ${fields.join("\n")}
                            }
                            meta {
                                created_at
                                status
                                updated_at
                            }
                        }
                    }
                `;
          _variables = {
            id: id,
            payload: (variables as Record<string, any>).data,
            connect: (variables as Record<string, any>).connect,
            disconnect: (variables as Record<string, any>).disconnect,
          };
          const response = await client
            .mutation<ResponseType>(query, _variables)
            .toPromise();

          if (response.error) {
            return Promise.reject(handleGraphQLError(response.error));
          }

          return {
            data:
              (response?.data?.[
                `update${resource.charAt(0).toUpperCase() + resource.slice(1)}`
              ] as SingleResponseType)?.data ?? {},
          };
        }
      } catch (error) {
        if ((error as any).statusCode !== undefined) {
          return Promise.reject(error);
        }

        const httpError: HttpError = {
          message: (error as Error)?.message || `Failed to update ${resource} with id ${id}`,
          statusCode: 500,
        };
        return Promise.reject(httpError);
      }
    },

    async deleteOne({ resource, id }) {
      try {
        const singularResource = pluralize.singular(resource);
        const name =
          singularResource.charAt(0).toUpperCase() + singularResource.slice(1);

        const query = gql`
                mutation Delete${name}($ids: [String]!) {
                    delete${name}(_ids: $ids) {
                        response
                    }
                }
            `;

        const response = await client
          .mutation<ResponseType>(query, { ids: [id] })
          .toPromise();

        // Check for GraphQL errors in the response
        if (response.error) {
          return Promise.reject(handleGraphQLError(response.error));
        }

        // Check for errors in the data response (Apito specific error format)
        if (response.data?.errors && Array.isArray(response.data.errors)) {
          const errorMessages = (response.data.errors as ApitoGraphQLError[])
            .map(err => err.message)
            .join(", ");

          const httpError: HttpError = {
            message: errorMessages,
            statusCode: 400,
          };
          return Promise.reject(httpError);
        }

        return {
          data:
            (response?.data?.[
              `delete${resource.charAt(0).toUpperCase() + resource.slice(1)}`
            ] as SingleResponseType)?.data ?? {},
        };
      } catch (error) {
        if ((error as any).statusCode !== undefined) {
          return Promise.reject(error);
        }

        const httpError: HttpError = {
          message: (error as Error)?.message || `Failed to delete ${resource} with id ${id}`,
          statusCode: 500,
        };
        return Promise.reject(httpError);
      }
    },

    async custom<TData extends BaseRecord = BaseRecord>(params: CustomParams<any, any>): Promise<CustomResponse<TData>> {
      try {
        const query = params?.meta?.query;
        if (!query) {
          const httpError: HttpError = {
            message: 'Query is required for custom operation',
            statusCode: 400,
          };
          return Promise.reject(httpError);
        }

        const { filters } = params;
        // Transform filters into a `where` object
        const where = filters?.reduce(
          (acc: Record<string, any>, filter: any) => {
            const { field, operator, value } = filter;
            if (operator && value !== undefined) {
              // Adjust `data.name` to `name`
              const adjustedField = field.startsWith("data.")
                ? field.replace("data.", "")
                : field;
              acc[adjustedField] = { [operator || "eq"]: value };
            }
            return acc;
          },
          {}
        );

        const variables = {
          where: where || {},
          //whereCount: where || {},
          //sort: sort || {},
          //page: pagination?.current,
          //limit: pagination?.pageSize,
        };

        const response = await client
          .query<ResponseType>(query, variables)
          .toPromise();

        if (response.error) {
          return Promise.reject(handleGraphQLError(response.error));
        }

        // Check for errors in the data response (Apito specific error format)
        if (response.data?.errors && Array.isArray(response.data.errors)) {
          const errorMessages = (response.data.errors as ApitoGraphQLError[])
            .map(err => err.message)
            .join(", ");

          const httpError: HttpError = {
            message: errorMessages,
            statusCode: 400,
          };
          return Promise.reject(httpError);
        }

        return {
          data: response?.data as TData,
        };
      } catch (error) {
        if ((error as any).statusCode !== undefined) {
          return Promise.reject(error);
        }

        const httpError: HttpError = {
          message: (error as Error)?.message || 'Failed to execute custom operation',
          statusCode: 500,
        };
        return Promise.reject(httpError);
      }
    },
  };
};

export default apitoDataProvider;
