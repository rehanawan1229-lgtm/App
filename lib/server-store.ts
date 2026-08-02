import { promises as fs } from "fs"
import path from "path"
import { seedData, type Project, type Expense, type TransportExpense, type Payment } from "@/lib/zameen-data"

// Single JSON file acting as the project "database". Every API route reads and
// writes through the helpers below so there is exactly one source of truth —
// no route should touch this file directly.
const dataFilePath = path.join(process.cwd(), "data", "projects.json")

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export async function readProjects(): Promise<Project[]> {
  try {
    const raw = await fs.readFile(dataFilePath, "utf8")
    const parsed = JSON.parse(raw) as Project[]
    return Array.isArray(parsed) ? parsed : seedData.projects
  } catch {
    return seedData.projects
  }
}

async function writeProjects(projects: Project[]): Promise<void> {
  await fs.mkdir(path.dirname(dataFilePath), { recursive: true })
  await fs.writeFile(dataFilePath, JSON.stringify(projects, null, 2), "utf8")
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
