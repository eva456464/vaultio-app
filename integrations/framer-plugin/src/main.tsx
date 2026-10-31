import "framer-plugin/framer.css";
import "./App.css";

import { framer } from "framer-plugin";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { storedConnection, syncArticles } from "./sync";

const summary = (result: { added: number; updated: number; removed: number }) =>
  result.added || result.updated || result.removed ? `Articles imported: ${result.added} new, ${result.updated} updated, ${result.removed} removed` : "Articles are up to date";

async function start() {
  const collection = await framer.getActiveManagedCollection();

  // "Sync" from Framer's CMS: run without a panel when the plugin is already set up.
  if (framer.mode === "syncManagedCollection") {
    const connection = await storedConnection(collection);
    if (connection) {
      try {
        const result = await syncArticles(collection, connection);
        framer.closePlugin(summary(result), { variant: "success" });
      } catch (error) {
        framer.notify(error instanceof Error ? error.message : "The import failed", { variant: "error" });
        // Falls through to the panel so the key or address can be fixed.
      }
    }
  }

  const root = document.getElementById("root");
  if (!root) throw new Error("Root element not found");
  const connection = await storedConnection(collection);
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App collection={collection} initial={connection} onDone={(result) => framer.closePlugin(summary(result), { variant: "success" })} />
    </React.StrictMode>,
  );
  await framer.showUI({ width: 300, height: connection ? 330 : 390, resizable: false });
}

start().catch((error: unknown) => {
  framer.closePlugin(error instanceof Error ? error.message : "The plugin couldn't start", { variant: "error" });
});

