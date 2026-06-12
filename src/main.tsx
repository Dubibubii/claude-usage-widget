import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { reportError } from "./platform/native";
import "./styles.css";

// uncaught failures in a transparent overlay are invisible — always log them
window.addEventListener("error", (e) => reportError(`uncaught: ${e.message} @ ${e.filename}:${e.lineno}`));
window.addEventListener("unhandledrejection", (e) =>
  reportError(`unhandled rejection: ${String(e.reason)}`),
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
