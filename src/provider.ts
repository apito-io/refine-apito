import {
  BaseRecord,
  CreateParams,
  CreateResponse,
  DataProvider,
  GetListParams,
  GetListResponse,
  GetOneParams,
  GetOneResponse,
  HttpError,
} from "@refinedev/core";
import { Client, fetchExchange, gql } from "@urql/core";
import pluralize from "pluralize";

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

const apitoDataProvider = (
  apiUrl: string,
  token: string,
  tenant: boolean
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
        token = localStorage.getItem(TOKEN_KEY) ?? "not-set";
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
      const { resource, filters, sorters, pagination, meta } = params;
      const connectionFields = meta?.connectionFields || {};

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

        const data = (response?.data?.[queryKey] ?? []) as TData[];
        const total = data.length ?? 0;

        return {
          data: data,
          total: total,
        };
      } else {
        const fields = meta?.fields || ["id"]; // Fallback to 'id' if fields are not provided
        const pluralResource =
          pluralize.plural(resource).charAt(0).toUpperCase() +
          pluralize.plural(resource).slice(1);
        query = gql`
                    query Get${pluralResource}(
                    $where: ${resource.toUpperCase()}LIST_INPUT_WHERE_PAYLOAD
                    $whereCount: ${resource.toUpperCase()}LIST_COUNT_INPUT_WHERE_PAYLOAD
                    $sort: ${resource.toUpperCase()}LIST_INPUT_SORT_PAYLOAD
                    $page: Int
                    $limit: Int
                    $local: LOCAL_TYPE_ENUM
                ) {
                    ${resource}List(where: $where, sort: $sort, page: $page, limit: $limit, local: $local) {
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
                    ${resource}ListCount(where: $whereCount, page: $page, limit: $limit) {
                        total
                    }
                }
                `;

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

        const variables = {
          where: where || {},
          whereCount: where || {},
          sort: sort || {},
          page: pagination?.current,
          limit: pagination?.pageSize,
        };

        const response = await client
          .query<ResponseType>(query, variables)
          .toPromise();

        data = (response?.data?.[`${resource}List`] ?? []) as TData[];
        total = response?.data?.[`${resource}ListCount`]?.total ?? 0;
      }

      return {
        data: data,
        total: total,
      };
    },

    async getOne<TData extends BaseRecord = BaseRecord>(
      params: GetOneParams
    ): Promise<GetOneResponse<TData>> {
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
      const data = (response?.data?.[singularResource] ?? {}) as TData;

      return {
        data: data,
      };
    },

    async create<TData extends BaseRecord = BaseRecord, TVariables = any>(
      params: CreateParams<TVariables>
    ): Promise<CreateResponse<TData>> {
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
      const data = (response?.data?.[`create${name}`] ?? {}) as TData;
      return { data: data };
    },

    async update({ resource, id, variables, meta }) {
      try {
        let query = null;
        let _variables = null;
        if (meta?.gqlMutation) {
          query = meta.gqlMutation;
          _variables = meta.variables;
          const response = await client
            .mutation<ResponseType>(query, _variables)
            .toPromise();
          if (response.error) {
            const error: HttpError = {
              message: response.error.message,
              statusCode: response.error.status,
            };
            return Promise.reject(error);
          }
          return {
            data:
              response?.data?.[
                `update${resource.charAt(0).toUpperCase() + resource.slice(1)}`
              ]?.data ?? {},
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
            const error: HttpError = {
              message: response.error.message,
              statusCode: response.error.status,
            };
            return Promise.reject(error);
          }
          return {
            data:
              response?.data?.[
                `update${resource.charAt(0).toUpperCase() + resource.slice(1)}`
              ]?.data ?? {},
          };
        }
      } catch (error) {
        const _error: HttpError = {
          message: error?.message || "Something went wrong",
          statusCode: error?.status || 500,
        };
        return Promise.reject(_error);
      }
    },

    async deleteOne({ resource, id }) {
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
      return {
        data:
          response?.data?.[
            `delete${resource.charAt(0).toUpperCase() + resource.slice(1)}`
          ]?.data ?? {},
      };
    },
  };
};

export default apitoDataProvider;
