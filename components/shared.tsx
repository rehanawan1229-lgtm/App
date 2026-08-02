"use client"

import { cn } from "@/lib/utils"
import type { PropertyType } from "@/lib/zameen-data"

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
    <div className={cn("flex flex-col gap-1 rounded-xl bg-muted/60 p-3", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={cn("font-serif text-base font-semibold tabular-nums", toneClass)}>{value}</span>
    </div>
  )
}
