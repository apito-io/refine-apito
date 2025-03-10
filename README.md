# TSDX React User Guide

Congrats! You just saved yourself hours of work by bootstrapping this project with TSDX. Let's get you oriented with what's here and how to use it.

> This TSDX setup is meant for developing React component libraries (not apps!) that can be published to NPM. If you're looking to build a React-based app, you should use `create-react-app`, `razzle`, `nextjs`, `gatsby`, or `react-static`.

> If you're new to TypeScript and React, checkout [this handy cheatsheet](https://github.com/sw-yx/react-typescript-cheatsheet/)

## Commands

TSDX scaffolds your new library inside `/src`, and also sets up a [Parcel-based](https://parceljs.org) playground for it inside `/example`.

The recommended workflow is to run TSDX in one terminal:

```bash
npm start # or yarn start
```

This builds to `/dist` and runs the project in watch mode so any edits you save inside `src` causes a rebuild to `/dist`.

Then run the example inside another:

```bash
cd example
npm i # or yarn to install dependencies
npm start # or yarn start
```

The default example imports and live reloads whatever is in `/dist`, so if you are seeing an out of date component, make sure TSDX is running in watch mode like we recommend above. **No symlinking required**, we use [Parcel's aliasing](https://parceljs.org/module_resolution.html#aliases).

To do a one-off build, use `npm run build` or `yarn build`.

To run tests, use `npm test` or `yarn test`.

## Configuration

Code quality is set up for you with `prettier`, `husky`, and `lint-staged`. Adjust the respective fields in `package.json` accordingly.

### Jest

Jest tests are set up to run with `npm test` or `yarn test`.

### Bundle analysis

Calculates the real cost of your library using [size-limit](https://github.com/ai/size-limit) with `npm run size` and visulize it with `npm run analyze`.

#### Setup Files

This is the folder structure we set up for you:

```txt
/example
  index.html
  index.tsx       # test your component here in a demo app
  package.json
  tsconfig.json
/src
  index.tsx       # EDIT THIS
/test
  blah.test.tsx   # EDIT THIS
.gitignore
package.json
README.md         # EDIT THIS
tsconfig.json
```

#### React Testing Library

We do not set up `react-testing-library` for you yet, we welcome contributions and documentation on this.

### Rollup

TSDX uses [Rollup](https://rollupjs.org) as a bundler and generates multiple rollup configs for various module formats and build settings. See [Optimizations](#optimizations) for details.

### TypeScript

`tsconfig.json` is set up to interpret `dom` and `esnext` types, as well as `react` for `jsx`. Adjust according to your needs.

## Continuous Integration

### GitHub Actions

Two actions are added by default:

- `main` which installs deps w/ cache, lints, tests, and builds on all pushes against a Node and OS matrix
- `size` which comments cost comparison of your library on every pull request using [`size-limit`](https://github.com/ai/size-limit)

## Optimizations

Please see the main `tsdx` [optimizations docs](https://github.com/palmerhq/tsdx#optimizations). In particular, know that you can take advantage of development-only optimizations:

```js
// ./types/index.d.ts
declare var __DEV__: boolean;

// inside your code...
if (__DEV__) {
  console.log('foo');
}
```

You can also choose to install and use [invariant](https://github.com/palmerhq/tsdx#invariant) and [warning](https://github.com/palmerhq/tsdx#warning) functions.

## Module Formats

CJS, ESModules, and UMD module formats are supported.

The appropriate paths are configured in `package.json` and `dist/index.js` accordingly. Please report if any issues are found.

## Deploying the Example Playground

The Playground is just a simple [Parcel](https://parceljs.org) app, you can deploy it anywhere you would normally deploy that. Here are some guidelines for **manually** deploying with the Netlify CLI (`npm i -g netlify-cli`):

```bash
cd example # if not already in the example folder
npm run build # builds to dist
netlify deploy # deploy the dist folder
```

Alternatively, if you already have a git repo connected, you can set up continuous deployment with Netlify:

```bash
netlify init
# build command: yarn build && cd example && yarn && yarn build
# directory to deploy: example/dist
# pick yes for netlify.toml
```

## Named Exports

Per Palmer Group guidelines, [always use named exports.](https://github.com/palmerhq/typescript#exports) Code split inside your React app instead of your React library.

## Including Styles

There are many ways to ship styles, including with CSS-in-JS. TSDX has no opinion on this, configure how you like.

For vanilla CSS, you can include it at the root directory and add it to the `files` section in your `package.json`, so that it can be imported separately by your users and run through their bundler's loader.

## Publishing to NPM

We recommend using [np](https://github.com/sindresorhus/np).

## Usage with Lerna

When creating a new package with TSDX within a project set up with Lerna, you might encounter a `Cannot resolve dependency` error when trying to run the `example` project. To fix that you will need to make changes to the `package.json` file _inside the `example` directory_.

The problem is that due to the nature of how dependencies are installed in Lerna projects, the aliases in the example project's `package.json` might not point to the right place, as those dependencies might have been installed in the root of your Lerna project.

Change the `alias` to point to where those packages are actually installed. This depends on the directory structure of your Lerna project, so the actual path might be different from the diff below.

```diff
   "alias": {
-    "react": "../node_modules/react",
-    "react-dom": "../node_modules/react-dom"
+    "react": "../../../node_modules/react",
+    "react-dom": "../../../node_modules/react-dom"
   },
```

An alternative to fixing this problem would be to remove aliases altogether and define the dependencies referenced as aliases as dev dependencies instead. [However, that might cause other problems.](https://github.com/palmerhq/tsdx/issues/64)

# Refine Apito Data Provider

[![npm version](https://badge.fury.io/js/refine-apito.svg)](https://badge.fury.io/js/refine-apito)
[![npm](https://img.shields.io/npm/dt/refine-apito.svg)](https://www.npmjs.com/package/refine-apito)

A data provider for [Refine](https://refine.dev/) that connects to [Apito](https://apito.io/) - a headless CMS and backend builder.

## Features

- 🚀 Full support for all Refine data provider methods
- 🔄 Automatic GraphQL query generation for Apito
- 🔒 Authentication support
- 🛠️ Comprehensive error handling for GraphQL and network errors
- 📝 Support for custom GraphQL queries and mutations

## Installation

```bash
npm install refine-apito
# or
yarn add refine-apito
# or
pnpm add refine-apito
```

## Usage

```tsx
import { Refine } from '@refinedev/core';
import { dataProvider } from 'refine-apito';

const App = () => {
  return (
    <Refine
      dataProvider={dataProvider(
        'https://api.apito.io/secured/graphql', // Your Apito GraphQL endpoint
        'YOUR_API_TOKEN', // Your Apito API token
        false, // Whether to use tenant-based authentication
        'apito_token' // Local storage key for tenant token (if tenant is true)
      )}
      // ... other Refine configurations
    >
      {/* ... */}
    </Refine>
  );
};
```

## API Reference

### `dataProvider(apiUrl, token, tenant, tokenKey)`

Creates a data provider for Refine that connects to Apito.

#### Parameters

- `apiUrl` (string): The URL of your Apito GraphQL API endpoint.
- `token` (string): Your Apito API token for authentication.
- `tenant` (boolean): Whether to use tenant-based authentication. If true, the token will be retrieved from localStorage.
- `tokenKey` (string): The key to use for storing the token in localStorage when using tenant-based authentication.

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

### Custom GraphQL Queries

For more complex queries, you can provide your own GraphQL query:

```tsx
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

### Error Handling

The data provider includes comprehensive error handling for both GraphQL and network errors. All errors are converted to Refine's `HttpError` format for consistent error handling throughout your application.

## License

MIT
