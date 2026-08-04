"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { Search, Plus, MapPin, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { useStore } from "@/components/store-provider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PropertyForm } from "@/components/property-form"
import { PropertyDetail } from "@/components/property-detail"
import { propertyImage, useConfirmDialog } from "@/components/shared"
import { money, type Property, type PropertyType } from "@/lib/zameen-data"

export function ScreenProperties() {
  const { data, deleteProperty } = useStore()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<"All" | PropertyType>("All")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Property | null>(null)
  const { confirm, dialog: confirmDialog } = useConfirmDialog()
  // Holding the id (not the Property object) means the dialog always reads
  // the live record from `data.properties` on every render. If we stored the
  // object itself, deleting a document/tenant/payment inside the open dialog
  // would update the store but the dialog would keep showing the old
  // snapshot until it was closed and reopened.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const selected = selectedId ? data.properties.find((p) => p.id === selectedId) ?? null : null

  const filtered = useMemo(
    () =>
      data.properties.filter(
        (p) =>
          (filter === "All" || p.type === filter) &&
          `${p.name} ${p.location}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [data.properties, filter, query],
  )

  function openAdd() {
    setEditing(null)
    setFormOpen(true)
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Portfolio</p>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Properties</h1>
        </div>
        <Button size="icon-lg" onClick={openAdd} aria-label="Add property">
          <Plus />
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search properties"
          className="h-10 pl-9"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["All", "House", "Plot", "Commercial"] as const).map((item) => (
          <Button
            key={item}
            size="sm"
            variant={filter === item ? "default" : "outline"}
            onClick={() => setFilter(item)}
            className="shrink-0"
          >
            {item}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((property) => (
          <article key={property.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <button className="block w-full text-left" onClick={() => setSelectedId(property.id)}>
              <div className="relative h-36 w-full">
                <Image
                  src={propertyImage[property.type] || "/placeholder.svg"}
                  alt={property.name}
                  fill
                  className="object-cover"
                />
                <Badge className="absolute left-3 top-3 bg-card text-card-foreground shadow">{property.status}</Badge>
              </div>
              <div className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-serif text-lg font-semibold text-balance">{property.name}</h2>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" /> {property.location || "No location set"}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{property.type}</span>
                    <span>·</span>
                    <span>{property.size || "Size not set"}</span>
                  </div>
                </div>
                <p className="font-serif text-sm font-semibold text-primary">{property.value ? money(property.value) : "—"}</p>
              </div>
            </button>
            <div className="relative border-t border-border px-3 py-2">
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => setMenuId(menuId === property.id ? null : property.id)}
              >
                <MoreHorizontal /> Manage
              </Button>
              {menuId === property.id && (
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setEditing(property)
                      setFormOpen(true)
                      setMenuId(null)
                    }}
                  >
                    <Pencil /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      setMenuId(null)
                      confirm({
                        title: "Delete this property?",
                        description: `"${property.name}" and all its documents, tenants, and rent history will be permanently removed. This can't be undone.`,
                        confirmLabel: "Delete property",
                        onConfirm: () => deleteProperty(property.id),
                      })
                    }}
                  >
                    <Trash2 /> Delete
                  </Button>
                </div>
              )}
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="font-serif text-lg font-semibold">No properties found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try another search or add a property.</p>
            <Button className="mt-4" onClick={openAdd}>
              <Plus /> Add property
            </Button>
          </div>
        )}
      </div>

      {formOpen && <PropertyForm key={editing?.id ?? "new"} open={formOpen} onOpenChange={setFormOpen} editing={editing} />}
      <PropertyDetail property={selected} open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)} />
      {confirmDialog}
    </div>
  )
}
