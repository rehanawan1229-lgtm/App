import { kv } from "@vercel/kv"
import { seedData, type Project, type Property, type Expense, type TransportExpense, type Payment } from "@/lib/zameen-data"

// Shared cloud "database" for the whole app. Both collections live in Vercel
// KV under these two keys — since the app has exactly one login
// (Faisal / 90851234) shared by every device, there is deliberately no
// per-user partitioning: everyone who signs in reads and writes the same
// two lists, which is what makes "same data on every device" work.
//
// Requires a KV store to be created and connected to this Vercel project
// (Project → Storage → Create Database → KV, then redeploy so the
// KV_REST_API_URL / KV_REST_API_TOKEN env vars are injected). Until that's
// done, reads fall back to the built-in seed data and writes throw — callers
// already handle that as "still offline" and keep the change safe on the
// device until it can sync.
const PROJECTS_KEY = "zameen:projects"
const PROPERTIES_KEY = "zameen:properties"

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export async function readProjects(): Promise<Project[]> {
  try {
    const stored = await kv.get<Project[]>(PROJECTS_KEY)
    return Array.isArray(stored) ? stored : seedData.projects
  } catch {
    return seedData.projects
  }
}

async function writeProjects(projects: Project[]): Promise<void> {
  await kv.set(PROJECTS_KEY, projects)
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  const projects = await readProjects()
  return projects.find((project) => project.id === id)
}

export async function createProject(input: {
  name: string
  propertyId?: string
  client?: string
  budget?: number
  location?: string
  link?: string
  coordinates?: string
}): Promise<Project> {
  const projects = await readProjects()
  const project: Project = {
    ...input,
    id: uid("proj"),
    expenses: [],
    transportExpenses: [],
    payments: [],
  }
  await writeProjects([project, ...projects])
  return project
}

export async function updateProjectRecord(id: string, patch: Partial<Project>): Promise<Project | null> {
  const projects = await readProjects()
  const idx = projects.findIndex((project) => project.id === id)
  if (idx === -1) return null

  const updated: Project = { ...projects[idx], ...patch, id: projects[idx].id }
  const next = [...projects]
  next[idx] = updated
  await writeProjects(next)
  return updated
}

export async function deleteProjectRecord(id: string): Promise<boolean> {
  const projects = await readProjects()
  const next = projects.filter((project) => project.id !== id)
  if (next.length === projects.length) return false
  await writeProjects(next)
  return true
}

export async function addExpenseRecord(
  projectId: string,
  input: Omit<Expense, "id">,
): Promise<{ project: Project; expense: Expense } | null> {
  const projects = await readProjects()
  const idx = projects.findIndex((project) => project.id === projectId)
  if (idx === -1) return null

  const expense: Expense = { ...input, id: uid("exp") }
  const updated: Project = { ...projects[idx], expenses: [expense, ...projects[idx].expenses] }
  const next = [...projects]
  next[idx] = updated
  await writeProjects(next)
  return { project: updated, expense }
}

export async function updateExpenseRecord(
  projectId: string,
  expenseId: string,
  patch: Partial<Expense>,
): Promise<Project | null> {
  const projects = await readProjects()
  const idx = projects.findIndex((project) => project.id === projectId)
  if (idx === -1) return null

  const updated: Project = {
    ...projects[idx],
    expenses: projects[idx].expenses.map((expense) => (expense.id === expenseId ? { ...expense, ...patch } : expense)),
  }
  const next = [...projects]
  next[idx] = updated
  await writeProjects(next)
  return updated
}

export async function deleteExpenseRecord(projectId: string, expenseId: string): Promise<Project | null> {
  const projects = await readProjects()
  const idx = projects.findIndex((project) => project.id === projectId)
  if (idx === -1) return null

  const updated: Project = { ...projects[idx], expenses: projects[idx].expenses.filter((expense) => expense.id !== expenseId) }
  const next = [...projects]
  next[idx] = updated
  await writeProjects(next)
  return updated
}

export async function addTransportRecord(
  projectId: string,
  input: Omit<TransportExpense, "id">,
): Promise<{ project: Project; entry: TransportExpense } | null> {
  const projects = await readProjects()
  const idx = projects.findIndex((project) => project.id === projectId)
  if (idx === -1) return null

  const entry: TransportExpense = { ...input, id: uid("trn") }
  const updated: Project = { ...projects[idx], transportExpenses: [entry, ...projects[idx].transportExpenses] }
  const next = [...projects]
  next[idx] = updated
  await writeProjects(next)
  return { project: updated, entry }
}

export async function updateTransportRecord(
  projectId: string,
  transportId: string,
  patch: Partial<TransportExpense>,
): Promise<Project | null> {
  const projects = await readProjects()
  const idx = projects.findIndex((project) => project.id === projectId)
  if (idx === -1) return null

  const updated: Project = {
    ...projects[idx],
    transportExpenses: projects[idx].transportExpenses.map((entry) =>
      entry.id === transportId ? { ...entry, ...patch } : entry,
    ),
  }
  const next = [...projects]
  next[idx] = updated
  await writeProjects(next)
  return updated
}

export async function deleteTransportRecord(projectId: string, transportId: string): Promise<Project | null> {
  const projects = await readProjects()
  const idx = projects.findIndex((project) => project.id === projectId)
  if (idx === -1) return null

  const updated: Project = {
    ...projects[idx],
    transportExpenses: projects[idx].transportExpenses.filter((entry) => entry.id !== transportId),
  }
  const next = [...projects]
  next[idx] = updated
  await writeProjects(next)
  return updated
}

export async function addPaymentRecord(
  projectId: string,
  input: { amount: number; voucherId: string; description: string; timestamp: string },
): Promise<{ project: Project; payment: Payment } | null> {
  const projects = await readProjects()
  const idx = projects.findIndex((project) => project.id === projectId)
  if (idx === -1) return null

  const payment: Payment = {
    id: uid("pay"),
    amount: input.amount,
    date: input.timestamp,
    voucherId: input.voucherId,
    description: input.description,
    timestamp: input.timestamp,
    type: "payment",
  }
  const updated: Project = { ...projects[idx], payments: [payment, ...projects[idx].payments] }
  const next = [...projects]
  next[idx] = updated
  await writeProjects(next)
  return { project: updated, payment }
}

// --- Properties ---
// Properties (with their documents and tenants nested inside) are synced as
// one whole object per change rather than through granular sub-resource
// endpoints like projects use — simpler, and properties don't have their own
// independent per-record sync-retry needs the way project expenses do.

export async function readProperties(): Promise<Property[]> {
  try {
    const stored = await kv.get<Property[]>(PROPERTIES_KEY)
    return Array.isArray(stored) ? stored : seedData.properties
  } catch {
    return seedData.properties
  }
}

async function writeProperties(properties: Property[]): Promise<void> {
  await kv.set(PROPERTIES_KEY, properties)
}

export async function getPropertyById(id: string): Promise<Property | undefined> {
  const properties = await readProperties()
  return properties.find((property) => property.id === id)
}

export async function createPropertyRecord(input: Omit<Property, "id">): Promise<Property> {
  const properties = await readProperties()
  const property: Property = { ...input, id: uid("prop") }
  await writeProperties([property, ...properties])
  return property
}

// Properties sync as a full replace (the client always sends its complete,
// current copy of the property — including all documents and tenants — on
// every change), so this simply swaps in whatever was sent, keeping only the
// server-assigned id stable.
export async function replacePropertyRecord(id: string, property: Property): Promise<Property | null> {
  const properties = await readProperties()
  const idx = properties.findIndex((p) => p.id === id)
  if (idx === -1) return null

  const updated: Property = { ...property, id: properties[idx].id }
  const next = [...properties]
  next[idx] = updated
  await writeProperties(next)
  return updated
}

export async function deletePropertyRecord(id: string): Promise<boolean> {
  const properties = await readProperties()
  const next = properties.filter((property) => property.id !== id)
  if (next.length === properties.length) return false
  await writeProperties(next)
  return true
}
