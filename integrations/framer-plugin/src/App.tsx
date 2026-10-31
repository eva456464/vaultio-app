import type { ManagedCollection } from "framer-plugin";
import { useState, type FormEvent } from "react";
import { checkConnection, normalizeApiBase } from "./api";
import { BRAND_NAME, DEFAULT_API_BASE } from "./brand";
import { DATA, syncArticles, type Connection, type Progress, type SyncResult } from "./sync";

type Props = { collection: ManagedCollection; initial: Connection | null; onDone: (result: SyncResult) => void };

export function App({ collection, initial, onDone }: Props) {
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? "");
  const [apiBase, setApiBase] = useState(initial?.apiBase ?? DEFAULT_API_BASE);
  const [showAddress, setShowAddress] = useState(!DEFAULT_API_BASE || (initial ? initial.apiBase !== DEFAULT_API_BASE : false));
  const [progress, setProgress] = useState<Progress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const connection = { apiKey: apiKey.trim(), apiBase: normalizeApiBase(apiBase) };
    if (!connection.apiKey) return setError("Paste your API key.");
    if (!connection.apiBase) return setError("Enter the API address.");
    setBusy(true);
    setError(null);
    try {
      await checkConnection(connection.apiBase, connection.apiKey);
      await collection.setPluginData(DATA.apiKey, connection.apiKey);
      await collection.setPluginData(DATA.apiBase, connection.apiBase);
      onDone(await syncArticles(collection, connection, setProgress));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The import failed.");
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <main className="panel">
      <header>
        <h1>{BRAND_NAME}</h1>
        <p>Imports your published articles into the “{collection.name}” collection. Run it again (or press Sync in the CMS) to bring in new ones.</p>
      </header>
      <form onSubmit={submit}>
        <label>
          <span>API key</span>
          <input type="password" autoComplete="off" value={apiKey} disabled={busy} onChange={(event) => setApiKey(event.target.value)} placeholder="Paste the key from Settings → Publishing → Framer" />
        </label>
        {showAddress ? (
          <label>
            <span>API address</span>
            <input value={apiBase} disabled={busy} onChange={(event) => setApiBase(event.target.value)} placeholder="https://app.example.com/api/integrations" />
          </label>
        ) : (
          <button type="button" className="link" onClick={() => setShowAddress(true)}>
            Use a different API address
          </button>
        )}
        {error && <p className="error">{error}</p>}
        <button type="submit" className="framer-button-primary" disabled={busy}>
          {progress ? `Importing ${progress.done} of ${progress.total}…` : busy ? "Connecting…" : "Import articles"}
        </button>
      </form>
    </main>
  );
}
