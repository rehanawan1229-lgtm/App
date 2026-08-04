"use client"

import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PropertyType } from "@/lib/zameen-data"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

// A proper in-app confirmation dialog instead of the browser's native
// window.confirm(): it always renders the same way everywhere (native
// confirm can silently do nothing in some installed-app/PWA contexts), and
// it's clearer for a first-time user — a plain title, one line of context,
// and two unmistakable buttons instead of a small system popup.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </div>
          <DialogTitle className="font-serif text-lg font-semibold">{title}</DialogTitle>
          {description && <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription>}
        </div>
        <div className="mt-2 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => {
              onOpenChange(false)
              onConfirm()
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Small hook so callers just get back { confirm(), dialog } — call confirm()
// with the message details, render {dialog} once in the tree, done. Keeps
// every delete button's onClick a one-liner instead of managing its own
// open/pending state.
export function useConfirmDialog() {
  const [state, setState] = useState<{
    title: string
    description?: string
    confirmLabel?: string
    onConfirm: () => void
  } | null>(null)

  function confirm(args: { title: string; description?: string; confirmLabel?: string; onConfirm: () => void }) {
    setState(args)
  }

  const dialog = (
    <ConfirmDialog
      open={!!state}
      onOpenChange={(o) => !o && setState(null)}
      title={state?.title ?? ""}
      description={state?.description}
      confirmLabel={state?.confirmLabel}
      onConfirm={() => state?.onConfirm()}
    />
  )

  return { confirm, dialog }
}

export const propertyImage: Record<PropertyType, string> = {
  House: "/prop-house.png",
  Plot: "/prop-plot.png",
  Commercial: "/prop-commercial.png",
}

export function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

export function expiryState(dateStr: string): { label: string; tone: "ok" | "warn" | "danger" | "none" } {
  const days = daysUntil(dateStr)
  if (days === null) return { label: "No expiry", tone: "none" }
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, tone: "danger" }
  if (days <= 60) return { label: `Expires in ${days}d`, tone: "warn" }
  return { label: `Valid · ${new Date(dateStr).toLocaleDateString("en-GB")}`, tone: "ok" }
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("font-serif text-lg font-semibold tracking-tight text-foreground", className)}>{children}</h2>
  )
}

export function StatPill({
  label,
  value,
  tone = "muted",
  className,
}: {
  label: string
  value: string
  tone?: "muted" | "accent" | "destructive"
  className?: string
}) {
  const toneClass = {
    muted: "text-foreground",
    accent: "text-accent",
    destructive: "text-destructive",
  }[tone]
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 rounded-xl bg-muted/60 p-3", className)}>
      <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
      <span className={cn("truncate font-serif text-base font-semibold tabular-nums", toneClass)}>{value}</span>
    </div>
  )
}
