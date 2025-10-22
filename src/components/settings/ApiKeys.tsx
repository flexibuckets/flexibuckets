"use client"
import type React from "react"
import { useEffect, useState } from "react"
import { ApiKeyModal } from "./api-key-modal"
import { RevokeConfirmationDialog } from "./revoke-confirmation-dialog"

type ApiKeyItem = {
  id: string
  name: string
  createdAt: string
  lastUsedAt?: string | null
}

type ConfirmationAction = "revoke" | "regenerate" | null

export default function ApiKeys({ session }: { session: any }) {
  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)
  const [createdKeyName, setCreatedKeyName] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmationAction>(null)
  const [confirmKeyId, setConfirmKeyId] = useState<string | null>(null)
  const [confirmKeyName, setConfirmKeyName] = useState<string>("")
  const [confirmLoading, setConfirmLoading] = useState(false)

  // use the app/api route
  const apiBase = "/api/api-keys"

  function sanitizeErrorBody(body: string) {
    if (!body) return "Unknown server error"
    const lower = body.slice(0, 200).toLowerCase()
    if (lower.includes("<html") || lower.includes("<!doctype") || lower.includes("<script")) {
      return "Unexpected server response (HTML). See console for details."
    }
    return body.length > 300 ? body.slice(0, 300) + "…" : body
  }

  // returns string message, or null when the response should be treated as "no keys / nothing to show"
  async function getErrorMessage(res: Response): Promise<string | null> {
    // treat 404 as "no API endpoint / no keys" -> graceful exit without console error
    if (res.status === 404) return null
    try {
      const text = await res.text()
      try {
        const json = JSON.parse(text)
        if (json?.error) return String(json.error)
        if (json?.message) return String(json.message)
      } catch {
        /* not json */
      }
      console.error("API error response text:", text)
      return sanitizeErrorBody(text)
    } catch (err) {
      console.error("Failed reading error response:", err)
      return "Network error"
    }
  }

  async function fetchKeys() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiBase, { cache: "no-store" })
      if (!res.ok) {
        const msg = await getErrorMessage(res)
        // if msg is null treat as empty list (graceful)
        if (msg === null) {
          setKeys([])
          return
        }
        throw new Error(msg)
      }
      const data = await res.json()
      setKeys(Array.isArray(data) ? data : [])
    } catch (err: any) {
      // suppress console noise for the "no keys" case already handled above
      console.error("Failed to load API keys:", err)
      setError(String(err.message ?? "Failed to load API keys"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKeys()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createKey(e?: React.FormEvent) {
    e?.preventDefault()
    if (!newName.trim()) {
      setError("Enter a name for the key")
      return
    }
    setCreating(true)
    setError(null)
    setCreatedSecret(null)
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      })
      if (!res.ok) {
        const msg = await getErrorMessage(res)
        // if endpoint missing, show friendly message
        throw new Error(msg ?? "API endpoint not found")
      }
      const data = await res.json()
      if (data?.keyObject) {
        setKeys((s) => [data.keyObject, ...s])
      }
      setCreatedSecret(data?.key ?? null)
      setCreatedKeyName(newName)
      setModalOpen(true)
      setNewName("")
    } catch (err: any) {
      console.error("Failed to create API key:", err)
      setError(String(err.message ?? "Failed to create API key"))
    } finally {
      setCreating(false)
    }
  }

  async function revokeKey(id: string) {
    const key = keys.find((k) => k.id === id)
    setConfirmKeyId(id)
    setConfirmKeyName(key?.name || "")
    setConfirmAction("revoke")
    setConfirmDialogOpen(true)
  }

  async function regenerateKey(id: string) {
    const key = keys.find((k) => k.id === id)
    setConfirmKeyId(id)
    setConfirmKeyName(key?.name || "")
    setConfirmAction("regenerate")
    setConfirmDialogOpen(true)
  }

  async function handleConfirmAction() {
    if (!confirmKeyId || !confirmAction) return

    setConfirmLoading(true)
    setError(null)

    try {
      const endpoint =
        confirmAction === "revoke" ? `${apiBase}/${confirmKeyId}` : `${apiBase}/${confirmKeyId}/regenerate`

      const method = confirmAction === "revoke" ? "DELETE" : "POST"

      const res = await fetch(endpoint, { method })

      if (!res.ok) {
        const msg = await getErrorMessage(res)
        if (msg === null) {
          setKeys((s) => s.filter((k) => k.id !== confirmKeyId))
          setConfirmDialogOpen(false)
          return
        }
        throw new Error(msg)
      }

      if (confirmAction === "revoke") {
        setKeys((s) => s.filter((k) => k.id !== confirmKeyId))
      } else {
        const data = await res.json()
        if (data?.keyObject) {
          setKeys((s) => s.map((k) => (k.id === confirmKeyId ? data.keyObject : k)))
        }
        setCreatedSecret(data?.key ?? null)
        setCreatedKeyName(data?.keyObject?.name ?? "Regenerated Key")
        setModalOpen(true)
      }

      setConfirmDialogOpen(false)
    } catch (err: any) {
      console.error(`Failed to ${confirmAction} key:`, err)
      setError(String(err.message ?? `Failed to ${confirmAction} key`))
    } finally {
      setConfirmLoading(false)
    }
  }

  return (
    <div className="bg-card dark:bg-card shadow rounded p-4">
      <ApiKeyModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        keyName={createdKeyName || ""}
        secret={createdSecret || ""}
      />

      <RevokeConfirmationDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        action={confirmAction}
        keyName={confirmKeyName}
        onConfirm={handleConfirmAction}
        isLoading={confirmLoading}
      />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">API Keys</h2>
        <p className="text-sm text-muted-foreground">Manage your personal API keys</p>
      </div>

      <form onSubmit={createKey} className="grid grid-cols-1 sm:flex sm:items-center gap-2 mb-4">
        <input
          className="flex-1 border rounded px-3 py-2 bg-transparent focus:outline-none"
          placeholder="Name this key (e.g. script, integration)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          disabled={creating}
        />
        <button
          type="submit"
          className="ml-0 sm:ml-2 inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded"
          disabled={creating}
        >
          {creating ? "Creating..." : "Create Key"}
        </button>
      </form>

      {error && <div className="text-sm text-destructive mb-2">{error}</div>}

      <div>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading keys…</div>
        ) : keys.length === 0 ? (
          <div className="text-sm text-muted-foreground">No API keys yet.</div>
        ) : (
          <ul className="space-y-3">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between border rounded p-3">
                <div>
                  <div className="font-medium">{k.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Created {new Date(k.createdAt).toLocaleString()}
                    {k.lastUsedAt ? ` · Last used ${new Date(k.lastUsedAt).toLocaleString()}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => regenerateKey(k.id)}
                    className="px-2 py-1 text-sm bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                    title="Regenerate secret"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={() => revokeKey(k.id)}
                    className="px-2 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded"
                    title="Revoke key"
                  >
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
