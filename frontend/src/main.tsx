import React from "react";
import ReactDOM from "react-dom/client";
import { ApolloClient, InMemoryCache, ApolloProvider, defaultDataIdFromObject } from "@apollo/client";
import { MantineProvider } from "@mantine/core";

import "@mantine/core/styles.css";
import App from "./App";

// Configure Apollo Client with optimized caching strategy
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        getInvoiceData: {
          // Merge function to ensure proper cache updates
          merge(existing = [], incoming) {
            return incoming;
          }
        },
        getUploadedFiles: {
          // Merge function to ensure proper cache updates
          merge(existing = [], incoming) {
            return incoming;
          }
        }
      }
    }
  },
  // Custom dataIdFromObject to ensure proper caching
  dataIdFromObject(object) {
    switch (object.__typename) {
      case 'InvoiceSummary':
        // Create unique ID for invoice summary items
        return `${object.__typename}:${object.planType}:${object.month}:${object.year}`;
      case 'UploadedFile':
        return `${object.__typename}:${object.planName}`;
      default:
        return defaultDataIdFromObject(object);
    }
  }
});

// Configure Apollo Client with optimized settings
const client = new ApolloClient({
  uri: "http://localhost:8000/graphql",
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      nextFetchPolicy: 'cache-first',
      // Reduce network usage by batching queries
      notifyOnNetworkStatusChange: true,
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
  connectToDevTools: process.env.NODE_ENV === 'development',
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <MantineProvider>
        <App />
      </MantineProvider>
    </ApolloProvider>
  </React.StrictMode>
);