"use client"

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react"
import {
  seedData,
  type ZameenData,
  type Property,
  type Project,
  type Tenant,
  type TenantPayment,
  type TenantDocument,
  type PropertyDocument,
  type Expense,
  type TransportExpense,
  type Payment,
} from "@/lib/zameen-data"

const STORAGE_KEY = "zameen-store-v1"
const THEME_KEY = "zameen-theme"

// Records created while offline get a temporary id in this shape.
// syncPendingRecords() below re-sends them to the server once the device is
// back online. For expenses/transport/payments the temp id is swapped for
// the real one on success. For a PROJECT itself, `id` is intentionally never
// swapped/renamed after creation (see Project.serverId) — the UI (e.g. an
// open project dialog) tracks a project by `id`, and renaming it out from
// under an open view would make it vanish mid-use.
const LOCAL_ID_PREFIX = "local-"
const isLocalId = (id: string) => id.startsWith(LOCAL_ID_PREFIX)
const uid = () => Math.random().toString(36).slice(2, 10)
const localId = () => `${LOCAL_ID_PREFIX}${Date.now()}-${uid()}`

// The id to actually call the API with for a given project — its confirmed
// serverId once synced, otherwise its (still-local) id.
const apiProjectId = (project: Project) => project.serverId ?? project.id
const isProjectSynced = (project: Project) => !!project.serverId || !isLocalId(project.id)

// Tenants used to be just { name, phone, monthlyRent, leaseEnd, rent: [{month,
// paid}] } — no deposit, no profile detail, no documents of their own. This
// migrates any record saved under that older shape into the current one the
// first time it's loaded, instead of crashing when a field it now assumes
// exists (securityDeposit, documents, payments, ...) turns out to be missing.
function parseLegacyMonthLabel(label: string): Date | null {
  const d = new Date(`1 ${label}`)
  return Number.isNaN(d.getTime()) ? null : d
}

function normalizeTenant(raw: any): Tenant {
  const legacyRent: Array<{ month: string; paid: boolean; paidOn?: string }> = Array.isArray(raw?.rent) ? raw.rent : []
  const monthlyRent = typeof raw?.monthlyRent === "number" ? raw.monthlyRent : 0

  const payments: TenantPayment[] =
    Array.isArray(raw?.payments) && raw.payments.length > 0
      ? raw.payments
      : legacyRent
          .filter((r) => r.paid)
          .map((r, i) => ({
            id: `legacy-${raw?.id ?? uid()}-${i}`,
            date: r.paidOn || parseLegacyMonthLabel(r.month)?.toISOString().slice(0, 10) || new Date().toISOString().slice(0, 10),
            amount: monthlyRent,
            note: `Migrated from earlier records — ${r.month}`,
          }))

  const leaseStart =
    typeof raw?.leaseStart === "string" && raw.leaseStart
      ? raw.leaseStart
      : (() => {
          const months = legacyRent.map((r) => parseLegacyMonthLabel(r.month)).filter((d): d is Date => d !== null)
          if (months.length === 0) return ""
          return new Date(Math.min(...months.map((d) => d.getTime()))).toISOString().slice(0, 10)
        })()

  return {
    id: raw?.id ?? uid(),
    name: raw?.name ?? "",
    phone: raw?.phone ?? "",
    cnic: raw?.cnic ?? "",
    guardianName: raw?.guardianName ?? "",
    address: raw?.address ?? "",
    occupation: raw?.occupation ?? "",
    emergencyContact: raw?.emergencyContact ?? "",
    monthlyRent,
    securityDeposit: typeof raw?.securityDeposit === "number" ? raw.securityDeposit : 0,
    leaseStart,
    leaseEnd: raw?.leaseEnd ?? "",
    status: raw?.status === "ended" ? "ended" : "active",
    notes: raw?.notes ?? "",
    payments,
    documents: Array.isArray(raw?.documents) ? raw.documents : [],
  }
}

type Settings = { areaUnit: string; reminders: boolean; googleMapsApiKey?: string }

type StoreContextValue = {
  ready: boolean
  online: boolean
  pendingSyncCount: number
  data: ZameenData
  settings: Settings
  theme: "light" | "dark"
  setTheme: (t: "light" | "dark") => void
  setSettings: (s: Partial<Settings>) => void
  addProperty: (p: Omit<Property, "id" | "documents" | "tenants">) => void
  updateProperty: (id: string, patch: Partial<Property>) => void
  deleteProperty: (id: string) => void
  addDocument: (propertyId: string, doc: Omit<PropertyDocument, "id">) => void
  deleteDocument: (propertyId: string, docId: string) => void
  addTenant: (propertyId: string, tenant: Omit<Tenant, "id" | "status" | "leaseEnd" | "payments" | "documents">) => void
  endTenancy: (propertyId: string, tenantId: string) => void
  deleteTenant: (propertyId: string, tenantId: string) => void
  addTenantPayment: (propertyId: string, tenantId: string, payment: Omit<TenantPayment, "id">) => void
  deleteTenantPayment: (propertyId: string, tenantId: string, paymentId: string) => void
  addTenantDocument: (propertyId: string, tenantId: string, doc: Omit<TenantDocument, "id">) => void
  deleteTenantDocument: (propertyId: string, tenantId: string, docId: string) => void
  addProject: (p: { name: string; propertyId?: string; client?: string; budget?: number; location?: string; link?: string; coordinates?: string }) => Promise<Project>
  updateProject: (id: string, patch: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  addExpense: (projectId: string, e: Omit<Expense, "id">) => Promise<void>
  updateExpense: (projectId: string, expenseId: string, patch: Partial<Expense>) => Promise<void>
  deleteExpense: (projectId: string, expenseId: string) => Promise<void>
  addTransportExpense: (projectId: string, entry: Omit<TransportExpense, "id">) => Promise<void>
  updateTransportExpense: (projectId: string, transportId: string, patch: Partial<TransportExpense>) => Promise<void>
  deleteTransportExpense: (projectId: string, transportId: string) => Promise<void>
  addPayment: (projectId: string, p: Omit<Payment, "id" | "date">) => Promise<void>
  resetData: () => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

async function requestJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(json?.error || "Request failed")
  }
  return json as T
}

function countPending(data: ZameenData): number {
  let count = 0
  for (const project of data.projects) {
    if (!isProjectSynced(project)) count += 1
    count += project.expenses.filter((e) => isLocalId(e.id)).length
    count += project.transportExpenses.filter((t) => isLocalId(t.id)).length
    count += project.payments.filter((p) => isLocalId(p.id)).length
  }
  return count
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [online, setOnline] = useState(true)
  const [data, setData] = useState<ZameenData>(seedData)
  const [settings, setSettingsState] = useState<Settings>({ areaUnit: "Marla", reminders: true })
  const [theme, setThemeState] = useState<"light" | "dark">("light")

  // Mirrors `data` so the background sync routine can always read the latest
  // state without depending on a stale closure across `await`s.
  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  }, [data])

  const syncingRef = useRef(false)

  // --- Background sync: pushes any offline-created records to the server,
  // in project → then-nested-record order. A project's own `id` is never
  // changed — only its `serverId` gets set once the server confirms it.
  // Nested expenses/transport/payments do get their temp id swapped for the
  // real one, since nothing outside this store tracks them individually by
  // id (see the note above LOCAL_ID_PREFIX). Safe to call any time (on
  // reconnect, on mount, after any add) — no-ops if nothing is pending or a
  // sync is already running.
  const syncPendingRecords = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true
    try {
      for (const snapshot of dataRef.current.projects) {
        const stableId = snapshot.id
        let apiId = apiProjectId(snapshot)

        if (!isProjectSynced(snapshot)) {
          const { id: _drop, serverId: _sid, expenses: _e, transportExpenses: _t, payments: _p, ...rest } = snapshot
          try {
            const { project: created } = await requestJSON<{ project: Project }>("/api/projects", {
              method: "POST",
              body: JSON.stringify(rest),
            })
            apiId = created.id
            setData((d) => ({
              ...d,
              projects: d.projects.map((p) => (p.id === stableId ? { ...p, serverId: created.id } : p)),
            }))
          } catch {
            continue // still offline — leave this project (and its children) queued
          }
        }

        const live = () => dataRef.current.projects.find((p) => p.id === stableId)

        for (const expense of live()?.expenses.filter((e) => isLocalId(e.id)) ?? []) {
          try {
            const { title, amount, category, date, vendor, status, notes } = expense
            const { expense: confirmed } = await requestJSON<{ expense: Expense }>(`/api/projects/${apiId}/expenses`, {
              method: "POST",
              body: JSON.stringify({ title, amount, category, date, vendor, status, notes }),
            })
            setData((d) => ({
              ...d,
              projects: d.projects.map((p) =>
                p.id === stableId ? { ...p, expenses: p.expenses.map((e) => (e.id === expense.id ? confirmed : e)) } : p,
              ),
            }))
          } catch {
            /* try again on the next sync pass */
          }
        }

        for (const entry of live()?.transportExpenses.filter((t) => isLocalId(t.id)) ?? []) {
          try {
            const { vehicleType, route, fuelFreight, driverChallan, date, totalTransportExpense, notes } = entry
            const { entry: confirmed } = await requestJSON<{ entry: TransportExpense }>(`/api/projects/${apiId}/transport`, {
              method: "POST",
              body: JSON.stringify({ vehicleType, route, fuelFreight, driverChallan, date, totalTransportExpense, notes }),
            })
            setData((d) => ({
              ...d,
              projects: d.projects.map((p) =>
                p.id === stableId
                  ? { ...p, transportExpenses: p.transportExpenses.map((t) => (t.id === entry.id ? confirmed : t)) }
                  : p,
              ),
            }))
          } catch {
            /* try again on the next sync pass */
          }
        }

        for (const payment of live()?.payments.filter((p) => isLocalId(p.id)) ?? []) {
          try {
            const { amount, voucherId, description, timestamp } = payment
            const { payment: confirmed } = await requestJSON<{ payment: Payment }>(`/api/projects/${apiId}/payments`, {
              method: "POST",
              body: JSON.stringify({ amount, voucherId, description, timestamp }),
            })
            setData((d) => ({
              ...d,
              projects: d.projects.map((p) =>
                p.id === stableId ? { ...p, payments: p.payments.map((pay) => (pay.id === payment.id ? confirmed : pay)) } : p,
              ),
            }))
          } catch {
            /* try again on the next sync pass */
          }
        }
      }
    } finally {
      syncingRef.current = false
    }
  }, [])

  useEffect(() => {
    const goOnline = () => {
      setOnline(true)
      syncPendingRecords()
    }
    const goOffline = () => setOnline(false)
    setOnline(navigator.onLine)
    window.addEventListener("online", goOnline)
    window.addEventListener("offline", goOffline)
    return () => {
      window.removeEventListener("online", goOnline)
      window.removeEventListener("offline", goOffline)
    }
  }, [syncPendingRecords])

  // Bootstrap: properties + settings + theme come from this device's local
  // cache (they aren't server-backed). Projects are hydrated from the server
  // "database" so every device sees the same expenses/transport/payments —
  // but any not-yet-synced offline records cached from a previous session are
  // merged back on top rather than discarded, then a sync pass is kicked off.
  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      let cachedProperties: Property[] | null = null
      let cachedProjects: Project[] | null = null
      let cachedSettings: Partial<Settings> | null = null

      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed?.data?.properties)) {
            // Older cached records (from before documents/tenants existed, or
            // any record saved mid-migration) may be missing these arrays —
            // normalize on load so every screen can safely assume they exist.
            cachedProperties = parsed.data.properties.map((p: Property) => ({
              ...p,
              documents: Array.isArray(p.documents) ? p.documents : [],
              tenants: Array.isArray(p.tenants) ? p.tenants.map((t) => normalizeTenant(t)) : [],
            }))
          }
          if (Array.isArray(parsed?.data?.projects)) cachedProjects = parsed.data.projects
          if (parsed?.settings) cachedSettings = parsed.settings
        }
        const storedTheme = localStorage.getItem(THEME_KEY) as "light" | "dark" | null
        const initialTheme = storedTheme ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        setThemeState(initialTheme)
      } catch {
        // ignore malformed local cache
      }

      let projects = cachedProjects ?? seedData.projects
      try {
        const res = await fetch("/api/projects")
        if (res.ok) {
          const json = await res.json()
          if (Array.isArray(json.projects)) {
            projects = mergeUnsyncedIntoServerProjects(json.projects, cachedProjects)
          }
        }
      } catch {
        // server unreachable — keep the local cache / seed fallback above
      }

      if (!cancelled) {
        setData({ properties: cachedProperties ?? seedData.properties, projects })
        if (cachedSettings) setSettingsState((prev) => ({ ...prev, ...cachedSettings }))
        setReady(true)
        syncPendingRecords()
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    document.documentElement.classList.toggle("light", theme === "light")
  }, [theme])

  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, settings }))
    } catch {
      // ignore storage quota errors
    }
  }, [data, settings, ready])

  const setTheme = useCallback((t: "light" | "dark") => {
    setThemeState(t)
    localStorage.setItem(THEME_KEY, t)
  }, [])

  const setSettings = useCallback((s: Partial<Settings>) => setSettingsState((prev) => ({ ...prev, ...s })), [])

  const mutateProperty = (id: string, fn: (p: Property) => Property) =>
    setData((d) => ({ ...d, properties: d.properties.map((p) => (p.id === id ? fn(p) : p)) }))

  const mutateProject = (id: string, fn: (p: Project) => Project) =>
    setData((d) => ({ ...d, projects: d.projects.map((p) => (p.id === id ? fn(p) : p)) }))

  // Resolves the current server-facing id for a project this store knows by
  // its stable client id, and whether it's actually reached the server yet.
  const resolveProject = (id: string) => dataRef.current.projects.find((p) => p.id === id)

  const value: StoreContextValue = {
    ready,
    online,
    pendingSyncCount: countPending(data),
    data,
    settings,
    theme,
    setTheme,
    setSettings,
    addProperty: (p) =>
      setData((d) => ({ ...d, properties: [{ ...p, id: uid(), documents: [], tenants: [] }, ...d.properties] })),
    updateProperty: (id, patch) => mutateProperty(id, (p) => ({ ...p, ...patch })),
    deleteProperty: (id) => setData((d) => ({ ...d, properties: d.properties.filter((p) => p.id !== id) })),
    addDocument: (propertyId, doc) =>
      mutateProperty(propertyId, (p) => ({ ...p, documents: [{ ...doc, id: uid() }, ...(p.documents ?? [])] })),
    deleteDocument: (propertyId, docId) =>
      mutateProperty(propertyId, (p) => ({ ...p, documents: (p.documents ?? []).filter((doc) => doc.id !== docId) })),
    addTenant: (propertyId, tenant) =>
      mutateProperty(propertyId, (p) => ({
        ...p,
        // Saving a new tenant automatically closes out whichever tenant is
        // currently active for this property — a unit has one tenant at a
        // time, and the outgoing tenant's full history (ledger, documents)
        // stays on record rather than being overwritten.
        tenants: [
          { ...tenant, id: uid(), status: "active", leaseEnd: "", payments: [], documents: [] },
          ...(p.tenants ?? []).map((t) =>
            t.status === "active" ? { ...t, status: "ended" as const, leaseEnd: t.leaseEnd || new Date().toISOString().slice(0, 10) } : t,
          ),
        ],
      })),
    endTenancy: (propertyId, tenantId) =>
      mutateProperty(propertyId, (p) => ({
        ...p,
        tenants: (p.tenants ?? []).map((t) =>
          t.id === tenantId ? { ...t, status: "ended", leaseEnd: t.leaseEnd || new Date().toISOString().slice(0, 10) } : t,
        ),
      })),
    deleteTenant: (propertyId, tenantId) =>
      mutateProperty(propertyId, (p) => ({ ...p, tenants: (p.tenants ?? []).filter((t) => t.id !== tenantId) })),
    addTenantPayment: (propertyId, tenantId, payment) =>
      mutateProperty(propertyId, (p) => ({
        ...p,
        tenants: (p.tenants ?? []).map((t) =>
          t.id === tenantId ? { ...t, payments: [{ ...payment, id: uid() }, ...(t.payments ?? [])] } : t,
        ),
      })),
    deleteTenantPayment: (propertyId, tenantId, paymentId) =>
      mutateProperty(propertyId, (p) => ({
        ...p,
        tenants: (p.tenants ?? []).map((t) =>
          t.id === tenantId ? { ...t, payments: (t.payments ?? []).filter((pay) => pay.id !== paymentId) } : t,
        ),
      })),
    addTenantDocument: (propertyId, tenantId, doc) =>
      mutateProperty(propertyId, (p) => ({
        ...p,
        tenants: (p.tenants ?? []).map((t) =>
          t.id === tenantId ? { ...t, documents: [{ ...doc, id: uid() }, ...(t.documents ?? [])] } : t,
        ),
      })),
    deleteTenantDocument: (propertyId, tenantId, docId) =>
      mutateProperty(propertyId, (p) => ({
        ...p,
        tenants: (p.tenants ?? []).map((t) =>
          t.id === tenantId ? { ...t, documents: (t.documents ?? []).filter((d) => d.id !== docId) } : t,
        ),
      })),

    // --- Projects, expenses, transport costs, and payments ---
    // Every add applies instantly to on-screen state (so the app stays fully
    // usable with no signal — a site visit with no bars still records
    // everything), then tries to persist to the server in the background.
    // If that background attempt fails, the record simply stays tagged with
    // its local id and syncPendingRecords() picks it up the next time the
    // device comes back online — nothing is ever silently lost.
    addProject: async (p) => {
      const project: Project = { ...p, id: localId(), expenses: [], transportExpenses: [], payments: [] }
      setData((d) => ({ ...d, projects: [project, ...d.projects] }))
      syncPendingRecords()
      return project
    },
    updateProject: async (id, patch) => {
      mutateProject(id, (p) => ({ ...p, ...patch }))
      const project = resolveProject(id)
      if (!project || !isProjectSynced(project)) return // will be pushed fresh (with this edit already applied) once it first syncs
      try {
        await requestJSON(`/api/projects/${apiProjectId(project)}`, { method: "PATCH", body: JSON.stringify(patch) })
      } catch (error) {
        console.error("updateProject: will retry once back online", error)
      }
    },
    deleteProject: async (id) => {
      const project = resolveProject(id)
      const wasSynced = project ? isProjectSynced(project) : false
      const apiId = project ? apiProjectId(project) : id
      setData((d) => ({ ...d, projects: d.projects.filter((p) => p.id !== id) }))
      if (!wasSynced) return // never existed server-side
      try {
        await requestJSON(`/api/projects/${apiId}`, { method: "DELETE" })
      } catch (error) {
        console.error("deleteProject: server delete failed, project removed locally", error)
      }
    },
    addExpense: async (projectId, e) => {
      const expense: Expense = { ...e, id: localId() }
      mutateProject(projectId, (p) => ({ ...p, expenses: [expense, ...p.expenses] }))
      syncPendingRecords()
    },
    updateExpense: async (projectId, expenseId, patch) => {
      mutateProject(projectId, (p) => ({
        ...p,
        expenses: p.expenses.map((expense) => (expense.id === expenseId ? { ...expense, ...patch } : expense)),
      }))
      const project = resolveProject(projectId)
      if (!project || !isProjectSynced(project) || isLocalId(expenseId)) return
      try {
        await requestJSON(`/api/projects/${apiProjectId(project)}/expenses/${expenseId}`, { method: "PATCH", body: JSON.stringify(patch) })
      } catch (error) {
        console.error("updateExpense: will retry once back online", error)
      }
    },
    deleteExpense: async (projectId, expenseId) => {
      const project = resolveProject(projectId)
      const canDeleteRemote = !!project && isProjectSynced(project) && !isLocalId(expenseId)
      const apiId = project ? apiProjectId(project) : projectId
      mutateProject(projectId, (p) => ({ ...p, expenses: p.expenses.filter((expense) => expense.id !== expenseId) }))
      if (!canDeleteRemote) return
      try {
        await requestJSON(`/api/projects/${apiId}/expenses/${expenseId}`, { method: "DELETE" })
      } catch (error) {
        console.error("deleteExpense: server delete failed, expense removed locally", error)
      }
    },
    addTransportExpense: async (projectId, entry) => {
      const record: TransportExpense = { ...entry, id: localId() }
      mutateProject(projectId, (p) => ({ ...p, transportExpenses: [record, ...p.transportExpenses] }))
      syncPendingRecords()
    },
    updateTransportExpense: async (projectId, transportId, patch) => {
      mutateProject(projectId, (p) => ({
        ...p,
        transportExpenses: p.transportExpenses.map((entry) => (entry.id === transportId ? { ...entry, ...patch } : entry)),
      }))
      const project = resolveProject(projectId)
      if (!project || !isProjectSynced(project) || isLocalId(transportId)) return
      try {
        await requestJSON(`/api/projects/${apiProjectId(project)}/transport/${transportId}`, { method: "PATCH", body: JSON.stringify(patch) })
      } catch (error) {
        console.error("updateTransportExpense: will retry once back online", error)
      }
    },
    deleteTransportExpense: async (projectId, transportId) => {
      const project = resolveProject(projectId)
      const canDeleteRemote = !!project && isProjectSynced(project) && !isLocalId(transportId)
      const apiId = project ? apiProjectId(project) : projectId
      mutateProject(projectId, (p) => ({
        ...p,
        transportExpenses: p.transportExpenses.filter((entry) => entry.id !== transportId),
      }))
      if (!canDeleteRemote) return
      try {
        await requestJSON(`/api/projects/${apiId}/transport/${transportId}`, { method: "DELETE" })
      } catch (error) {
        console.error("deleteTransportExpense: server delete failed, entry removed locally", error)
      }
    },
    addPayment: async (projectId, pay) => {
      const payment: Payment = { ...pay, id: localId(), date: new Date().toISOString() }
      mutateProject(projectId, (p) => ({ ...p, payments: [payment, ...p.payments] }))
      syncPendingRecords()
    },
    resetData: () => {
      setData(seedData)
      setSettingsState({ areaUnit: "Marla", reminders: true })
    },
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// Combines the server's authoritative project list with any records that
// only exist in this browser's local cache so far. Whole projects created
// offline and never yet confirmed by the server are kept in full (matched by
// serverId when present, otherwise by their still-local id); individual
// offline-added expenses/transport/payments on an already-known project are
// layered back on top of the server's copy, and the client's stable id is
// preserved so anything in the UI still tracking that project by id keeps
// resolving correctly.
function mergeUnsyncedIntoServerProjects(serverProjects: Project[], cachedProjects: Project[] | null): Project[] {
  if (!cachedProjects) return serverProjects

  const merged = serverProjects.map((serverProject) => {
    const cached = cachedProjects.find((p) => (p.serverId ?? p.id) === serverProject.id)
    if (!cached) return serverProject

    const pendingExpenses = cached.expenses.filter((e) => isLocalId(e.id))
    const pendingTransport = cached.transportExpenses.filter((t) => isLocalId(t.id))
    const pendingPayments = cached.payments.filter((p) => isLocalId(p.id))

    return {
      ...serverProject,
      id: cached.id,
      serverId: cached.serverId,
      expenses: [...pendingExpenses, ...serverProject.expenses],
      transportExpenses: [...pendingTransport, ...serverProject.transportExpenses],
      payments: [...pendingPayments, ...serverProject.payments],
    }
  })

  const localOnlyProjects = cachedProjects.filter((p) => !isProjectSynced(p))
  return [...localOnlyProjects, ...merged]
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}
