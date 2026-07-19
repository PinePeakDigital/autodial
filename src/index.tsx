import React from "react";
import ReactDOM from "react-dom";
import * as Sentry from "@sentry/react";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import {redactToken} from "./lib/redactToken";
import {QueryClient, QueryClientProvider} from "react-query";

// No-op unless a DSN is configured (REACT_APP_SENTRY_DSN build var).
if (process.env.REACT_APP_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    // After the Beeminder OAuth redirect the token sits in the URL bar, which
    // Sentry copies onto every event; scrub it before anything is sent.
    beforeSend(event) {
      if (event.request?.url) {
        event.request.url = redactToken(event.request.url);
      }
      event.breadcrumbs?.forEach((b) => {
        if (b.data?.url) b.data.url = redactToken(b.data.url);
      });
      return event;
    },
  });
}

const queryClient = new QueryClient();

ReactDOM.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
    document.getElementById("root"),
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
