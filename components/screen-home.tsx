"use client"

import { useStore } from "@/components/store-provider"
import { SectionTitle } from "@/components/shared"
import { Badge } from "@/components/ui/badge"
import { money, totalProjectSpend, totalPayments, last24Hours, getRecent24HourEntries, getTenantDepositSummary } from "@/lib/zameen-data"
import { expiryState } from "@/components/shared"
import { Building2, HardHat, AlertTriangle, TrendingUp, CircleDollarSign, Receipt, WalletCards, History } from "lucide-react"

export function ScreenHome({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { data } = useStore()

  const portfolioValue = data.properties.reduce((s, p) => s + p.value, 0)
  const spend24 = data.projects.reduce((s, p) => s + last24Hours(p), 0)
  // Lifetime spend = every general expense + every transport cost, ever
  // logged — matches the per-project "Lifetime spend" figure exactly.
  const totalSpend = data.projects.reduce((s, p) => s + totalProjectSpend(p), 0)

  const atRiskTenants = data.properties.flatMap((p) =>
    (p.tenants ?? [])
      .filter((t) => t.status === "active")
      .map((t) => ({ property: p.name, tenant: t.name, summary: getTenantDepositSummary(t) }))
      .filter(({ summary }) => summary.depositRemaining <= 0),
  )
  const arrearsTotal = atRiskTenants.reduce((s, r) => s + r.summary.arrears, 0)

  const expiring = data.properties.flatMap((p) =>
    p.documents
      .map((d) => ({ ...d, property: p.name, state: expiryState(d.expiry) }))
      .filter((d) => d.state.tone === "warn" || d.state.tone === "danger"),
  )

  const now = new Date()
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening"

  return (
    <div className="flex flex-col gap-5 pb-4">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{greeting},</p>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-balance">Your portfolio</h1>
      </header>

      <div className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-sm">
        <p className="text-sm text-primary-foreground/80">Total portfolio value</p>
        <p className="mt-1 font-serif text-3xl font-semibold tabular-nums">{money(portfolioValue)}</p>
        <div className="mt-4 flex gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <Building2 className="size-4" /> {data.properties.length} properties
          </span>
          <span className="flex items-center gap-1.5">
            <HardHat className="size-4" /> {data.projects.length} projects
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate("construction")}
          className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="size-4" />
          </div>
          <span className="text-xs text-muted-foreground">Spent last 24h</span>
          <span className="font-serif text-lg font-semibold tabular-nums">{money(spend24)}</span>
        </button>
        <button
          onClick={() => onNavigate("construction")}
          className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CircleDollarSign className="size-4" />
          </div>
          <span className="text-xs text-muted-foreground">Total construction spend (lifetime)</span>
          <span className="font-serif text-lg font-semibold tabular-nums">{money(totalSpend)}</span>
        </button>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <SectionTitle>Rent status</SectionTitle>
          {atRiskTenants.length > 0 && <Badge className="bg-destructive/15 text-destructive">{atRiskTenants.length} to follow up</Badge>}
        </div>
        {atRiskTenants.length === 0 ? (
          <p className="rounded-xl bg-accent/10 p-4 text-sm text-accent">Every tenant's advance is intact. Nicely done.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              {arrearsTotal > 0
                ? `${money(arrearsTotal)} owed beyond deposit, across ${atRiskTenants.length} tenant${atRiskTenants.length > 1 ? "s" : ""}.`
                : `${atRiskTenants.length} tenant${atRiskTenants.length > 1 ? "s have" : " has"} fully used up their advance.`}
            </p>
            {atRiskTenants.slice(0, 3).map((r, i) => (
              <button
                key={i}
                onClick={() => onNavigate("properties")}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-left"
              >
                <div>
                  <p className="text-sm font-medium">{r.tenant}</p>
                  <p className="text-xs text-muted-foreground">{r.property} · Advance exhausted</p>
                </div>
                {r.summary.arrears > 0 && (
                  <span className="font-serif text-sm font-semibold text-destructive">{money(r.summary.arrears)}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle>Project dashboard</SectionTitle>
        {data.projects.map((project) => {
          const spend = totalProjectSpend(project)
          const recent = last24Hours(project)
          const paid = totalPayments(project)
          const recentEntries = getRecent24HourEntries(project)
          return (
            <div key={project.id} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
                  {project.photoUrl ? <img src={project.photoUrl} alt={project.name} className="size-full object-cover" /> : <HardHat className="size-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{project.name}</p>
                  <p className="text-xs text-muted-foreground">{project.client || "No client"}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="min-w-0 rounded-lg bg-muted/60 p-2">
                  <p className="truncate text-[11px] text-muted-foreground">Lifetime spend</p>
                  <p className="truncate font-serif text-sm font-semibold">{money(spend)}</p>
                </div>
                <div className="min-w-0 rounded-lg bg-accent/10 p-2">
                  <p className="truncate text-[11px] text-accent">Last 24h</p>
                  <p className="truncate font-serif text-sm font-semibold text-accent">{money(recent)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => onNavigate("construction")} className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
                  <Receipt className="size-3" /> Expenses
                </button>
                <button onClick={() => onNavigate("construction")} className="flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
                  <WalletCards className="size-3" /> Payments
                </button>
                <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">{money(paid)} received</span>
              </div>

              {/* Last 24 hours — every expense, transport cost and payment
                  logged in the past day, in ledger style, per project. */}
              <div className="mt-3 rounded-xl border border-dashed border-border p-2">
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <History className="size-3" /> Last 24 hours
                </p>
                {recentEntries.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No recent activity in the last 24 hours.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {recentEntries.map((entry) => (
                      <div key={`${entry.type}-${entry.id}`} className="flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{entry.description}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {entry.voucherId} · {new Date(entry.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <span className={`shrink-0 font-medium tabular-nums ${entry.credit ? "text-accent" : ""}`}>
                          {entry.credit ? `+${money(entry.credit)}` : `-${money(entry.debit)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </section>

      {expiring.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionTitle>Document reminders</SectionTitle>
          {expiring.map((d) => (
            <button
              key={d.id}
              onClick={() => onNavigate("properties")}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{d.name}</p>
                <p className="text-xs text-muted-foreground">{d.property}</p>
              </div>
              <span className="text-xs font-medium text-destructive">{d.state.label}</span>
            </button>
          ))}
        </section>
      )}
    </div>
  )
}
