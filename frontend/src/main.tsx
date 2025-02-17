import React from "react";
import ReactDOM from "react-dom/client";
import { ApolloClient, InMemoryCache, ApolloProvider } from "@apollo/client";
import { MantineProvider } from "@mantine/core";

import "@mantine/core/styles.css";
import App from "./App";

const client = new ApolloClient({
  uri: "http://localhost:8000/graphql",
  cache: new InMemoryCache(),
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
