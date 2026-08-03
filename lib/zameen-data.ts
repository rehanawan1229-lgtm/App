export type PropertyType = "House" | "Plot" | "Commercial"
export type PropertyStatus = "Owned" | "Rented" | "For Sale"

// A document attached to either a property or a tenant — identical shape,
// so the same upload/view/export UI works for both.
export type UploadedDocument = {
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

export type PropertyDocument = UploadedDocument
export type TenantDocument = UploadedDocument

export type TenantPayment = {
  id: string
  date: string
  amount: number
  note?: string
}

export type Tenant = {
  id: string
  name: string
  phone: string
  cnic: string
  guardianName: string
  address: string
  occupation: string
  emergencyContact: string
  monthlyRent: number
  // The fixed advance/security deposit amount agreed at move-in. Rent that
  // goes unpaid for a month is quietly drawn down from this instead of
  // being a manual "unpaid" checkbox — see getTenantLedgerEntries().
  securityDeposit: number
  leaseStart: string
  leaseEnd: string // set once the tenancy has ended; empty while active
  status: "active" | "ended"
  notes: string
  payments: TenantPayment[]
  documents: TenantDocument[]
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

const monthsAgoIso = (n: number) => {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - n)
  return d.toISOString().slice(0, 10)
}

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
      documents: [{ id: "d1", name: "Property Registry", type: "Registry", expiry: "2030-12-31", size: "2.4 MB" }],
      tenants: [
        {
          id: "t1",
          name: "Ahmed Raza",
          phone: "+92 300 1234567",
          cnic: "35202-1234567-1",
          guardianName: "Muhammad Raza",
          address: "House 12, Street 4, Gulshan-e-Ravi, Lahore",
          occupation: "Bank Manager",
          emergencyContact: "+92 300 7654321",
          monthlyRent: 95000,
          securityDeposit: 190000,
          leaseStart: monthsAgoIso(2),
          leaseEnd: "",
          status: "active",
          notes: "",
          payments: [{ id: "pay1", date: monthsAgoIso(1), amount: 95000, note: "Cash — previous month" }],
          documents: [{ id: "d2", name: "Tenant Agreement", type: "Lease", expiry: "2026-08-18", size: "840 KB" }],
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

// ---------------------------------------------------------------------------
// Tenant rent + security-deposit ledger
//
// A tenant pays a fixed security deposit ("advance") up front. Every
// calendar month after move-in, one month's rent comes due automatically —
// there's no manual "mark unpaid" step. If the tenant hasn't covered that
// month by the time it's due, the shortfall is simply drawn from the
// deposit. Any money the tenant later pays first tops the deposit back up
// to its original amount, and only once it's fully restored does the rest
// count as rent paid ahead for future months. One running number captures
// all of this — see the worked example in getTenantDepositSummary below.
// ---------------------------------------------------------------------------

function monthsElapsedSinceLease(leaseStart: string, cutoff: Date): number {
  if (!leaseStart) return 0
  const start = new Date(leaseStart)
  if (Number.isNaN(start.getTime()) || start > cutoff) return 0
  // Whole months since move-in, counted from the move-in day itself (not
  // the 1st of the calendar month) — a lease starting on the 28th doesn't
  // owe a second month's rent the moment the calendar flips a few days
  // later; the next charge is due on the 28th of the following month.
  let months = (cutoff.getFullYear() - start.getFullYear()) * 12 + (cutoff.getMonth() - start.getMonth())
  if (cutoff.getDate() < start.getDate()) months -= 1
  // Plus the first month's rent, due immediately at move-in.
  return Math.max(0, months) + 1
}

export type TenantLedgerEntry = {
  id: string
  timestamp: string
  kind: "deposit" | "rent-due" | "payment"
  label: string
  debit: number
  credit: number
  balance: number
}

// Every line that makes up a tenant's lifetime record: the deposit itself,
// one rent-due line per elapsed month, and every payment on record —
// merged chronologically into a single running balance. Credit (deposit +
// payments) raises the balance, debit (rent due) lowers it, so the balance
// at any point *is* the deposit/credit position at that moment — see
// getTenantDepositSummary for how that number is read.
export function getTenantLedgerEntries(tenant: Tenant, asOf: Date = new Date()): TenantLedgerEntry[] {
  type Draft = Omit<TenantLedgerEntry, "id" | "balance"> & { sourceId?: string }
  const drafts: Draft[] = []

  if (tenant.leaseStart) {
    drafts.push({
      timestamp: tenant.leaseStart,
      kind: "deposit",
      label: "Security deposit received",
      debit: 0,
      credit: tenant.securityDeposit,
    })
  }

  const cutoff = tenant.status === "ended" && tenant.leaseEnd ? new Date(tenant.leaseEnd) : asOf
  const monthCount = monthsElapsedSinceLease(tenant.leaseStart, cutoff)
  const start = tenant.leaseStart ? new Date(tenant.leaseStart) : cutoff
  for (let i = 0; i < monthCount; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, start.getDate())
    drafts.push({
      timestamp: d.toISOString(),
      kind: "rent-due",
      label: `Rent due — ${d.toLocaleString("en-US", { month: "long", year: "numeric" })}`,
      debit: tenant.monthlyRent,
      credit: 0,
    })
  }

  for (const payment of tenant.payments ?? []) {
    drafts.push({
      timestamp: payment.date,
      kind: "payment",
      label: payment.note?.trim() || "Payment received",
      debit: 0,
      credit: payment.amount,
      sourceId: payment.id,
    })
  }

  drafts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  let balance = 0
  return drafts.map((d, i) => {
    balance += d.credit - d.debit
    return { id: d.sourceId ?? `${tenant.id}-${i}`, timestamp: d.timestamp, kind: d.kind, label: d.label, debit: d.debit, credit: d.credit, balance }
  })
}

export type TenantDepositSummary = {
  totalDue: number
  totalPaid: number
  depositTarget: number
  depositRemaining: number
  advanceCredit: number
  arrears: number
  monthsAheadPaid: number
}

// Example: Rs 100,000 deposit, Rs 50,000/month rent. Tenant misses a
// month → depositRemaining drops to 50,000. Tenant then pays 150,000 →
// 50,000 restores the deposit to 100,000, and the remaining 100,000 covers
// the next two months as advanceCredit (monthsAheadPaid = 2).
export function getTenantDepositSummary(tenant: Tenant, asOf: Date = new Date()): TenantDepositSummary {
  const entries = getTenantLedgerEntries(tenant, asOf)
  const totalDue = entries.filter((e) => e.kind === "rent-due").reduce((s, e) => s + e.debit, 0)
  const totalPaid = entries.filter((e) => e.kind === "payment").reduce((s, e) => s + e.credit, 0)
  const net = entries.length ? entries[entries.length - 1].balance : tenant.securityDeposit
  const depositRemaining = Math.max(0, Math.min(net, tenant.securityDeposit))
  const advanceCredit = Math.max(0, net - tenant.securityDeposit)
  const arrears = Math.max(0, -net)
  return {
    totalDue,
    totalPaid,
    depositTarget: tenant.securityDeposit,
    depositRemaining,
    advanceCredit,
    arrears,
    monthsAheadPaid: tenant.monthlyRent > 0 ? Math.floor(advanceCredit / tenant.monthlyRent) : 0,
  }
}

export type TenantStatusTone = "ok" | "warn" | "danger" | "accent" | "muted"

// The at-a-glance badge shown against a tenant everywhere in the app — this
// is the "notify us the advance has run out" signal the landlord watches
// for, always visible rather than a one-off toast that's easy to miss.
export function tenantStatusBadge(tenant: Tenant, asOf: Date = new Date()): { label: string; tone: TenantStatusTone } {
  if (tenant.status === "ended") return { label: "Tenancy ended", tone: "muted" }
  const s = getTenantDepositSummary(tenant, asOf)
  if (s.arrears > 0) return { label: `Advance exhausted · ${money(s.arrears)} owed`, tone: "danger" }
  if (s.depositRemaining <= 0) return { label: "Advance exhausted", tone: "danger" }
  if (s.advanceCredit > 0) return { label: `${s.monthsAheadPaid} month${s.monthsAheadPaid === 1 ? "" : "s"} paid ahead`, tone: "accent" }
  if (s.depositRemaining < s.depositTarget) return { label: `${money(s.depositRemaining)} advance left`, tone: "warn" }
  return { label: "Advance intact", tone: "ok" }
}
