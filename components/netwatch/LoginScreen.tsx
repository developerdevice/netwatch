'use client'

import { FormEvent, useMemo, useState } from 'react'

import { Layers, LoaderCircle, Pencil, Plus, Server, Trash2 } from 'lucide-react'

import { NETWATCH_SERVER_REGISTRY_SECRET_HEADER } from '@/lib/constants/server-registry'
import { RegisteredRouterServer } from '@/lib/types'

interface LoginScreenProps {
  initialServers: RegisteredRouterServer[]
  registrySecretRequired: boolean
}

interface RequestState {
  loading: boolean
  error: string | null
}

const DEFAULT_LOGIN_STATE: RequestState = {
  loading: false,
  error: null,
}

export function LoginScreen({ initialServers, registrySecretRequired }: LoginScreenProps) {
  const [servers, setServers] = useState(initialServers)
  const [selectedServerId, setSelectedServerId] = useState(initialServers[0]?.id ?? '')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showAddServer, setShowAddServer] = useState(initialServers.length === 0)
  const [editingServer, setEditingServer] = useState<RegisteredRouterServer | null>(null)
  const [pendingRemoveServerId, setPendingRemoveServerId] = useState<string | null>(null)
  const [loginState, setLoginState] = useState<RequestState>(DEFAULT_LOGIN_STATE)
  const [serverState, setServerState] = useState<RequestState>(DEFAULT_LOGIN_STATE)
  const [registrySecret, setRegistrySecret] = useState('')
  const [serverLabel, setServerLabel] = useState('')
  const [serverHost, setServerHost] = useState('')
  const [serverPort, setServerPort] = useState('8728')
  const [serverSecure, setServerSecure] = useState(false)

  const selectedServer = useMemo(
    () => servers.find(server => server.id === selectedServerId) ?? null,
    [selectedServerId, servers]
  )

  function buildRegistryHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const key = registrySecret.trim()
    if (key) {
      headers[NETWATCH_SERVER_REGISTRY_SECRET_HEADER] = key
    }
    return headers
  }

  function assertRegistryKeyForMutation(): string | null {
    if (!registrySecretRequired) return null
    if (!registrySecret.trim()) {
      return 'Informe a chave de administracao do registo'
    }
    return null
  }

  function openAddServerForm() {
    setEditingServer(null)
    setServerLabel('')
    setServerHost('')
    setServerPort('8728')
    setServerSecure(false)
    setShowAddServer(true)
  }

  function openEditServerForm(server: RegisteredRouterServer) {
    setShowAddServer(true)
    setEditingServer(server)
    setServerLabel(server.label)
    setServerHost(server.host)
    setServerPort(String(server.port))
    setServerSecure(server.secure)
    setPendingRemoveServerId(null)
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setLoginState({ loading: true, error: null })

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serverId: selectedServerId,
          username,
          password,
        }),
      })

      const payload = await response.json()
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message || 'Falha ao autenticar no servidor selecionado.')
      }

      window.location.reload()
    } catch (error) {
      setLoginState({
        loading: false,
        error: error instanceof Error ? error.message : 'Falha ao autenticar no servidor selecionado.',
      })
      return
    }

    setLoginState(DEFAULT_LOGIN_STATE)
  }

  async function handleSaveServer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const keyError = assertRegistryKeyForMutation()
    if (keyError) {
      setServerState({ loading: false, error: keyError })
      return
    }

    setServerState({ loading: true, error: null })

    const body = {
      label: serverLabel,
      host: serverHost,
      port: Number(serverPort),
      secure: serverSecure,
    }

    try {
      const isEdit = editingServer != null
      const response = await fetch(isEdit ? `/api/servers/${editingServer.id}` : '/api/servers', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: buildRegistryHeaders(),
        body: JSON.stringify(body),
      })

      const payload = await response.json()
      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.error?.message ||
            (isEdit ? 'Nao foi possivel atualizar o servidor.' : 'Nao foi possivel cadastrar o servidor.')
        )
      }

      const nextServer = payload.data.server as RegisteredRouterServer
      setServers(current => {
        if (isEdit) {
          return current.map(s => (s.id === nextServer.id ? nextServer : s))
        }
        const exists = current.some(server => server.id === nextServer.id)
        return exists ? current : [...current, nextServer]
      })
      setSelectedServerId(nextServer.id)
      setShowAddServer(false)
      setEditingServer(null)
      setServerLabel('')
      setServerHost('')
      setServerPort(nextServer.secure ? '8729' : String(nextServer.port))
      setServerSecure(false)
      setServerState(DEFAULT_LOGIN_STATE)
    } catch (error) {
      setServerState({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : editingServer
              ? 'Nao foi possivel atualizar o servidor.'
              : 'Nao foi possivel cadastrar o servidor.',
      })
    }
  }

  async function handleConfirmRemoveServer(serverId: string) {
    const keyError = assertRegistryKeyForMutation()
    if (keyError) {
      setServerState({ loading: false, error: keyError })
      setPendingRemoveServerId(null)
      return
    }

    setServerState({ loading: true, error: null })
    setPendingRemoveServerId(null)

    try {
      const response = await fetch(`/api/servers/${serverId}`, {
        method: 'DELETE',
        headers: buildRegistryHeaders(),
      })
      const payload = await response.json()
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message || 'Nao foi possivel remover o servidor.')
      }

      setServers(prev => {
        const next = prev.filter(s => s.id !== serverId)
        setSelectedServerId(sel => (sel === serverId ? next[0]?.id ?? '' : sel))
        return next
      })
      setServerState(DEFAULT_LOGIN_STATE)
    } catch (error) {
      setServerState({
        loading: false,
        error: error instanceof Error ? error.message : 'Nao foi possivel remover o servidor.',
      })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10 text-foreground">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="panel-surface rounded-3xl border border-border p-8">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg">
              <Layers size={18} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">NetWatch</h1>
              <p className="mt-1 text-sm text-muted-foreground">Login multi-server para RouterOS API</p>
            </div>
          </div>

          <div className="mt-8 space-y-4">

            {registrySecretRequired && (
              <div>
                <label className="mb-1.5 block text-sm text-muted-foreground">Chave do registo (admin)</label>
                <input
                  type="password"
                  value={registrySecret}
                  onChange={event => setRegistrySecret(event.target.value)}
                  autoComplete="off"
                  placeholder="chave de segurança..."
                  className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none transition focus:border-foreground/40"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (showAddServer && !editingServer) {
                  setShowAddServer(false)
                  return
                }
                openAddServerForm()
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <Plus size={15} />
              {showAddServer && !editingServer ? 'Fechar cadastro' : 'Add server'}
            </button>

            {showAddServer && (
              <form onSubmit={handleSaveServer} className="space-y-4 rounded-2xl border border-border bg-background/30 p-4">
                <p className="text-sm font-medium text-foreground">
                  {editingServer ? 'Editar servidor cadastrado' : 'Novo servidor'}
                </p>
                <div>
                  <label className="mb-1.5 block text-sm text-muted-foreground">Nome do servidor</label>
                  <input
                    value={serverLabel}
                    onChange={event => setServerLabel(event.target.value)}
                    placeholder="Nome do servidor"
                    className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none transition focus:border-foreground/40"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-muted-foreground">Host</label>
                  <input
                    value={serverHost}
                    onChange={event => setServerHost(event.target.value)}
                    placeholder="10.0.0.1 ou hostname"
                    className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none transition focus:border-foreground/40"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-muted-foreground">Porta</label>
                  <input
                    value={serverPort}
                    onChange={event => setServerPort(event.target.value)}
                    inputMode="numeric"
                    placeholder="8728"
                    className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none transition focus:border-foreground/40"
                  />
                </div>
                <label className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={serverSecure}
                    onChange={event => setServerSecure(event.target.checked)}
                    className="size-4 rounded border-border bg-input"
                  />
                  Usar TLS/API-SSL
                </label>
                {serverState.error && <p className="text-sm text-rose-400">{serverState.error}</p>}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="submit"
                    disabled={serverState.loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {serverState.loading && <LoaderCircle size={14} className="animate-spin" />}
                    {editingServer ? 'Salvar alteracoes' : 'Cadastrar servidor'}
                  </button>
                  {editingServer && (
                    <button
                      type="button"
                      disabled={serverState.loading}
                      onClick={() => {
                        setShowAddServer(false)
                        setEditingServer(null)
                        setServerState(DEFAULT_LOGIN_STATE)
                      }}
                      className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground transition hover:bg-accent"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </section>

        <section className="panel-surface rounded-3xl border border-border p-8">
          <div className="flex items-center gap-3">
            <Server size={18} className="text-muted-foreground" />
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Entrar</h2>
              <p className="mt-1 text-sm text-muted-foreground">Selecione um servidor cadastrado e autentique sua sessao.</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            {serverState.error && (
              <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
                {serverState.error}
              </p>
            )}
            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">Servidor</label>
              {servers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                  Nenhum servidor cadastrado ainda.
                </div>
              ) : (
                <div className="space-y-2">
                  {servers.map(server => (
                    <div
                      key={server.id}
                      className={`flex overflow-hidden rounded-2xl border transition ${
                        selectedServerId === server.id
                          ? 'border-foreground/30 bg-accent'
                          : 'border-border bg-background/30 hover:border-foreground/20'
                      }`}
                    >
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-4 py-3">
                        <input
                          type="radio"
                          name="server"
                          value={server.id}
                          checked={selectedServerId === server.id}
                          onChange={() => setSelectedServerId(server.id)}
                          className="size-4 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">{server.label}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {server.host}:{server.port}
                            {server.secure ? ' • TLS' : ''}
                          </div>
                        </div>
                      </label>
                      <div className="flex shrink-0 flex-col items-stretch justify-center border-l border-border bg-background/20">
                        {pendingRemoveServerId === server.id ? (
                          <div className="flex flex-col gap-2 px-3 py-2">
                            <span className="text-[11px] text-muted-foreground">Remover do registo?</span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={serverState.loading}
                                onClick={() => void handleConfirmRemoveServer(server.id)}
                                className="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                              >
                                Sim
                              </button>
                              <button
                                type="button"
                                disabled={serverState.loading}
                                onClick={() => setPendingRemoveServerId(null)}
                                className="rounded-lg border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent"
                              >
                                Nao
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-0.5 px-1.5 py-2">
                            <button
                              type="button"
                              title="Editar cadastro"
                              disabled={serverState.loading}
                              onClick={() => {
                                setPendingRemoveServerId(null)
                                openEditServerForm(server)
                              }}
                              className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-50"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              title="Remover cadastro"
                              disabled={serverState.loading}
                              onClick={() => {
                                setPendingRemoveServerId(server.id)
                                setServerState(DEFAULT_LOGIN_STATE)
                              }}
                              className="rounded-lg p-2 text-muted-foreground transition hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-50"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">Usuario</label>
              <input
                value={username}
                onChange={event => setUsername(event.target.value)}
                placeholder="admin"
                className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none transition focus:border-foreground/40"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">Senha</label>
              <input
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm outline-none transition focus:border-foreground/40"
              />
            </div>

            {selectedServer && (
              <div className="rounded-2xl border border-border bg-background/30 px-4 py-3 text-xs text-muted-foreground">
                Sessao alvo: <span className="text-foreground">{selectedServer.label}</span> em{' '}
                <span className="font-mono text-foreground">{selectedServer.host}:{selectedServer.port}</span>
              </div>
            )}

            {loginState.error && (
              <p className="text-sm text-rose-400">{loginState.error}</p>
            )}

            <button
              type="submit"
              disabled={loginState.loading || !selectedServerId || servers.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-medium text-background transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loginState.loading && <LoaderCircle size={14} className="animate-spin" />}
              Entrar no servidor
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
