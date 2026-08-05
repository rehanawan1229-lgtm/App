"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useStore } from "@/components/store-provider"
import {
  money,
  totalExpenses,
  totalProjectSpend,
  budgetRemaining,
  getProjectLedgerEntries,
  type Project,
  type LedgerEntry,
} from "@/lib/zameen-data"
import { StatPill } from "@/components/shared"
import {
  Receipt,
  WalletCards,
  Plus,
  FileSpreadsheet,
  Trash2,
  ImageIcon,
  ScrollText,
  PencilLine,
  Download,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
} from "lucide-react"
import { parseQuickExpenseEntry, findProjectByName } from "@/lib/expense-utils"

type LedgerSortKey = "date" | "amount" | "description"
type LedgerSortDir = "asc" | "desc"

function sortLedgerEntries(entries: LedgerEntry[], key: LedgerSortKey, dir: LedgerSortDir): LedgerEntry[] {
  const sorted = [...entries].sort((a, b) => {
    let cmp = 0
    if (key === "date") cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    else if (key === "amount") cmp = (a.debit || a.credit) - (b.debit || b.credit)
    else cmp = a.description.localeCompare(b.description)
    return dir === "asc" ? cmp : -cmp
  })
  return sorted
}

type DetailTab = "expenses" | "payments" | "ledger" | "edit"

export function ProjectDetail({
  project,
  open,
  initialTab = "expenses",
  onOpenChange,
}: {
  project: Project | null
  open: boolean
  initialTab?: DetailTab
  onOpenChange: (o: boolean) => void
}) {
  const [tab, setTab] = useState<DetailTab>(initialTab)

  // ProjectDetail is mounted once and reused for every project (only its
  // `open`/`project`/`initialTab` props change) — so tab state must be
  // reset explicitly here. Dialog's onOpenChange only fires for
  // internally-triggered closes (Escape, overlay click), never for opens
  // driven by the parent flipping `open` — so that's not a reliable place
  // to reset which tab is showing.
  useEffect(() => {
    if (open) setTab(initialTab)
  }, [open, initialTab])

  if (!project) return null
  const spent = totalProjectSpend(project)
  const generalSpend = totalExpenses(project)
  const remaining = budgetRemaining(project)

  // Ledger gets its own minimal layout — no stat cards, no 4-way tab bar, no
  // description line, just a back button and the statement table, so it
  // reads like an opened spreadsheet rather than another app screen. Every
  // other tab keeps the normal header + tab bar.
  if (tab === "ledger") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] max-w-md flex-col overflow-y-auto">
          <DialogTitle className="sr-only">{project.name} — Ledger</DialogTitle>
          <DialogDescription className="sr-only">Full lifetime statement for {project.name}.</DialogDescription>
          <button
            type="button"
            onClick={() => setTab("expenses")}
            className="flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> Back
          </button>
          <LifetimeLedger project={project} />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col overflow-y-auto">
        <div>
          <DialogTitle className="font-serif text-xl">{project.name}</DialogTitle>
          <DialogDescription>{project.client ? `Client: ${project.client}` : "Track expenses and payments."}</DialogDescription>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StatPill label="General expense" value={money(generalSpend)} />
          <StatPill label="Lifetime spend" value={money(spent)} />
          <StatPill
            label={project.budget ? "Budget remaining" : "Net balance"}
            value={money(remaining)}
            tone={remaining < 0 ? "destructive" : "muted"}
            className="col-span-2"
          />
        </div>

        {/* Tabs are the only way into any of these views — Edit included. Nothing
            opens automatically; a tab only shows once you land on it, either via
            initialTab (set by the 4 primary buttons: Add Expenses / Add Payments /
            Ledger / Edit) or by tapping it directly below. */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as DetailTab)} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="sticky top-0 z-10 w-full bg-popover">
            <TabsTrigger value="expenses" className="flex-1">
              <Receipt className="size-4" /> Expenses
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex-1">
              <WalletCards className="size-4" /> Payments
            </TabsTrigger>
            <TabsTrigger value="ledger" className="flex-1">
              <ScrollText className="size-4" /> Ledger
            </TabsTrigger>
            <TabsTrigger value="edit" className="flex-1">
              <PencilLine className="size-4" /> Edit
            </TabsTrigger>
          </TabsList>
          <TabsContent value="expenses" className="mt-3">
            <ExpenseLedger project={project} />
          </TabsContent>
          <TabsContent value="payments" className="mt-3">
            <PaymentLedger project={project} />
          </TabsContent>
          <TabsContent value="edit" className="mt-3">
            <ProjectHeader project={project} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// The commercial-statement view: every expense, transport cost, and payment
// for the project's whole lifetime, merged into one running-balance ledger —
// with a totals footer and its own CSV export (the full statement, Debit +
// Credit columns, unlike the expenses-only export below).
function LifetimeLedger({ project }: { project: Project }) {
  const [isExporting, setIsExporting] = useState(false)
  const [sortKey, setSortKey] = useState<LedgerSortKey>("date")
  const [sortDir, setSortDir] = useState<LedgerSortDir>("desc")

  // `entries` stays in true chronological order — the running `balance` on
  // each row only makes sense relative to that order, and the totals footer
  // reads its closing balance off the last chronological entry. `sortedEntries`
  // is a display-only reordering on top of it; sorting by amount/description
  // never touches the underlying balance figures, same as a bank statement.
  const entries = getProjectLedgerEntries(project)
  const sortedEntries = useMemo(() => sortLedgerEntries(entries, sortKey, sortDir), [entries, sortKey, sortDir])
  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0)
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0)
  const closingBalance = entries.length ? entries[entries.length - 1].balance : 0

  async function exportStatement() {
    setIsExporting(true)
    try {
      const response = await fetch(`/api/projects/${project.serverId ?? project.id}/export-ledger`)
      if (!response.ok) throw new Error("Export failed")
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-statement.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={exportStatement} disabled={isExporting || entries.length === 0}>
          <Download className="size-4" /> {isExporting ? "Exporting…" : "Export"}
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No transactions recorded yet.</p>
      ) : (
        <>
          {/* Sort controls live in normal (non-scrolling, non-clipped) flow,
              above the table's own overflow-x-auto wrapper — the dropdown
              menu below is rendered in a portal by the Select component, so
              it always positions itself against this trigger and is never
              clipped or pushed out of view by the table's horizontal scroll
              container or the dialog's own scroll area. */}
          <div className="flex items-center gap-2">
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as LedgerSortKey)}>
              <SelectTrigger className="h-9 flex-1" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="amount">Sort by Amount</SelectItem>
                <SelectItem value="description">Sort by Description</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-9 shrink-0"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            >
              {sortDir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
              {sortDir === "asc" ? "Asc" : "Desc"}
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="sticky left-0 z-20 whitespace-nowrap border-r border-border bg-muted px-2 py-2 text-left font-medium shadow-[2px_0_4px_-2px_rgba(0,0,0,0.25)]">
                      Date
                    </th>
                    <th className="bg-muted/60 px-2 py-2 text-left font-medium">ID/Voucher</th>
                    <th className="bg-muted/60 px-2 py-2 text-left font-medium">Description</th>
                    <th className="bg-muted/60 px-2 py-2 text-right font-medium">Debit</th>
                    <th className="bg-muted/60 px-2 py-2 text-right font-medium">Credit</th>
                    <th className="bg-muted/60 px-2 py-2 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map((entry) => (
                    <tr key={`${entry.type}-${entry.id}`} className="border-t border-border">
                      <td className="sticky left-0 z-10 whitespace-nowrap border-r border-border bg-popover px-2 py-2 text-muted-foreground shadow-[2px_0_4px_-2px_rgba(0,0,0,0.25)]">
                        {new Date(entry.timestamp).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">{entry.voucherId}</td>
                      <td className="px-2 py-2">{entry.description}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{entry.debit ? money(entry.debit) : "—"}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-accent">
                        {entry.credit ? money(entry.credit) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-right font-medium tabular-nums">{money(entry.balance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="font-medium">
                  <tr className="border-t border-border">
                    <td colSpan={3} className="sticky left-0 z-10 border-r border-border bg-muted px-2 py-2 text-right shadow-[2px_0_4px_-2px_rgba(0,0,0,0.25)]">
                      Totals
                    </td>
                    <td className="whitespace-nowrap bg-muted/40 px-2 py-2 text-right tabular-nums">{money(totalDebit)}</td>
                    <td className="whitespace-nowrap bg-muted/40 px-2 py-2 text-right tabular-nums text-accent">{money(totalCredit)}</td>
                    <td className="whitespace-nowrap bg-muted/40 px-2 py-2 text-right tabular-nums">{money(closingBalance)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Closing balance — the lifetime kharcha summary, styled like a
              standard account-statement closing line. */}
          <div className="rounded-xl bg-primary p-4 text-primary-foreground">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-primary-foreground/80">Closing balance</p>
              <p className="font-serif text-2xl font-semibold tabular-nums">{money(closingBalance)}</p>
            </div>
            <p className="mt-1 text-xs text-primary-foreground/70">
              Total debit {money(totalDebit)} minus total credit {money(totalCredit)} — the net amount spent on this project, lifetime, after payments received.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

function ProjectHeader({ project }: { project: Project }) {
  const { updateProject } = useStore()
  const [name, setName] = useState(project.name)
  const [location, setLocation] = useState(project.location ?? "")
  const [link, setLink] = useState(project.link ?? "")
  const [coordinates, setCoordinates] = useState(project.coordinates ?? "")
  const [budget, setBudget] = useState(project.budget?.toString() ?? "")
  const [client, setClient] = useState(project.client ?? "")
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")

  const save = () => {
    updateProject(project.id, {
      name: name.trim() || project.name,
      location: location.trim(),
      link: link.trim(),
      coordinates: coordinates.trim(),
      budget: budget ? Number(budget) : undefined,
      client: client.trim() || undefined,
    })
    setMessage("Project details saved.")
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage("Uploading project photo…")
    const formData = new FormData()
    formData.append("file", file)
    formData.append("projectId", project.id)

    try {
      const response = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Upload failed")
      updateProject(project.id, { photoUrl: data.url, imageUrl: data.url })
      setMessage("Project photo saved to the Project folder.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <Badge variant="secondary">Editable project</Badge>
        <p className="mt-2 text-xs text-muted-foreground">Update the project's name, budget, location, map link, or photo.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
        <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client" />
        <Input inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Budget" />
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" />
      </div>
      <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Google Maps link" />
      <Input value={coordinates} onChange={(e) => setCoordinates(e.target.value)} placeholder="Coordinates (lat,lng)" />
      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
        <ImageIcon className="size-4" />
        <span>{uploading ? "Uploading…" : "Upload project photo"}</span>
        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </label>
      <Button size="sm" onClick={save}>Save project details</Button>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  )
}

function ExpenseLedger({ project }: { project: Project }) {
  const { addExpense, updateExpense, deleteExpense, data } = useStore()
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [vendor, setVendor] = useState("")
  const [status, setStatus] = useState("Pending")
  const [notes, setNotes] = useState("")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [quickInput, setQuickInput] = useState("")
  const [message, setMessage] = useState("")
  const [isExporting, setIsExporting] = useState(false)

  function add() {
    if (!title.trim() || !amount) return
    addExpense(project.id, {
      title: title.trim(),
      amount: Number(amount),
      category: category.trim() || "Other",
      vendor: vendor.trim(),
      status: status.trim() || "Pending",
      notes: notes.trim(),
      date,
    })
    setTitle("")
    setAmount("")
    setCategory("")
    setVendor("")
    setStatus("Pending")
    setNotes("")
    setDate(new Date().toISOString().slice(0, 10))
    setMessage("General expense added.")
  }

  function handleQuickEntry() {
    const entry = parseQuickExpenseEntry(quickInput)
    if (!entry) {
      setMessage("Use a format like: Project Alpha -> General -> Cement: Rs 5000, Date: 2026-07-28")
      return
    }

    if (entry.kind === "update") {
      const targetProject = entry.projectName ? findProjectByName(data.projects, entry.projectName) : project
      if (!targetProject) {
        setMessage(`Project ${entry.projectName || project.name} not found.`)
        return
      }
      const matchingExpense = targetProject.expenses.find((item) => item.title.toLowerCase() === entry.target.toLowerCase())
      if (!matchingExpense) {
        setMessage(`Expense ${entry.target} not found.`)
        return
      }
      const newValue = entry.action === "expense-amount" ? Number(entry.value) : entry.value
      updateExpense(targetProject.id, matchingExpense.id, {
        ...(entry.action === "expense-amount" ? { amount: Number(newValue) } : {}),
        ...(entry.action === "expense-title" ? { title: String(newValue) } : {}),
        ...(entry.action === "expense-category" ? { category: String(newValue) } : {}),
      })
      setQuickInput("")
      setMessage(`Updated ${matchingExpense.title}.`)
      return
    }

    if (entry.kind !== "general") {
      setMessage("Use a format like: Project Alpha -> General -> Cement: Rs 5000, Date: 2026-07-28")
      return
    }

    const targetProject = findProjectByName(data.projects, entry.projectName)
    if (!targetProject) {
      setMessage(`Project ${entry.projectName} not found.`)
      return
    }
    addExpense(targetProject.id, {
      title: entry.title,
      amount: entry.amount,
      category: entry.category || "Other",
      vendor: entry.vendor || "",
      status: entry.status || "Pending",
      notes: entry.notes || "",
      date: entry.date,
    })
    setQuickInput("")
    setMessage(`Added to ${targetProject.name}.`)
  }

  // Downloads the plain expenses ledger (Date/Time, Voucher ID, Description,
  // Debit, Running Balance) straight from the server — no external Python
  // process involved, so it works the same on any host.
  async function exportExcel() {
    setIsExporting(true)
    try {
      const response = await fetch(`/api/projects/${project.serverId ?? project.id}/export-expenses`)
      if (!response.ok) throw new Error("Export failed")
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-expenses.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      setMessage("Expenses exported.")
    } catch {
      setMessage("Export failed — try again once you're back online.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Expense title" />
        <div className="grid grid-cols-2 gap-2">
          <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Amount" />
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Vendor" />
          <Input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Status" />
        </div>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
        <Button size="sm" onClick={add} disabled={!title.trim() || !amount}>
          <Plus /> Add general expense
        </Button>
      </div>

      <div className="rounded-xl border border-dashed border-border p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Quick text entry</p>
        <Textarea value={quickInput} onChange={(e) => setQuickInput(e.target.value)} placeholder='Project Alpha -> General -> Cement: Rs 5000, Date: 2026-07-28' />
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={handleQuickEntry} disabled={!quickInput.trim()}>
            Parse and add
          </Button>
          <Button size="sm" variant="outline" onClick={exportExcel} disabled={isExporting}>
            <FileSpreadsheet className="size-4" /> {isExporting ? "Exporting…" : "Export Expenses"}
          </Button>
        </div>
        {message && <p className="mt-2 text-xs text-muted-foreground">{message}</p>}
      </div>

      {project.expenses.map((e) => (
        <div key={e.id} className="rounded-xl bg-muted/60 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{e.title}</p>
              <p className="text-xs text-muted-foreground">
                {e.category} · {e.vendor || "No vendor"} · {new Date(e.date).toLocaleDateString("en-GB")}
              </p>
            </div>
            <div className="flex gap-1">
              <Button size="icon-xs" variant="ghost" onClick={() => updateExpense(project.id, e.id, { amount: (e.amount || 0) + 1000 })}>+1000</Button>
              <Button size="icon-xs" variant="ghost" onClick={() => deleteExpense(project.id, e.id)}><Trash2 className="size-3" /></Button>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{e.status || "Pending"}</p>
            <p className="font-serif text-sm font-semibold">{money(e.amount)}</p>
          </div>
        </div>
      ))}
      {project.expenses.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No general expenses yet.</p>}
    </div>
  )
}

function PaymentLedger({ project }: { project: Project }) {
  const { addPayment } = useStore()
  const [amount, setAmount] = useState("")
  const [voucherId, setVoucherId] = useState("")
  const [description, setDescription] = useState("")
  const [message, setMessage] = useState("")

  function add() {
    if (!amount || !voucherId || !description) {
      setMessage("Please enter amount, voucher ID, and description.")
      return
    }

    addPayment(project.id, {
      amount: Number(amount),
      voucherId,
      description,
      timestamp: new Date().toISOString(),
    })
    setAmount("")
    setVoucherId("")
    setDescription("")
    setMessage("Payment recorded and balance updated.")
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-2">
        <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Payment amount" />
        <Input value={voucherId} onChange={(e) => setVoucherId(e.target.value)} placeholder="Voucher / transaction ID" />
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
        <Button onClick={add} disabled={!amount || !voucherId || !description}>
          <Plus /> Record payment
        </Button>
      </div>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
      {project.payments.map((p) => (
        <div key={p.id} className="flex items-start justify-between rounded-xl bg-accent/10 p-3">
          <div>
            <p className="text-sm font-medium">{p.description || "Payment received"}</p>
            <p className="text-xs text-muted-foreground">{p.voucherId || p.id} · {new Date(p.date).toLocaleDateString("en-GB")}</p>
          </div>
          <p className="font-serif text-sm font-semibold text-accent">+{money(p.amount)}</p>
        </div>
      ))}
      {project.payments.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No payments yet.</p>}
    </div>
  )
}
