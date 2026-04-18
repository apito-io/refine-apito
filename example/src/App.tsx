import { Refine, GitHubBanner, WelcomePage } from '@refinedev/core';
import { DevtoolsPanel, DevtoolsProvider } from '@refinedev/devtools';
// import { RefineKbar, RefineKbarProvider } from '@refinedev/kbar'; // Not compatible with Refine v5

import { useNotificationProvider } from '@refinedev/antd';
import '@refinedev/antd/dist/reset.css';

import { apitoDataProvider } from '../../src';
import { App as AntdApp } from 'antd';
import { BrowserRouter, Route, Routes } from 'react-router';
import routerBindings, {
  UnsavedChangesNotifier,
  DocumentTitleHandler,
} from '@refinedev/react-router';
import { ColorModeContextProvider } from './contexts/color-mode';
import { authProvider } from './authProvider';
import ProductList from './pages/products';
import ProductCreate from './pages/products/create';

const APITO_API_URL = 'https://api.apito.io/secured/graphql';
const APITO_API_TOKEN = 'YOUR_API_TOKEN';

const apitoDataProviderInstance = apitoDataProvider(
  APITO_API_URL,
  APITO_API_TOKEN
);

function App() {
  return (
    <BrowserRouter>
      <GitHubBanner />
      {/* <RefineKbarProvider> */}
      <ColorModeContextProvider>
        <AntdApp>
          <DevtoolsProvider>
            <Refine
              dataProvider={{
                default: apitoDataProviderInstance,
              }}
              notificationProvider={useNotificationProvider}
              routerProvider={routerBindings}
              authProvider={authProvider}
              resources={[
                {
                  name: 'products',
                  list: '/products',
                  show: '/products/show/:id',
                  create: '/products/create',
                  edit: '/products/edit/:id',
                },
                {
                  name: 'categories',
                  list: '/categories',
                  show: '/categories/show/:id',
                  create: '/categories/create',
                  edit: '/categories/edit/:id',
                },
              ]}
              options={{
                syncWithLocation: true,
                warnWhenUnsavedChanges: true,
                projectId: '0olS4L-PR8cA6-eI99Wu',
              }}
            >
              <Routes>
                <Route index element={<WelcomePage />} />

                {/* Product routes */}
                <Route path="/products">
                  <Route index element={<ProductList />} />
                  <Route path="create" element={<ProductCreate />} />
                </Route>

                {/* Add more routes for other resources */}
              </Routes>
              {/* <RefineKbar /> */}
              <UnsavedChangesNotifier />
              <DocumentTitleHandler />
            </Refine>
            <DevtoolsPanel />
          </DevtoolsProvider>
        </AntdApp>
      </ColorModeContextProvider>
      {/* </RefineKbarProvider> */}
    </BrowserRouter>
  );
}

export default App;
