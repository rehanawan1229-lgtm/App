"use client"

import { useState } from "react"
import { Plus, HardHat, Clock, Trash2, Receipt, WalletCards, ScrollText, PencilLine, ImageIcon } from "lucide-react"
import { useStore } from "@/components/store-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SectionTitle, StatPill, useConfirmDialog } from "@/components/shared"
import { ProjectDetail } from "@/components/project-detail"
import { money, totalProjectSpend, budgetRemaining, last24Hours, type Project } from "@/lib/zameen-data"

export function ScreenConstruction() {
  const { data, addProject, deleteProject } = useStore()
  const [quickName, setQuickName] = useState("")
  const [selected, setSelected] = useState<Project | null>(null)
  const [initialTab, setInitialTab] = useState<"expenses" | "payments" | "ledger" | "edit">("expenses")
  const { confirm, dialog: confirmDialog } = useConfirmDialog()

  const grandTotal = data.projects.reduce((s, p) => s + totalProjectSpend(p), 0)
  const grand24 = data.projects.reduce((s, p) => s + last24Hours(p), 0)

  function quickAdd() {
    if (!quickName.trim()) return
    addProject({ name: quickName.trim() })
    setQuickName("")
  }

  const selectedLive = selected ? data.projects.find((p) => p.id === selected.id) ?? null : null

  return (
    <div className="flex flex-col gap-4 pb-4">
      <header>
        <p className="text-sm text-muted-foreground">Construction</p>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Projects</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatPill label="Total spend (all)" value={money(grandTotal)} />
        <StatPill label="Last 24h (all)" value={money(grand24)} tone="accent" />
      </div>

      <div className="flex gap-2 rounded-2xl border border-dashed border-border p-2">
        <Input
          value={quickName}
          onChange={(e) => setQuickName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) quickAdd()
          }}
          placeholder="Quick add — just a project name"
          className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button onClick={quickAdd} disabled={!quickName.trim()}>
          <Plus /> Add
        </Button>
      </div>

      <SectionTitle>Active projects</SectionTitle>
      <div className="flex flex-col gap-3">
        {data.projects.map((project) => {
          const spent = totalProjectSpend(project)
          const remaining = budgetRemaining(project)
          const recent = last24Hours(project)
          return (
            <article key={project.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
                    {project.photoUrl ? (
                      <img src={project.photoUrl} alt={project.name} className="size-full object-cover" />
                    ) : (
                      <HardHat className="size-5" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-serif text-base font-semibold leading-tight text-balance">{project.name}</h2>
                    <p className="text-xs text-muted-foreground">{project.client ? `Client: ${project.client}` : "No client set"}</p>
                  </div>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Delete ${project.name}`}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    confirm({
                      title: "Delete this project?",
                      description: `"${project.name}" and all its expenses, transport entries, and payments will be permanently removed. This can't be undone.`,
                      confirmLabel: "Delete project",
                      onConfirm: () => deleteProject(project.id),
                    })
                  }}
                >
                  <Trash2 className="size-4" />
                  <span className="sr-only">Delete project</span>
                </Button>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="min-w-0 rounded-lg bg-muted/60 p-2">
                  <p className="truncate text-[11px] text-muted-foreground">Total spend</p>
                  <p className="truncate font-serif text-sm font-semibold tabular-nums">{money(spent)}</p>
                </div>
                <div className="min-w-0 rounded-lg bg-accent/10 p-2">
                  <p className="flex items-center gap-1 truncate text-[11px] text-accent">
                    <Clock className="size-3 shrink-0" /> Last 24h
                  </p>
                  <p className="truncate font-serif text-sm font-semibold tabular-nums text-accent">{money(recent)}</p>
                </div>
                <div className="min-w-0 rounded-lg bg-muted/60 p-2">
                  <p className="truncate text-[11px] text-muted-foreground">Balance</p>
                  <p className="truncate font-serif text-sm font-semibold tabular-nums">{money(remaining)}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelected(project)
                    setInitialTab("expenses")
                  }}
                >
                  <Receipt className="size-4" /> Add Expenses
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelected(project)
                    setInitialTab("payments")
                  }}
                >
                  <WalletCards className="size-4" /> Add Payments
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelected(project)
                    setInitialTab("ledger")
                  }}
                >
                  <ScrollText className="size-4" /> Ledger
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelected(project)
                    setInitialTab("edit")
                  }}
                >
                  <PencilLine className="size-4" /> Edit
                </Button>
              </div>
            </article>
          )
        })}
      </div>

      <ProjectDetail
        project={selectedLive}
        open={!!selected}
        initialTab={initialTab}
        onOpenChange={(o) => {
          if (!o) {
            setSelected(null)
            setInitialTab("expenses")
          }
        }}
      />
      {confirmDialog}
    </div>
  )
}
