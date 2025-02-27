import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ApolloClient, InMemoryCache, ApolloProvider, defaultDataIdFromObject } from "@apollo/client";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";

// Optimize Apollo Client with better caching strategy
const client = new ApolloClient({
  uri: "http://localhost:8000/graphql",
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          getInvoiceData: {
            // Merge strategy to improve caching behavior
            merge(existing = [], incoming) {
              return incoming;
            }
          },
          getUploadedFiles: {
            // Merge strategy to improve caching behavior
            merge(existing = [], incoming) {
              return incoming;
            }
          }
        }
      },
      InvoiceSummary: {
        // Stable ID generation for cache items
        keyFields: ["planType", "month", "year"]
      }
    }
  }),
  defaultOptions: {
    watchQuery: {
      // Use cache-and-network for initial query, then cache-first for subsequent
      fetchPolicy: 'cache-and-network',
      nextFetchPolicy: 'cache-first',
    },
    query: {
      fetchPolicy: 'cache-first',
    }
  },
});

// Create theme once and reuse it
const theme = createTheme({
  palette: {
    mode: "light",
    // Customize theme colors as needed
  },
  // Improve performance by reducing render depth
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true
      }
    }
  }
});

// Get the root element once
const rootElement = document.getElementById("root");

// Render the app
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ApolloProvider client={client}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </ApolloProvider>
    </React.StrictMode>
  );
}