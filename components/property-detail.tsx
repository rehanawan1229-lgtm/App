"use client"

import { useState } from "react"
import Image from "next/image"
import JSZip from "jszip"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useStore } from "@/components/store-provider"
import { propertyImage, expiryState, StatPill } from "@/components/shared"
import { money, type Property, type PropertyDocument } from "@/lib/zameen-data"
import {
  MapPin,
  FileText,
  Users,
  Trash2,
  Plus,
  CheckCircle2,
  Circle,
  Home,
  Download,
  Archive,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function PropertyDetail({
  property,
  open,
  onOpenChange,
}: {
  property: Property | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  if (!property) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto p-0">
        <DialogTitle className="sr-only">{property.name}</DialogTitle>
        <div className="relative h-40 w-full overflow-hidden rounded-t-xl">
          <Image src={propertyImage[property.type] || "/placeholder.svg"} alt={property.name} fill className="object-cover" />
          <div className="absolute inset-0 bg-foreground/45" />
          <div className="absolute bottom-3 left-4 right-4 text-primary-foreground">
            <h2 className="font-serif text-xl font-semibold text-primary-foreground text-balance">{property.name}</h2>
            <p className="flex items-center gap-1 text-sm text-primary-foreground/85">
              <MapPin className="size-3.5" /> {property.location || "No location set"}
            </p>
          </div>
        </div>

        <div className="p-4">
          <PropertyTabs property={property} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PropertyTabs({ property }: { property: Property }) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="overview" className="flex-1 gap-1">
          <Home className="size-3.5" /> Info
        </TabsTrigger>
        <TabsTrigger value="documents" className="flex-1 gap-1">
          <FileText className="size-3.5" /> Docs
        </TabsTrigger>
        <TabsTrigger value="tenants" className="flex-1 gap-1">
          <Users className="size-3.5" /> Rent
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <div className="grid grid-cols-2 gap-3">
          <StatPill label="Type" value={property.type} />
          <StatPill label="Status" value={property.status} />
          <StatPill label="Size" value={property.size || "—"} />
          <StatPill label="Est. value" value={property.value ? money(property.value) : "—"} tone="accent" />
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <MapCanvas label={property.location || property.name} />
        </div>
      </TabsContent>

      <TabsContent value="documents" className="mt-4">
        <DocumentsTab property={property} />
      </TabsContent>

      <TabsContent value="tenants" className="mt-4">
        <TenantsTab property={property} />
      </TabsContent>
    </Tabs>
  )
}

// Kept comfortably inside typical browser localStorage limits (this app's
// whole state — properties, projects, everything — shares one ~5-10MB quota,
// and a data-URL copy of a file runs about a third bigger than the file
// itself).
const MAX_DOCUMENT_SIZE = 4 * 1024 * 1024

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function resolveDownloadName(doc: PropertyDocument) {
  const ext = doc.fileName?.match(/\.[^.]+$/)?.[0] ?? ""
  return doc.name.toLowerCase().endsWith(ext.toLowerCase()) ? doc.name : `${doc.name}${ext}`
}

function downloadDocument(doc: PropertyDocument) {
  if (!doc.dataUrl) return
  const a = document.createElement("a")
  a.href = doc.dataUrl
  a.download = resolveDownloadName(doc)
  document.body.appendChild(a)
  a.click()
  a.remove()
}

// Bundles every attached document into a single .zip — one click, one
// download — each entry named exactly as it shows in the list (deduped if
// two documents happen to share a name).
async function exportAllDocuments(property: Property) {
  const docs = (property.documents ?? []).filter((d): d is PropertyDocument & { dataUrl: string } => Boolean(d.dataUrl))
  if (docs.length === 0) return

  const zip = new JSZip()
  const usedNames = new Set<string>()
  for (const doc of docs) {
    const base64 = doc.dataUrl.split(",")[1] ?? ""
    const base = resolveDownloadName(doc)
    let finalName = base
    let n = 1
    while (usedNames.has(finalName)) {
      const dot = base.lastIndexOf(".")
      finalName = dot > -1 ? `${base.slice(0, dot)} (${n})${base.slice(dot)}` : `${base} (${n})`
      n++
    }
    usedNames.add(finalName)
    zip.file(finalName, base64, { base64: true })
  }

  const blob = await zip.generateAsync({ type: "blob" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${property.name.replace(/[^a-z0-9]+/gi, "-") || "documents"}-documents.zip`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// A gallery-style in-app viewer. Chrome silently blocks window.open() on a
// data: URL (the tab just shows "about:blank#blocked"), so previewing has to
// happen inside the app itself rather than a new browser tab. Images render
// full-size with swipe/arrow navigation between every attached photo, like a
// phone gallery; PDFs render inline; anything else falls back to a direct
// download action.
function DocumentViewer({
  documents,
  index,
  onIndexChange,
  onClose,
}: {
  documents: (PropertyDocument & { dataUrl: string })[]
  index: number
  onIndexChange: (i: number) => void
  onClose: () => void
}) {
  const doc = documents[index]
  if (!doc) return null
  const isImage = doc.dataUrl.startsWith("data:image/")
  const isPdf = doc.dataUrl.startsWith("data:application/pdf")

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogTitle className="sr-only">{doc.name}</DialogTitle>
        <div className="flex items-center justify-between gap-2 border-b border-border p-3">
          <p className="truncate text-sm font-medium">{doc.name}</p>
          <Button size="sm" variant="outline" onClick={() => downloadDocument(doc)}>
            <Download className="size-4" /> Export
          </Button>
        </div>
        <div className="relative flex min-h-[50vh] items-center justify-center bg-muted/30">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doc.dataUrl} alt={doc.name} className="max-h-[70vh] w-full object-contain" />
          ) : isPdf ? (
            <iframe src={doc.dataUrl} title={doc.name} className="h-[70vh] w-full" />
          ) : (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <FileText className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Preview isn't available for this file type.</p>
              <Button size="sm" onClick={() => downloadDocument(doc)}>
                <Download className="size-4" /> Download to view
              </Button>
            </div>
          )}

          {documents.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => onIndexChange((index - 1 + documents.length) % documents.length)}
                className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md"
              >
                <ChevronLeft className="size-4" />
                <span className="sr-only">Previous document</span>
              </button>
              <button
                type="button"
                onClick={() => onIndexChange((index + 1) % documents.length)}
                className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md"
              >
                <ChevronRight className="size-4" />
                <span className="sr-only">Next document</span>
              </button>
            </>
          )}
        </div>
        {documents.length > 1 && (
          <p className="border-t border-border p-2 text-center text-xs text-muted-foreground">
            {index + 1} / {documents.length}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DocumentsTab({ property }: { property: Property }) {
  const { addDocument, deleteDocument } = useStore()
  const [name, setName] = useState("")
  const [type, setType] = useState("")
  const [expiry, setExpiry] = useState("")
  const [pendingFile, setPendingFile] = useState<{ dataUrl: string; fileName: string; size: string } | null>(null)
  const [fileError, setFileError] = useState("")
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [isExportingAll, setIsExportingAll] = useState(false)

  const viewableDocs = (property.documents ?? []).filter((d): d is PropertyDocument & { dataUrl: string } =>
    Boolean(d.dataUrl),
  )

  async function handleExportAll() {
    setIsExportingAll(true)
    try {
      await exportAllDocuments(property)
    } finally {
      setIsExportingAll(false)
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileError("")
    setPendingFile(null)
    if (file.size > MAX_DOCUMENT_SIZE) {
      setFileError(`"${file.name}" is too large — please choose a file under 4 MB.`)
      e.target.value = ""
      return
    }
    setName(file.name.replace(/\.[^.]+$/, ""))
    const reader = new FileReader()
    reader.onload = () => {
      setPendingFile({ dataUrl: reader.result as string, fileName: file.name, size: formatFileSize(file.size) })
    }
    reader.onerror = () => setFileError("Couldn't read that file — please try again.")
    reader.readAsDataURL(file)
  }

  function add() {
    if (!name.trim()) return
    addDocument(property.id, {
      name: name.trim(),
      type: type.trim() || "Document",
      expiry,
      size: pendingFile?.size ?? "—",
      fileName: pendingFile?.fileName,
      dataUrl: pendingFile?.dataUrl,
    })
    setName("")
    setType("")
    setExpiry("")
    setPendingFile(null)
    setFileError("")
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-dashed border-border p-3">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-muted/60 py-3 text-sm font-medium text-muted-foreground">
          <Plus className="size-4" /> Choose file to upload
          <input type="file" className="hidden" onChange={handleFile} />
        </label>
        {pendingFile && (
          <p className="mt-2 text-xs text-accent">
            Attached: {pendingFile.fileName} ({pendingFile.size})
          </p>
        )}
        {fileError && <p className="mt-2 text-xs text-destructive">{fileError}</p>}
        <div className="mt-3 flex flex-col gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Document name" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="Type" />
            <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </div>
          <Button onClick={add} disabled={!name.trim()} size="sm">
            Add document
          </Button>
        </div>
      </div>

      {(property.documents ?? []).length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No documents yet.</p>
      ) : (
        <>
          {viewableDocs.length > 0 && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={handleExportAll} disabled={isExportingAll}>
                <Archive className="size-4" /> {isExportingAll ? "Exporting…" : `Export all (${viewableDocs.length})`}
              </Button>
            </div>
          )}
          {(property.documents ?? []).map((doc) => {
            const state = expiryState(doc.expiry)
            const hasFile = Boolean(doc.dataUrl)
            return (
              <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!hasFile) return
                    const idx = viewableDocs.findIndex((d) => d.id === doc.id)
                    if (idx !== -1) setViewerIndex(idx)
                  }}
                  disabled={!hasFile}
                  title={hasFile ? "Open document" : "No file attached to this record"}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-not-allowed"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.type} · {hasFile ? doc.size : "No file attached"}
                    </p>
                  </div>
                </button>
                <div className="flex flex-col items-end gap-1">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px]",
                      state.tone === "danger" && "bg-destructive/15 text-destructive",
                      state.tone === "warn" && "bg-chart-3/20 text-foreground",
                      state.tone === "ok" && "bg-accent/15 text-accent",
                    )}
                  >
                    {state.label}
                  </Badge>
                  <div className="flex items-center gap-0.5">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      disabled={!hasFile}
                      title={hasFile ? "Export document" : "No file attached to export"}
                      onClick={() => downloadDocument(doc)}
                    >
                      <Download className={hasFile ? "" : "opacity-40"} />
                      <span className="sr-only">Export document</span>
                    </Button>
                    <Button size="icon-xs" variant="ghost" onClick={() => deleteDocument(property.id, doc.id)}>
                      <Trash2 className="text-destructive" />
                      <span className="sr-only">Delete document</span>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </>
      )}

      {viewerIndex !== null && (
        <DocumentViewer
          documents={viewableDocs}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  )
}

function TenantsTab({ property }: { property: Property }) {
  const { addTenant, deleteTenant, toggleRent, addRentMonth } = useStore()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [rent, setRent] = useState("")

  if (property.type !== "House") {
    return (
      <p className="rounded-xl bg-muted/60 p-4 text-center text-sm text-muted-foreground">
        Rent tracking is available for house properties only.
      </p>
    )
  }

  function add() {
    if (!name.trim()) return
    addTenant(property.id, {
      name: name.trim(),
      phone: phone.trim(),
      monthlyRent: Number(rent) || 0,
      leaseEnd: "",
    })
    setName("")
    setPhone("")
    setRent("")
    setAdding(false)
  }

  const nextMonthLabel = new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="flex flex-col gap-3">
      {(property.tenants ?? []).map((t) => (
        <div key={t.id} className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.phone || "No phone"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-sm font-semibold">{money(t.monthlyRent)}/mo</span>
              <Button size="icon-xs" variant="ghost" onClick={() => deleteTenant(property.id, t.id)}>
                <Trash2 className="text-destructive" />
                <span className="sr-only">Remove tenant</span>
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            {(t.rent ?? []).map((r) => (
              <button
                key={r.month}
                onClick={() => toggleRent(property.id, t.id, r.month)}
                className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-left"
              >
                <span className="text-sm">{r.month}</span>
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-medium",
                    r.paid ? "text-accent" : "text-destructive",
                  )}
                >
                  {r.paid ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                  {r.paid ? `Paid ${r.paidOn ?? ""}` : "Unpaid"}
                </span>
              </button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              className="justify-start text-muted-foreground"
              onClick={() => addRentMonth(property.id, t.id, nextMonthLabel)}
            >
              <Plus className="size-3.5" /> Track {nextMonthLabel}
            </Button>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tenant name" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
            <Input
              inputMode="numeric"
              value={rent}
              onChange={(e) => setRent(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Monthly rent"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button size="sm" className="flex-1" onClick={add} disabled={!name.trim()}>
              Add tenant
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Add tenant
        </Button>
      )}
    </div>
  )
}

export function MapCanvas({ label }: { label: string }) {
  return (
    <div className="relative h-36 w-full bg-muted">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="absolute left-1/4 top-1/3 h-1.5 w-2/3 -rotate-6 rounded bg-accent/30" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative flex flex-col items-center">
          <MapPin className="size-7 fill-primary text-primary drop-shadow" />
          <span className="mt-1 max-w-32 truncate rounded-full bg-card px-2 py-0.5 text-[10px] font-medium shadow">
            {label}
          </span>
        </div>
      </div>
    </div>
  )
}
