"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectGroup, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useStore } from "@/components/store-provider"
import type { Property, PropertyType, PropertyStatus } from "@/lib/zameen-data"

const types: PropertyType[] = ["House", "Plot", "Commercial"]
const statuses: PropertyStatus[] = ["Owned", "Rented", "For Sale"]

export function PropertyForm({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing?: Property | null
}) {
  const { addProperty, updateProperty } = useStore()
  const [name, setName] = useState(editing?.name ?? "")
  const [location, setLocation] = useState(editing?.location ?? "")
  const [type, setType] = useState<PropertyType>(editing?.type ?? "House")
  const [status, setStatus] = useState<PropertyStatus>(editing?.status ?? "Owned")
  const [size, setSize] = useState(editing?.size ?? "")
  const [value, setValue] = useState(editing?.value ? String(editing.value) : "")

  function submit() {
    if (!name.trim()) return
    const payload = {
      name: name.trim(),
      location: location.trim(),
      type,
      status,
      size: size.trim(),
      value: Number(value) || 0,
      color: editing?.color ?? "clay",
    }
    if (editing) updateProperty(editing.id, payload)
    else addProperty(payload)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">{editing ? "Edit property" : "Add property"}</DialogTitle>
          <DialogDescription>Fill in the details. Only a name is required.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Field label="Property name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Canal View House" />
          </Field>
          <Field label="Location">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Area, city" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={type} onValueChange={(v) => setType(v as PropertyType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {types.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v as PropertyStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Size">
              <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. 10 Marla" />
            </Field>
            <Field label="Value (Rs)">
              <Input
                inputMode="numeric"
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0"
              />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim()}>
            {editing ? "Save changes" : "Add property"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
