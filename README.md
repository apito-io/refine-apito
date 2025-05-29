# Refine Apito Data Provider

[![npm version](https://badge.fury.io/js/refine-apito.svg)](https://badge.fury.io/js/refine-apito)
[![npm](https://img.shields.io/npm/dt/refine-apito.svg)](https://www.npmjs.com/package/refine-apito)

A data provider for [Refine](https://refine.dev/) that connects to [Apito](https://apito.io/) - An API builder with Serverless Functions

## Features

- 🚀 Full support for all Refine data provider methods
- 🔄 Automatic GraphQL query generation for Apito
- 🔒 Authentication support
- 🛠️ Comprehensive error handling for GraphQL and network errors
- 📝 Support for custom GraphQL queries and mutations
- 🐞 Debug mode for easier troubleshooting
- 🧩 Well-organized code with separate type definitions for better debugging

## Installation

```bash
npm install refine-apito
# or
yarn add refine-apito
# or
pnpm add refine-apito
```

## Usage

### Basic Setup

```tsx
import { Refine } from '@refinedev/core';
import { apitoDataProvider } from 'refine-apito';

const App = () => {
  return (
    <Refine
      dataProvider={apitoDataProvider(
        'https://api.apito.io/secured/graphql', // Your Apito GraphQL endpoint
        'YOUR_API_TOKEN' // Your Apito API token
      )}
      // ... other Refine configurations
    >
      {/* ... */}
    </Refine>
  );
};
```

### Debug Mode

For easier debugging, you can use the debug version of the data provider which logs all method calls and their parameters:

```tsx
import { Refine } from '@refinedev/core';
import { debugApitoDataProvider } from 'refine-apito';

const App = () => {
  return (
    <Refine
      dataProvider={debugApitoDataProvider(
        'https://api.apito.io/secured/graphql',
        'YOUR_API_TOKEN'
      )}
      // ... other Refine configurations
    >
      {/* ... */}
    </Refine>
  );
};
```

This will log detailed information about each data provider method call to the console, making it easier to debug issues.

### Tenant-Based Authentication

If you're using tenant-based authentication, set the third parameter to `true`:

```tsx
dataProvider={apitoDataProvider(
  "https://api.apito.io/secured/graphql",
  "INITIAL_TOKEN" // Your Apito API token
)}
```

## API Reference

### `apitoDataProvider(apiUrl, token)`

Creates a data provider for Refine that connects to Apito.

#### Parameters

- `apiUrl` (string): The URL of your Apito GraphQL API endpoint.
- `token` (string): Your Apito API token for authentication.

#### Returns

A Refine data provider object with the following methods:

- `getList`: Fetches a list of resources with pagination, sorting, and filtering.
- `getOne`: Fetches a single resource by ID.
- `create`: Creates a new resource.
- `createMany`: Creates multiple resources at once.
- `update`: Updates an existing resource.
- `deleteOne`: Deletes a resource by ID.
- `custom`: Executes a custom GraphQL query.

### Additional Methods

The data provider also includes these utility methods:

- `getApiClient()`: Returns the GraphQL client instance.
- `getToken()`: Returns the current API token.
- `getApiUrl()`: Returns the API URL.

## Advanced Usage

### Custom Fields

You can specify which fields to include in the response by providing a `fields` array in the `meta` parameter:

```tsx
const { data } = useList({
  resource: 'products',
  meta: {
    fields: ['name', 'price', 'description', 'category'],
  },
});
```

### Connection Fields

For related data, you can specify connection fields:

```tsx
const { data } = useList({
  resource: 'products',
  meta: {
    fields: ['name', 'price'],
    connectionFields: {
      category: 'id name',
      tags: 'id name slug',
    },
  },
});
```

### Custom GraphQL Queries

For more complex queries, you can provide your own GraphQL query:

```tsx
import { gql } from '@urql/core';

const { data } = useList({
  resource: 'products',
  meta: {
    gqlQuery: gql`
      query GetProducts($where: PRODUCTS_INPUT_WHERE_PAYLOAD) {
        productsList(where: $where) {
          id
          data {
            name
            price
            category
          }
          meta {
            created_at
          }
        }
        productsListCount {
          total
        }
      }
    `,
    variables: {
      where: { category: { eq: 'electronics' } },
    },
    queryKey: 'productsList',
  },
});
```

### Filtering

Apito supports various filter operators:

```tsx
const { data } = useList({
  resource: 'products',
  filters: [
    {
      field: 'name',
      operator: 'contains',
      value: 'phone',
    },
    {
      field: 'price',
      operator: 'gt',
      value: 100,
    },
  ],
});
```

### Sorting

```tsx
const { data } = useList({
  resource: 'products',
  sorters: [
    {
      field: 'price',
      order: 'desc',
    },
  ],
});
```

### Pagination

```tsx
const { data } = useList({
  resource: 'products',
  pagination: {
    current: 1,
    pageSize: 10,
  },
});
```

### Error Handling

The data provider includes comprehensive error handling for both GraphQL and network errors. All errors are converted to Refine's `HttpError` format for consistent error handling throughout your application.

### Code Organization for Debugging

The library is organized to make debugging easier:

- **types.ts**: Contains all TypeScript type definitions
- **provider.ts**: Contains the main data provider implementation
- **debug-provider.ts**: Contains a debug version with console logs
- **index.tsx**: Exports everything for external use

This separation makes it easier to navigate the code and set breakpoints when debugging.

### Alias Fields

You can also use GraphQL aliases for connection fields by providing `aliasFields` alongside `connectionFields`. This is useful when you want to query the same field with different names or create aliases that point to other fields:

```tsx
const { data } = useList({
  resource: 'orders',
  meta: {
    fields: ['id', 'total', 'status'],
    aliasFields: {
      waiter: 'employee',
    },
    connectionFields: {
      foodList: 'id data { name price }',
      customer: 'id data { name }',
      employee: 'id data { full_name }',
      waiter: 'id data { full_name }',
    },
  },
});
```

This will generate a GraphQL query like:

```graphql
{
  orderList {
    id
    data {
      id
      total
      status
    }
    foodList {
      id
      data {
        name
        price
      }
    }
    customer {
      id
      data {
        name
      }
    }
    employee {
      id
      data {
        full_name
      }
    }
    waiter: employee {
      id
      data {
        full_name
      }
    }
  }
}
```

In this example:

- `waiter` is defined as an alias that points to the `employee` field
- The `waiter` connection field specification from `connectionFields` is used for the alias
- This allows you to get the same employee data under two different names in your response

## Contributing & Development

### Local Development

To develop this package locally:

```bash
# Install dependencies
pnpm install

# Start development mode
pnpm start

# Test
pnpm test

# Build the package
pnpm build

# Check bundle size
pnpm size
```

### Releasing New Versions

This package uses GitHub Actions for automated releases. To release a new version:

1. Update the version in `package.json`
2. Commit your changes
3. Create and push a new tag:

```bash
git tag v0.1.2  # Use appropriate version
git push origin v0.1.2
```

The GitHub workflow will automatically:

- Build the package
- Publish to npm
- Create a GitHub release

Alternatively, you can use the release script:

```bash
./release.sh 0.1.2  # Replace with your desired version
# Or with a custom commit message:
./release.sh 0.1.2 "feat: add improved error handling"
```

## License

MIT
