import type { Expense, Project, TransportExpense } from "@/lib/zameen-data"

export type ParsedQuickEntry =
  | {
      kind: "general"
      projectName: string
      title: string
      amount: number
      date: string
      category?: string
      vendor?: string
      status?: string
      notes?: string
    }
  | {
      kind: "transport"
      projectName: string
      route: string
      fuelFreight: number
      date: string
      vehicleType?: string
      driverChallan?: string
      notes?: string
    }
  | {
      kind: "update"
      action: "expense-amount" | "expense-category" | "expense-title" | "transport-route" | "transport-fuel" | "transport-driver"
      target: string
      value: string
      projectName?: string
    }
  | null

function normalizeProjectName(raw: string) {
  return raw.replace(/^(project|project name)\s+/i, "").trim()
}

function extractAmount(text: string) {
  const match = text.match(/(?:rs|pkr|usd|\$)?\s*(\d+(?:\.\d{1,2})?)/i)
  return match ? Number(match[1]) : null
}

function extractDate(text: string) {
  const match = text.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  return match ? match[1] : new Date().toISOString().slice(0, 10)
}

function cleanLabel(text: string) {
  return text
    .replace(/^(item|service|title|route|trip|vehicle|driver|challan|notes|category|vendor|status|cost|amount|fuel|freight)\s*[:\-]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
}

function parseLabelledValue(text: string, labels: string[]) {
  const pattern = new RegExp(`\\b(${labels.join("|")})\\s*[:\-]\\s*([^,]+)`, "i")
  const match = text.match(pattern)
  return match ? cleanLabel(match[2]) : ""
}

export function parseQuickExpenseEntry(input: string): ParsedQuickEntry {
  const text = input.trim()
  if (!text) return null

  const lower = text.toLowerCase()
  if (lower.startsWith("edit ") || lower.startsWith("update ")) {
    const match = text.match(/(?:edit|update)\s+(.+?)\s+to\s+(.+)$/i)
    if (!match) return null
    const target = match[1].trim()
    const value = match[2].trim()

    if (lower.includes("transport") && lower.includes("route")) {
      return { kind: "update", action: "transport-route", target, value }
    }
    if (lower.includes("transport") && (lower.includes("fuel") || lower.includes("freight"))) {
      return { kind: "update", action: "transport-fuel", target, value }
    }
    if (lower.includes("transport") && (lower.includes("driver") || lower.includes("challan"))) {
      return { kind: "update", action: "transport-driver", target, value }
    }
    if (lower.includes("category")) {
      return { kind: "update", action: "expense-category", target, value }
    }
    if (lower.includes("title") || lower.includes("name")) {
      return { kind: "update", action: "expense-title", target, value }
    }
    return { kind: "update", action: "expense-amount", target, value }
  }

  if (lower.startsWith("add general expense") || lower.includes("-> general") || lower.includes("general ->")) {
    const payload = text.replace(/^add\s+general\s+expense\s*:\s*/i, "")
    const parts = payload.split(",").map((part) => part.trim()).filter(Boolean)

    if (parts.length >= 2) {
      const projectName = normalizeProjectName(parts[0] || "")
      const title = cleanLabel(parts[1])
      const amount = extractAmount(parts[2] || payload) ?? 0
      const date = extractDate(parts[3] || payload)
      const category = parseLabelledValue(payload, ["category"]) || "Other"
      const vendor = parseLabelledValue(payload, ["vendor"]) || ""
      const status = parseLabelledValue(payload, ["status"]) || "Pending"
      const notes = parseLabelledValue(payload, ["notes"]) || ""
      return { kind: "general", projectName, title, amount, date, category, vendor, status, notes }
    }
  }

  if (lower.startsWith("add transport expense") || lower.includes("-> transport") || lower.includes("transport ->")) {
    const payload = text.replace(/^add\s+transport\s+expense\s*:\s*/i, "")
    const parts = payload.split(",").map((part) => part.trim()).filter(Boolean)

    if (parts.length >= 2) {
      const projectName = normalizeProjectName(parts[0] || "")
      const route = cleanLabel(parts[1])
      const fuelFreight = extractAmount(parts[2] || payload) ?? 0
      const date = extractDate(parts[3] || payload)
      const vehicleType = parseLabelledValue(payload, ["vehicle", "vehicle type"]) || ""
      const driverChallan = parseLabelledValue(payload, ["driver", "challan", "driver/challan"]) || ""
      const notes = parseLabelledValue(payload, ["notes"]) || ""
      return { kind: "transport", projectName, route, fuelFreight, date, vehicleType, driverChallan, notes }
    }
  }

  const parts = text.split("->").map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 3) {
    const projectName = normalizeProjectName(parts[0])
    const type = parts[1].toLowerCase()
    const details = parts.slice(2).join(" -> ")
    const amount = extractAmount(details)
    const date = extractDate(details)

    if (type.includes("transport")) {
      const route = cleanLabel(details.replace(/\b(?:rs|pkr|usd|\$)?\s*\d+(?:\.\d{1,2})?\b/i, "")) || "Trip"
      const vehicleType = parseLabelledValue(details, ["vehicle", "vehicle type"]) || ""
      const driverChallan = parseLabelledValue(details, ["driver", "challan", "driver/challan"]) || ""
      const notes = parseLabelledValue(details, ["notes"]) || ""
      return {
        kind: "transport",
        projectName,
        route,
        fuelFreight: amount ?? 0,
        date,
        vehicleType,
        driverChallan,
        notes,
      }
    }

    const title = cleanLabel(details.replace(/\b(?:rs|pkr|usd|\$)?\s*\d+(?:\.\d{1,2})?\b/i, "")) || "Expense"
    const category = parseLabelledValue(details, ["category"]) || "Other"
    const vendor = parseLabelledValue(details, ["vendor"]) || ""
    const status = parseLabelledValue(details, ["status"]) || "Pending"
    const notes = parseLabelledValue(details, ["notes"]) || ""
    return { kind: "general", projectName, title, amount: amount ?? 0, date, category, vendor, status, notes }
  }

  return null
}

export function findProjectByName(projects: Project[], name: string) {
  return projects.find((project) => project.name.toLowerCase() === name.toLowerCase())
}

export function getProjectSummary(project: Project) {
  const generalTotal = project.expenses.reduce((sum, item) => sum + item.amount, 0)
  const transportTotal = project.transportExpenses.reduce((sum, item) => sum + item.totalTransportExpense, 0)
  return {
    generalTotal,
    transportTotal,
    totalSpent: generalTotal + transportTotal,
    remaining: (project.budget ?? 0) - (generalTotal + transportTotal),
  }
}

export function createBlankExpense(): Expense {
  return {
    id: "",
    title: "",
    amount: 0,
    category: "Other",
    date: new Date().toISOString().slice(0, 10),
    vendor: "",
    status: "Pending",
    notes: "",
  }
}

export function createBlankTransportExpense(): TransportExpense {
  return {
    id: "",
    vehicleType: "",
    route: "",
    fuelFreight: 0,
    driverChallan: "",
    date: new Date().toISOString().slice(0, 10),
    totalTransportExpense: 0,
    notes: "",
  }
}
