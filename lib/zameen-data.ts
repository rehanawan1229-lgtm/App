export type PropertyType = "House" | "Plot" | "Commercial"
export type PropertyStatus = "Owned" | "Rented" | "For Sale"

export type PropertyDocument = {
  id: string
  name: string
  type: string
  expiry: string
  size: string
  // The original uploaded file, kept so a document can be opened and
  // exported again later. Optional because older/seed records were
  // metadata-only (no real file was ever attached to them).
  fileName?: string
  dataUrl?: string
}

export type RentMonth = {
  month: string
  paid: boolean
  paidOn?: string
}

export type Tenant = {
  id: string
  name: string
  phone: string
  monthlyRent: number
  leaseEnd: string
  rent: RentMonth[]
}

export type Property = {
  id: string
  name: string
  location: string
  type: PropertyType
  status: PropertyStatus
  size: string
  value: number
  color: string
  documents: PropertyDocument[]
  tenants: Tenant[]
}

export type Expense = {
  id: string
  title: string
  amount: number
  category: string
  date: string
  vendor?: string
  status?: string
  notes?: string
}

export type TransportExpense = {
  id: string
  vehicleType: string
  route: string
  fuelFreight: number
  driverChallan: string
  date: string
  totalTransportExpense: number
  notes?: string
}

export type Payment = {
  id: string
  amount: number
  date: string
  voucherId?: string
  description?: string
  timestamp?: string
  type?: "payment"
}

export type Project = {
  id: string
  // Set once a project created offline (client-side "local-" id) has been
  // confirmed by the server. `id` itself is never renamed after creation —
  // it's the stable key the UI (e.g. an open project dialog) tracks by —
  // this field is what the API layer resolves to instead, once present.
  serverId?: string
  name: string
  propertyId?: string
  client?: string
  budget?: number
  location?: string
  link?: string
  coordinates?: string
  photoUrl?: string
  imageUrl?: string
  expenses: Expense[]
  transportExpenses: TransportExpense[]
  payments: Payment[]
}

export type ZameenData = {
  properties: Property[]
  projects: Project[]
}

const currentMonth = new Date().toLocaleString("en-US", { month: "long", year: "numeric" })
const previousMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleString("en-US", { month: "long", year: "numeric" })

export const seedData: ZameenData = {
  properties: [
    {
      id: "p1",
      name: "Canal View House",
      location: "DHA Phase 6, Lahore",
      type: "House",
      status: "Rented",
      size: "10 Marla",
      value: 38500000,
      color: "clay",
      documents: [
        { id: "d1", name: "Property Registry", type: "Registry", expiry: "2030-12-31", size: "2.4 MB" },
        { id: "d2", name: "Tenant Agreement", type: "Lease", expiry: "2026-08-18", size: "840 KB" },
      ],
      tenants: [
        {
          id: "t1",
          name: "Ahmed Raza",
          phone: "+92 300 1234567",
          monthlyRent: 95000,
          leaseEnd: "2026-08-18",
          rent: [
            { month: previousMonth, paid: true, paidOn: "2026-06-03" },
            { month: currentMonth, paid: false },
          ],
        },
      ],
    },
    {
      id: "p2",
      name: "Parkside Plot",
      location: "Bahria Town, Islamabad",
      type: "Plot",
      status: "Owned",
      size: "1 Kanal",
      value: 27000000,
      color: "sage",
      documents: [{ id: "d3", name: "Allotment Letter", type: "Allotment", expiry: "", size: "1.1 MB" }],
      tenants: [],
    },
    {
      id: "p3",
      name: "Main Boulevard Shop",
      location: "Gulberg III, Lahore",
      type: "Commercial",
      status: "For Sale",
      size: "620 sq ft",
      value: 19200000,
      color: "sand",
      documents: [],
      tenants: [],
    },
  ],
  projects: [
    {
      id: "c1",
      name: "Canal View Renovation",
      propertyId: "p1",
      client: "Self",
      budget: 6500000,
      location: "DHA Phase 6, Lahore",
      link: "https://maps.google.com/?q=DHA+Phase+6+Lahore",
      coordinates: "31.5204,74.3587",
      photoUrl: "/project/canal-view-renovation.jpg",
      expenses: [
        { id: "e1", title: "Cement & sand", amount: 185000, category: "Material", date: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), vendor: "Green Builders", status: "Approved", notes: "Delivered on site" },
        { id: "e2", title: "Mason wages", amount: 72000, category: "Labour", date: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(), vendor: "Site Crew", status: "Pending", notes: "Weekly payroll" },
      ],
      transportExpenses: [
        { id: "t1", vehicleType: "Pickup", route: "Material run to site", fuelFreight: 5000, driverChallan: "Driver Ali", date: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), totalTransportExpense: 5000, notes: "Fuel advance" },
      ],
      payments: [],
    },
    {
      id: "c2",
      name: "Johar Town Residence",
      client: "M. Usman",
      budget: 12000000,
      location: "Johar Town, Lahore",
      link: "https://maps.google.com/?q=Johar+Town+Lahore",
      coordinates: "31.4778,74.2658",
      expenses: [
        { id: "e3", title: "Electrical fittings", amount: 94000, category: "Material", date: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), vendor: "ElectroLine", status: "Approved", notes: "Switches and wiring" },
      ],
      transportExpenses: [
        { id: "t2", vehicleType: "Truck", route: "Material delivery to site", fuelFreight: 18500, driverChallan: "Challan #221", date: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), totalTransportExpense: 18500, notes: "Freight paid" },
      ],
      payments: [{ id: "pay1", amount: 1200000, date: new Date(Date.now() - 6 * 86400000).toISOString() }],
    },
  ],
}

export const money = (value: number) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(value).replace("PKR", "Rs")

export const totalExpenses = (project: Project) => project.expenses.reduce((sum, item) => sum + item.amount, 0)
export const totalTransportExpenses = (project: Project) => project.transportExpenses.reduce((sum, item) => sum + item.totalTransportExpense, 0)
export const totalProjectSpend = (project: Project) => totalExpenses(project) + totalTransportExpenses(project)
export const totalPayments = (project: Project) => project.payments.reduce((sum, item) => sum + item.amount, 0)

// Budget remaining rises whenever a payment is recorded — each payment tops
// the available budget back up, rather than only spend eating into it.
export const budgetRemaining = (project: Project) => {
  const spent = totalProjectSpend(project)
  const paid = totalPayments(project)
  return project.budget !== undefined ? project.budget - spent + paid : paid - spent
}
export const last24Hours = (project: Project) => {
  const cutoff = Date.now() - 86400000
  const expenseTotal = project.expenses
    .filter((item) => new Date(item.date).getTime() >= cutoff)
    .reduce((sum, item) => sum + item.amount, 0)
  const transportTotal = project.transportExpenses
    .filter((item) => new Date(item.date).getTime() >= cutoff)
    .reduce((sum, item) => sum + item.totalTransportExpense, 0)
  return expenseTotal + transportTotal
}

export type LedgerEntry = {
  id: string
  timestamp: string
  voucherId: string
  description: string
  debit: number
  credit: number
  balance: number
  type: "expense" | "transport" | "payment"
}

// The full lifetime statement for a project: every general expense, every
// transport/freight cost, and every payment received — merged into one
// running-balance ledger sorted chronologically. This is the "lifetime
// kharcha" (lifetime spend) view: totals here always match
// totalProjectSpend()/totalPayments() exactly since it draws on the same
// three arrays.
export const getProjectLedgerEntries = (project: Project): LedgerEntry[] => {
  type Draft = Omit<LedgerEntry, "balance">
  const drafts: Draft[] = []

  for (const expense of project.expenses) {
    drafts.push({
      id: expense.id,
      timestamp: expense.date,
      voucherId: expense.id,
      description: expense.title,
      debit: expense.amount,
      credit: 0,
      type: "expense",
    })
  }

  for (const entry of project.transportExpenses) {
    drafts.push({
      id: entry.id,
      timestamp: entry.date,
      voucherId: entry.id,
      description: [entry.route, entry.vehicleType ? `(${entry.vehicleType})` : ""].filter(Boolean).join(" "),
      debit: entry.totalTransportExpense,
      credit: 0,
      type: "transport",
    })
  }

  for (const payment of project.payments) {
    drafts.push({
      id: payment.id,
      timestamp: payment.timestamp || payment.date,
      voucherId: payment.voucherId || payment.id,
      description: payment.description || "Payment received",
      debit: 0,
      credit: payment.amount,
      type: "payment",
    })
  }

  drafts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  let balance = 0
  return drafts.map((entry) => {
    balance += entry.debit - entry.credit
    return { ...entry, balance }
  })
}

export const getRecent24HourEntries = (project: Project) => {
  const now = Date.now()
  return getProjectLedgerEntries(project).filter((entry) => now - new Date(entry.timestamp).getTime() <= 86400000)
}
