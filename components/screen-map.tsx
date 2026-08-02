"use client"

import { useMemo, useState } from "react"
import { Building2, Home, MapPin, Store } from "lucide-react"
import { useStore } from "@/components/store-provider"
import { Badge } from "@/components/ui/badge"
import { money, totalProjectSpend, totalPayments } from "@/lib/zameen-data"

type MarkerItem = {
  id: string
  name: string
  type: string
  location: string
  coordinates?: string
  image?: string
  spend: number
  payments: number
}

// Deterministic, collision-free placement across a grid — every item gets
// its own cell purely from its position in the list, so two items can never
// render on top of each other (a hash based only on id.length previously let
// same-length ids like "p1"/"c1" collide exactly).
function markerPosition(index: number, total: number) {
  const cols = Math.max(Math.ceil(Math.sqrt(total)), 1)
  const rows = Math.max(Math.ceil(total / cols), 1)
  const row = Math.floor(index / cols)
  const col = index % cols
  const left = 14 + col * (72 / Math.max(cols - 1, 1))
  const top = 20 + row * (52 / Math.max(rows - 1, 1))
  return { left: `${Math.min(left, 88)}%`, top: `${Math.min(top, 76)}%` }
}

export function ScreenMap() {
  const { data } = useStore()
  const [selected, setSelected] = useState<MarkerItem | null>(null)
  const online = typeof window !== "undefined" ? window.navigator.onLine : true

  const mapItems = useMemo<MarkerItem[]>(() => {
    const projects = data.projects.map((project) => ({
      id: project.id,
      name: project.name,
      type: "Project",
      location: project.location || "Location pending",
      coordinates: project.coordinates,
      image: project.photoUrl,
      spend: totalProjectSpend(project),
      payments: totalPayments(project),
    }))
    const properties = data.properties.map((property) => ({
      id: property.id,
      name: property.name,
      type: property.type,
      location: property.location,
      coordinates: undefined,
      image: undefined,
      spend: 0,
      payments: 0,
    }))
    return [...projects, ...properties]
  }, [data])

  const selectedItem = selected ?? mapItems[0] ?? null

  const mapEmbedUrl = selectedItem?.coordinates
    ? `https://www.google.com/maps?q=${encodeURIComponent(selectedItem.coordinates)}&z=14&output=embed`
    : "https://www.google.com/maps?q=Lahore&z=10&output=embed"

  return (
    <div className="flex flex-col gap-4 pb-4">
      <header>
        <p className="text-sm text-muted-foreground">Location overview</p>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Property map</h1>
      </header>

      <div className="relative h-[58vh] min-h-96 overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
        {online ? (
          <iframe title="Map view" src={mapEmbedUrl} className="h-full w-full" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted/80 p-4 text-center text-sm text-muted-foreground">
            Offline mode: the live map is unavailable, but your project pins and location notes remain available.
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.3),transparent_35%)]" />
        {mapItems.map((item, index) => {
          const Icon = item.type === "House" ? Home : item.type === "Commercial" ? Store : Building2
          const { left, top } = markerPosition(index, mapItems.length)
          return (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className="absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-card bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
              style={{ left, top }}
              aria-label={`Select ${item.name}`}
            >
              <Icon className="size-4" />
            </button>
          )
        })}

        {selectedItem && (
          <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
                {selectedItem.image ? <img src={selectedItem.image} alt={selectedItem.name} className="size-full object-cover" /> : <Building2 className="size-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <Badge variant="secondary">{selectedItem.type}</Badge>
                <h2 className="mt-1 truncate font-serif text-lg font-semibold">{selectedItem.name}</h2>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" /> {selectedItem.location}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{money(selectedItem.spend)} spent</span>
                  <span>•</span>
                  <span>{money(selectedItem.payments)} received</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="text-center text-xs text-muted-foreground">Tap a marker to preview the property or project card.</p>
    </div>
  )
}
