import {
  BaseRecord,
  CreateManyParams,
  CreateManyResponse,
  CreateParams,
  CreateResponse,
  CustomParams,
  GetListParams,
  GetListResponse,
  GetOneParams,
  GetOneResponse,
  HttpError,
} from '@refinedev/core';
import { Client, CombinedError, fetchExchange, gql } from '@urql/core';
import pluralize from 'pluralize';
import {
  ApitoGraphQLError,
  CustomResponse,
  ExtendedDataProvider,
  ResponseType,
  SingleResponseType,
} from './types';

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

/**
 * Handles GraphQL errors from Apito responses
 * @param error The error object from urql client
 * @param onTokenExpired Optional callback for handling 403 token expiration
 * @returns An HttpError object with appropriate status code and message
 */
const handleGraphQLError = (
  error: CombinedError | undefined,
  onTokenExpired?: () => void
): HttpError => {
  if (!error) {
    return {
      message: 'Unknown error occurred',
      statusCode: 500,
    };
  }

  // Handle network errors
  if (error.networkError) {
    // Check for 403 status in network error
    const statusCode =
      (error.networkError as any).statusCode ||
      (error.networkError as any).status;
    if (statusCode === 403 || statusCode === 401) {
      console.log('Token expired (403/401), triggering logout...');
      onTokenExpired?.();
      return {
        message: 'Token expired. Please login again.',
        statusCode: 403,
      };
    }

    return {
      message: `Network error: ${error.networkError.message}`,
      statusCode: statusCode || 503, // Service Unavailable
    };
  }

  // Handle GraphQL errors
  if (error.graphQLErrors && error.graphQLErrors.length > 0) {
    // Check for authentication/authorization errors in GraphQL errors
    const hasAuthError = error.graphQLErrors.some(
      (err) =>
        err.message.toLowerCase().includes('unauthorized') ||
        err.message.toLowerCase().includes('forbidden') ||
        err.message.toLowerCase().includes('token') ||
        err.message.toLowerCase().includes('authentication') ||
        err.message.toLowerCase().includes('authorization')
    );

    if (hasAuthError) {
      console.log(
        'Authentication error detected in GraphQL, triggering logout...'
      );
      onTokenExpired?.();
      return {
        message: 'Authentication failed. Please login again.',
        statusCode: 403,
      };
    }

    const errorMessages = error.graphQLErrors
      .map((err) => err.message)
      .join(', ');
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

/**
 * Helper function to generate connection field string with alias support
 * @param connectionFields The connection fields mapping
 * @param aliasFields The alias fields mapping
 * @returns A formatted string for GraphQL query connection fields
 */
const generateConnectionFields = (
  connectionFields: Record<string, string>,
  aliasFields: Record<string, string>
) => {
  return Object.keys(connectionFields)
    .map((key) => {
      // Check if this key is defined as an alias in aliasFields
      if (aliasFields[key]) {
        // Generate alias syntax: alias: actualField { ... }
        return `${key}: ${aliasFields[key]} { ${connectionFields[key]} }`;
      } else {
        // Generate normal syntax: field { ... }
        return `${key} { ${connectionFields[key]} }`;
      }
    })
    .join('\n');
};

const apitoDataProvider = (
  apiUrl: string,
  token: string,
  onTokenExpired?: () => void
): ExtendedDataProvider => {
  const client = new Client({
    url: apiUrl,
    exchanges: [fetchExchange],
    fetchOptions: () => ({ headers: { Authorization: `Bearer ${token}` } }),
  });

  return {
    getApiUrl: () => apiUrl,
    getApiClient: () => {
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
        const aliasFields = meta?.aliasFields || {};
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
            return Promise.reject(
              handleGraphQLError(response.error, onTokenExpired)
            );
          }

          const queryResponse = response?.data?.[queryKey];
          const responseData = (
            Array.isArray(queryResponse)
              ? (queryResponse as unknown as TData[])
              : []
          ) as TData[];
          const responseTotal = responseData.length ?? 0;

          return {
            data: responseData,
            total: responseTotal,
          };
        } else {
          const fields = meta?.fields || ['id']; // Fallback to 'id' if fields are not provided
          const pluralResource =
            pluralize.plural(resource).charAt(0).toUpperCase() +
            pluralize.plural(resource).slice(1);

          // Helper function to process filters recursively
          const processFilter = (filter: any): any => {
            const { field, operator, value } = filter;

            // Handle special case where operator is "eq" and value is an array
            if (operator === 'eq' && Array.isArray(value)) {
              // Create a nested object structure for this case
              const nestedCondition: Record<string, any> = {};
              value.forEach((condition) => {
                const {
                  field: subField,
                  operator: subOperator,
                  value: subValue,
                } = condition;
                if (subField && subOperator && subValue !== undefined) {
                  if (!nestedCondition[subField]) {
                    nestedCondition[subField] = {};
                  }
                  nestedCondition[subField][subOperator] = subValue;
                }
              });
              return { [field]: nestedCondition };
            }

            // Handle OR operation
            if (operator === 'or' && Array.isArray(value)) {
              const orConditions: Record<string, any> = {};
              value.forEach((condition) => {
                const { field, operator, value } = condition;
                if (field && operator && value !== undefined) {
                  // Adjust `data.name` to `name`
                  const adjustedField = field.startsWith('data.')
                    ? field.replace('data.', '')
                    : field;
                  orConditions[adjustedField] = { [operator]: value };
                }
              });
              return { OR: orConditions };
            }

            // Handle AND operation
            if (operator === 'and' && Array.isArray(value)) {
              const andConditions: Record<string, any> = {};
              value.forEach((condition) => {
                const { field, operator, value } = condition;
                if (field && operator && value !== undefined) {
                  // Adjust `data.name` to `name`
                  const adjustedField = field.startsWith('data.')
                    ? field.replace('data.', '')
                    : field;
                  andConditions[adjustedField] = { [operator]: value };
                }
              });
              return { AND: andConditions };
            }

            // Handle regular field filters
            if (field === '_key') {
              return { _key: { [operator || 'eq']: value } };
            }

            if (field && field.includes('relation.')) {
              const relationPath = field.replace('relation.', '').split('.');
              const relationCondition: Record<string, any> = {};

              // Build nested object structure
              let current: Record<string, any> = relationCondition;
              for (let i = 0; i < relationPath.length - 1; i++) {
                const part = relationPath[i];
                if (!current[part]) {
                  current[part] = {};
                }
                current = current[part];
              }

              const lastPart = relationPath[relationPath.length - 1];
              if (operator && value !== undefined) {
                current[lastPart] = { [operator]: value };
              }

              return { relation: relationCondition };
            }

            if (operator && value !== undefined) {
              // Adjust `data.name` to `name`
              const adjustedField = field.startsWith('data.')
                ? field.replace('data.', '')
                : field;
              return { [adjustedField]: { [operator]: value } };
            }

            return {};
          };

          // Process filters
          let _key = null;
          let relationWhere: Record<string, any> | null = null;
          let where: Record<string, any> = {};

          if (filters && filters.length > 0) {
            filters.forEach((filter) => {
              const processed = processFilter(filter);

              // Extract _key if present
              if (processed._key) {
                _key = processed._key;
              }
              // Extract relation if present
              else if (processed.relation) {
                if (!relationWhere) {
                  relationWhere = {};
                }
                Object.assign(relationWhere, processed.relation);
              }
              // Handle OR/AND conditions
              else if (processed.OR) {
                where.OR = processed.OR;
              } else if (processed.AND) {
                where.AND = processed.AND;
              }
              // Handle regular conditions
              else {
                Object.assign(where, processed);
              }
            });
          }

          const hasKey = _key !== null;
          const hasRelationWhere = relationWhere !== null;

          const queryVariables = [
            hasKey
              ? `$_key: ${resource.toUpperCase()}LIST_KEY_CONDITION`
              : null,
            `$connection: ${resource.toUpperCase()}_CONNECTION_FILTER_CONDITION`,
            `$where: ${resource.toUpperCase()}LIST_INPUT_WHERE_PAYLOAD`,
            hasRelationWhere
              ? `$relationWhere: ${resource.toUpperCase()}_WHERE_RELATION_FILTER_CONDITION`
              : null,
            hasKey
              ? `$_keyCount: ${resource.toUpperCase()}LIST_COUNT_KEY_CONDITION`
              : null,
            `$whereCount: ${resource.toUpperCase()}LIST_COUNT_INPUT_WHERE_PAYLOAD`,
            hasRelationWhere
              ? `$relationWhereCount: ${resource.toUpperCase()}_WHERE_RELATION_FILTER_CONDITION`
              : null,
            `$sort: ${resource.toUpperCase()}LIST_INPUT_SORT_PAYLOAD`,
            `$page: Int`,
            `$limit: Int`,
            `$local: LOCAL_TYPE_ENUM`,
          ]
            .filter(Boolean)
            .join('\n');

          const queryArguments = [
            hasKey ? '_key: $_key' : null,
            'connection: $connection',
            'where: $where',
            hasRelationWhere ? 'relation: $relationWhere' : null,
            'sort: $sort',
            'page: $page',
            'limit: $limit',
            'local: $local',
          ]
            .filter(Boolean)
            .join(', ');

          const countArguments = [
            hasKey ? '_key: $_keyCount' : null,
            'connection: $connection',
            'where: $whereCount',
            hasRelationWhere ? 'relation: $relationWhereCount' : null,
            'page: $page',
            'limit: $limit',
          ]
            .filter(Boolean)
            .join(', ');

          query = gql`
                        query Get${pluralResource}(
                            ${queryVariables}
                        ) {
                            ${resource}List(${queryArguments}) {
                                id
                                data {
                                    ${fields.join('\n')}
                                }
                                ${generateConnectionFields(connectionFields, aliasFields)}
                                meta {
                                    created_at
                                    status
                                    updated_at
                                }
                            }
                            ${resource}ListCount(${countArguments}) {
                                total
                            }
                        }
                    `;

          variables = {
            ...(hasKey && { _key: _key }),
            connection: reverseLookup || {},
            where: where || {},
            ...(hasRelationWhere && { relationWhere: relationWhere }),
            whereCount: where || {},
            ...(hasKey && { _keyCount: _key }),
            ...(hasRelationWhere && { relationWhereCount: relationWhere }),
            sort: sorters?.reduce((acc: Record<string, any>, sorter: any) => {
              const { field, order } = sorter;
              if (field && order) {
                acc[field] = order.toUpperCase(); // Convert to ASC/DESC
              }
              return acc;
            }, {}),
            page:
              (pagination as any)?.current || (pagination as any)?.page || 1,
            limit:
              (pagination as any)?.pageSize || (pagination as any)?.size || 10,
          };

          const response = await client
            .query<ResponseType>(query, variables)
            .toPromise();

          if (response.error) {
            return Promise.reject(
              handleGraphQLError(response.error, onTokenExpired)
            );
          }

          data = (response?.data?.[`${resource}List`] ??
            []) as unknown as TData[];
          total =
            'total' in (response?.data?.[`${resource}ListCount`] || {})
              ? (response?.data?.[`${resource}ListCount`] as SingleResponseType)
                  .total
              : 0;
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
          message: (error as Error)?.message || 'Failed to fetch list data',
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
        const fields = meta?.fields || ['id']; // Fallback to 'id' if fields are not provided
        const connectionFields = meta?.connectionFields || {};
        const aliasFields = meta?.aliasFields || {};
        const singularResource = pluralize.singular(resource);
        const query = gql`
                  query Get${singularResource.charAt(0).toUpperCase() + singularResource.slice(1)}($id: String!) {
                      ${singularResource}(_id: $id) {
                          id
                          data {
                              ${fields.join('\n')}
                          }
                          ${generateConnectionFields(connectionFields, aliasFields)}
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
          return Promise.reject(
            handleGraphQLError(response.error, onTokenExpired)
          );
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
          message:
            (error as Error)?.message ||
            `Failed to fetch ${params.resource} with id ${params.id}`,
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
              (
                response?.data?.[
                  `create${resource.charAt(0).toUpperCase() + resource.slice(1)}`
                ] as SingleResponseType
              )?.data ?? {},
          };
        } else {
          try {
            const { resource, variables, meta } = params;
            const singularResource = pluralize.singular(resource);
            const fields = meta?.fields || ['id']; // Fallback to 'id' if fields are not provided
            const name =
              singularResource.charAt(0).toUpperCase() +
              singularResource.slice(1);

            const query = gql`
                  mutation Create${name}($payload: ${name}_Create_Payload!, $connect: ${name}_Relation_Connect_Payload) {
                      create${name}(payload: $payload, connect: $connect, status: published) {
                          id
                          data {
                              ${fields.join('\n')}
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
              return Promise.reject(
                handleGraphQLError(response.error, onTokenExpired)
              );
            }

            const data = (response?.data?.[`create${name}`] ?? {}) as TData;
            return { data: data };
          } catch (error) {
            if ((error as any).statusCode !== undefined) {
              return Promise.reject(error);
            }

            const httpError: HttpError = {
              message:
                (error as Error)?.message ||
                `Failed to create ${params.resource}`,
              statusCode: 500,
            };
            return Promise.reject(httpError);
          }
        }
      } catch (error) {
        if ((error as any).statusCode !== undefined) {
          return Promise.reject(error);
        }

        const httpError: HttpError = {
          message:
            (error as Error)?.message || `Failed to create ${params.resource}`,
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
        const fields = meta?.fields || ['id']; // Fallback to 'id' if fields are not provided
        const name =
          singularResource.charAt(0).toUpperCase() + singularResource.slice(1);

        const mutation = gql`
                  mutation Upsert${name}List($payloads: [${name}List_Upsert_Payload!]!, $connect: ${name}_Relation_Connect_Payload) {
                      upsert${name}List(payloads: $payloads, connect: $connect, status: published) {
                          id
                          data {
                              ${fields.join('\n')}
                          }
                          meta {
                              created_at
                              status
                              updated_at
                          }
                      }
                  }
              `;

        // Clean up the array by filtering out empty objects, null, or undefined values
        const variableData = Array.isArray(variables)
          ? (variables as any[]).filter(
              (item) =>
                item !== null &&
                item !== undefined &&
                (typeof item !== 'object' || Object.keys(item).length > 0)
            )
          : (variables as Record<string, any>);

        const response = await client
          .mutation<ResponseType>(mutation, {
            payloads: variableData,
            //connect: variableData.connect,
          })
          .toPromise();

        if (response.error) {
          return Promise.reject(
            handleGraphQLError(response.error, onTokenExpired)
          );
        }

        const data = (response?.data?.[`upsert${name}List`] ??
          []) as unknown as TData[];
        return { data: data };
      } catch (error) {
        if ((error as any).statusCode !== undefined) {
          return Promise.reject(error);
        }

        const httpError: HttpError = {
          message:
            (error as Error)?.message ||
            `Failed to create multiple ${params.resource} records`,
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
              (
                response?.data?.[
                  `update${resource.charAt(0).toUpperCase() + resource.slice(1)}`
                ] as SingleResponseType
              )?.data ?? {},
          };
        } else {
          const fields = meta?.fields || ['id']; // Fallback to 'id' if fields are not provided
          const deltaUpdate = meta?.deltaUpdate || false;
          const singularResource = pluralize.singular(resource);
          const name =
            singularResource.charAt(0).toUpperCase() +
            singularResource.slice(1);
          query = gql`
                      mutation Update${name}(
                          $id: String!,
                          $deltaUpdate: Boolean,
                          $payload: ${name}_Update_Payload!, 
                          $connect: ${name}_Relation_Connect_Payload,
                          $disconnect: ${name}_Relation_Disconnect_Payload
                      ) {
                          update${name}(_id: $id, deltaUpdate: $deltaUpdate, payload: $payload, connect: $connect, disconnect: $disconnect, status: published) {
                              id
                              data {
                                  ${fields.join('\n')}
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
            deltaUpdate: deltaUpdate,
            payload: (variables as Record<string, any>).data,
            connect: (variables as Record<string, any>).connect,
            disconnect: (variables as Record<string, any>).disconnect,
          };
          const response = await client
            .mutation<ResponseType>(query, _variables)
            .toPromise();

          if (response.error) {
            return Promise.reject(
              handleGraphQLError(response.error, onTokenExpired)
            );
          }

          return {
            data:
              (
                response?.data?.[
                  `update${resource.charAt(0).toUpperCase() + resource.slice(1)}`
                ] as SingleResponseType
              )?.data ?? {},
          };
        }
      } catch (error) {
        if ((error as any).statusCode !== undefined) {
          return Promise.reject(error);
        }

        const httpError: HttpError = {
          message:
            (error as Error)?.message ||
            `Failed to update ${resource} with id ${id}`,
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
          return Promise.reject(
            handleGraphQLError(response.error, onTokenExpired)
          );
        }

        // Check for errors in the data response (Apito specific error format)
        if (response.data?.errors && Array.isArray(response.data.errors)) {
          const errorMessages = (response.data.errors as ApitoGraphQLError[])
            .map((err) => err.message)
            .join(', ');

          const httpError: HttpError = {
            message: errorMessages,
            statusCode: 400,
          };
          return Promise.reject(httpError);
        }

        return {
          data:
            (
              response?.data?.[
                `delete${resource.charAt(0).toUpperCase() + resource.slice(1)}`
              ] as SingleResponseType
            )?.data ?? {},
        };
      } catch (error) {
        if ((error as any).statusCode !== undefined) {
          return Promise.reject(error);
        }

        const httpError: HttpError = {
          message:
            (error as Error)?.message ||
            `Failed to delete ${resource} with id ${id}`,
          statusCode: 500,
        };
        return Promise.reject(httpError);
      }
    },

    async custom<TData extends BaseRecord = BaseRecord>(
      params: CustomParams<any, any>
    ): Promise<CustomResponse<TData>> {
      try {
        const query = params?.meta?.gqlQuery;
        const mutation = params?.meta?.gqlMutation;
        let variables = params?.meta?.gqlVariables;

        if (query && mutation) {
          const httpError: HttpError = {
            message:
              'Query and mutation cannot both be provided for custom operation',
            statusCode: 400,
          };
          return Promise.reject(httpError);
        }

        if (!query && !mutation) {
          const httpError: HttpError = {
            message: 'Query or mutation is required for custom operation',
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
              const adjustedField = field.startsWith('data.')
                ? field.replace('data.', '')
                : field;
              acc[adjustedField] = { [operator || 'eq']: value };
            }
            return acc;
          },
          {}
        );

        if (where) {
          variables = {
            ...variables,
            where: where || {},
          };
        }

        // Convert payloads object with numeric keys to array
        if (
          variables?.payloads &&
          typeof variables.payloads === 'object' &&
          !Array.isArray(variables.payloads)
        ) {
          variables = {
            ...variables,
            payloads: Object.values(variables.payloads),
          };
        }

        //debugger;

        let response = null;
        if (query) {
          response = await client
            .query<ResponseType>(query, variables)
            .toPromise();
        } else {
          response = await client
            .mutation<ResponseType>(mutation, variables)
            .toPromise();
        }

        //debugger;

        if (response.error) {
          return Promise.reject(
            handleGraphQLError(response.error, onTokenExpired)
          );
        }

        // Check for errors in the data response (Apito specific error format)
        if (response.data?.errors && Array.isArray(response.data.errors)) {
          const errorMessages = (response.data.errors as ApitoGraphQLError[])
            .map((err) => err.message)
            .join(', ');

          const httpError: HttpError = {
            message: errorMessages,
            statusCode: 400,
          };
          return Promise.reject(httpError);
        }

        //debugger;

        return {
          data: response?.data as TData,
        };
      } catch (error) {
        if ((error as any).statusCode !== undefined) {
          return Promise.reject(error);
        }

        const httpError: HttpError = {
          message:
            (error as Error)?.message || 'Failed to execute custom operation',
          statusCode: 500,
        };
        return Promise.reject(httpError);
      }
    },
  };
};

export default apitoDataProvider;
