import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

// Import styles
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

// Import components
import App from './App';

// Configure Apollo Client
const client = new ApolloClient({
  uri: 'http://localhost:8000/graphql',
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'network-only',
      nextFetchPolicy: 'cache-first'
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <MantineProvider defaultColorScheme="light">
        <Notifications position="top-right" />
        <App />
      </MantineProvider>
    </ApolloProvider>
  </React.StrictMode>
);