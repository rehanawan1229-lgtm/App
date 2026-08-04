"use client"

import { useState } from "react"
import Image from "next/image"
import JSZip from "jszip"
import * as XLSX from "xlsx"
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useStore } from "@/components/store-provider"
import { propertyImage, expiryState, StatPill } from "@/components/shared"
import {
  money,
  type Property,
  type Tenant,
  type UploadedDocument,
  getTenantLedgerEntries,
  getTenantDepositSummary,
  tenantStatusBadge,
  type TenantStatusTone,
} from "@/lib/zameen-data"
import {
  MapPin,
  FileText,
  Users,
  Trash2,
  Plus,
  Home,
  Download,
  Archive,
  ChevronLeft,
  ChevronRight,
  Share2,
  ArrowUp,
  ArrowDown,
  Wallet,
  UserRound,
  FileSpreadsheet,
  X,
  Navigation,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function PropertyDetail({
  property,
  open,
  onOpenChange,
  initialTab,
}: {
  property: Property | null
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTab?: "overview" | "documents" | "tenants"
}) {
  if (!property) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto p-0" showCloseButton={false}>
        <DialogTitle className="sr-only">{property.name}</DialogTitle>
        <DialogDescription className="sr-only">Property details, documents, and tenant records.</DialogDescription>
        <div className="relative h-40 w-full overflow-hidden">
          <Image src={propertyImage[property.type] || "/placeholder.svg"} alt={property.name} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />
          {/* Custom close button instead of the dialog's default ghost-style
              one: ghost has no background of its own, so its icon can end up
              nearly invisible sitting directly on top of a photo — this one
              always has a solid dark circle behind it so the X reads clearly
              no matter what the photo looks like or what screen it's on. */}
          <DialogClose
            render={
              <button
                type="button"
                aria-label="Close"
                className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-black/60 text-white shadow-md transition-colors hover:bg-black/80"
              />
            }
          >
            <X className="size-4" />
          </DialogClose>
          <div className="absolute bottom-3 left-4 right-4">
            <h2 className="font-serif text-xl font-semibold text-foreground drop-shadow">{property.name}</h2>
            <p className="flex items-center gap-1 text-sm text-foreground/80">
              <MapPin className="size-3.5" /> {property.location || "No location set"}
            </p>
          </div>
        </div>
        <div className="p-4">
          <PropertyTabs property={property} initialTab={initialTab} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PropertyTabs({ property, initialTab }: { property: Property; initialTab?: "overview" | "documents" | "tenants" }) {
  return (
    <Tabs defaultValue={initialTab ?? "overview"} className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="overview" className="flex-1 gap-1.5">
          <Home className="size-3.5" /> Info
        </TabsTrigger>
        <TabsTrigger value="documents" className="flex-1 gap-1.5">
          <FileText className="size-3.5" /> Docs
        </TabsTrigger>
        <TabsTrigger value="tenants" className="flex-1 gap-1.5">
          <Users className="size-3.5" /> Rent
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="mt-4">
        <OverviewTab property={property} />
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

// ---------------------------------------------------------------------------
// Overview / Info tab
// ---------------------------------------------------------------------------

function shareLocationUrl(property: Property) {
  const query = encodeURIComponent(property.location || property.name)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

// Opens Google Maps directly in turn-by-turn directions mode to this
// property, with the destination pre-filled and no origin set — Maps asks
// the user for their starting point (or uses their current location) itself.
function getDirectionsUrl(property: Property) {
  const destination = encodeURIComponent(property.location || property.name)
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`
}

function OverviewTab({ property }: { property: Property }) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = shareLocationUrl(property)
    const text = property.location ? `${property.name} — ${property.location}` : property.name
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: property.name, text, url })
        return
      } catch {
        // user cancelled the share sheet — fall through to clipboard
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // ignore — nothing more we can do without user permission
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <StatPill label="Type" value={property.type} />
        <StatPill label="Status" value={property.status} />
        <StatPill label="Size" value={property.size || "—"} />
        <StatPill label="Est. value" value={property.value ? money(property.value) : "—"} tone="accent" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <MapCanvas label={property.location || property.name} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={handleShare}>
          <Share2 className="size-4" /> {copied ? "Link copied!" : "Share location"}
        </Button>
        <Button
          variant="outline"
          onClick={() => window.open(getDirectionsUrl(property), "_blank", "noopener,noreferrer")}
        >
          <Navigation className="size-4" /> Get Directions
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared document upload / view / export — used by both property documents
// and each tenant's documents, since they're the same shape.
// ---------------------------------------------------------------------------

const MAX_DOCUMENT_SIZE = 4 * 1024 * 1024

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function resolveDownloadName(doc: UploadedDocument) {
  const ext = doc.fileName?.match(/\.[^.]+$/)?.[0] ?? ""
  return doc.name.toLowerCase().endsWith(ext.toLowerCase()) ? doc.name : `${doc.name}${ext}`
}

function downloadDocument(doc: UploadedDocument) {
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
async function exportDocumentsZip(documents: UploadedDocument[], zipBaseName: string) {
  const docs = documents.filter((d): d is UploadedDocument & { dataUrl: string } => Boolean(d.dataUrl))
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
  a.download = `${zipBaseName.replace(/[^a-z0-9]+/gi, "-") || "documents"}.zip`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// A gallery-style in-app viewer. Chrome silently blocks window.open() on a
// data: URL (the tab just shows "about:blank#blocked"), so previewing has to
// happen inside the app itself rather than a new browser tab. Images render
// full-size with arrow navigation between every attached photo, like a
// phone gallery; PDFs render inline; anything else falls back to a direct
// download action.
function DocumentViewer({
  documents,
  index,
  onIndexChange,
  onClose,
}: {
  documents: (UploadedDocument & { dataUrl: string })[]
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
      {/* max-h + overflow-y-auto keep the whole card inside the viewport on
          short mobile screens — without it a tall image could push the
          bottom of the card (and the nav arrows, which are centered on the
          image area) below the fold, so they'd exist but never be visible. */}
      <DialogContent className="flex max-h-[92vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogTitle className="sr-only">{doc.name}</DialogTitle>
        {/* pr-12 keeps the title/Export button clear of the dialog's built-in
            close (X) button, which is absolutely positioned in the top-right
            corner — on narrow/mobile widths there isn't enough spare room
            otherwise and the two visually overlap. */}
        <div className="flex items-center justify-between gap-2 border-b border-border p-3 pr-12">
          <p className="truncate text-sm font-medium">{doc.name}</p>
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => downloadDocument(doc)}>
            <Download className="size-4" /> Export
          </Button>
        </div>
        {/* Fixed height (not min-height) so top-1/2 on the nav arrows always
            centers against a predictable box, and the box itself is capped
            so it plus the header/footer never exceeds the viewport. */}
        <div className="relative flex h-[60vh] items-center justify-center overflow-hidden bg-muted/30">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doc.dataUrl} alt={doc.name} className="max-h-full max-w-full object-contain" />
          ) : isPdf ? (
            <iframe src={doc.dataUrl} title={doc.name} className="h-full w-full" />
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
                className="absolute left-2 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md"
              >
                <ChevronLeft className="size-4" />
                <span className="sr-only">Previous document</span>
              </button>
              <button
                type="button"
                onClick={() => onIndexChange((index + 1) % documents.length)}
                className="absolute right-2 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md"
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

function DocumentManager({
  documents,
  onAdd,
  onDelete,
  zipBaseName,
}: {
  documents: UploadedDocument[]
  onAdd: (doc: Omit<UploadedDocument, "id">) => void
  onDelete: (id: string) => void
  zipBaseName: string
}) {
  const [name, setName] = useState("")
  const [type, setType] = useState("")
  const [expiry, setExpiry] = useState("")
  const [pendingFile, setPendingFile] = useState<{ dataUrl: string; fileName: string; size: string } | null>(null)
  const [fileError, setFileError] = useState("")
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [isExportingAll, setIsExportingAll] = useState(false)

  const viewableDocs = documents.filter((d): d is UploadedDocument & { dataUrl: string } => Boolean(d.dataUrl))

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
    onAdd({
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

  async function handleExportAll() {
    setIsExportingAll(true)
    try {
      await exportDocumentsZip(documents, zipBaseName)
    } finally {
      setIsExportingAll(false)
    }
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

      {documents.length === 0 ? (
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
          {documents.map((doc) => {
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
                    <Button size="icon-xs" variant="ghost" onClick={() => onDelete(doc.id)}>
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

function DocumentsTab({ property }: { property: Property }) {
  const { addDocument, deleteDocument } = useStore()
  return (
    <DocumentManager
      documents={property.documents ?? []}
      zipBaseName={`${property.name}-documents`}
      onAdd={(doc) => addDocument(property.id, doc)}
      onDelete={(id) => deleteDocument(property.id, id)}
    />
  )
}

// ---------------------------------------------------------------------------
// Tenants / Rent tab
// ---------------------------------------------------------------------------

function statusToneClass(tone: TenantStatusTone) {
  switch (tone) {
    case "danger":
      return "bg-destructive/15 text-destructive"
    case "warn":
      return "bg-chart-3/20 text-foreground"
    case "muted":
      return "bg-muted text-muted-foreground"
    default:
      return "bg-accent/15 text-accent"
  }
}

function TenantsTab({ property }: { property: Property }) {
  const [addingOpen, setAddingOpen] = useState(false)
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  if (property.type !== "House") {
    return <p className="rounded-xl bg-muted/60 p-4 text-center text-sm text-muted-foreground">Rent tracking is available for house properties only.</p>
  }

  const tenants = property.tenants ?? []
  const activeTenant = tenants.find((t) => t.status === "active") ?? null
  const pastTenants = tenants.filter((t) => t.status === "ended")
  const selectedTenant = tenants.find((t) => t.id === selectedTenantId) ?? null

  return (
    <div className="flex flex-col gap-3">
      {activeTenant ? (
        <TenantCard tenant={activeTenant} onOpen={() => setSelectedTenantId(activeTenant.id)} />
      ) : (
        <p className="rounded-xl bg-muted/60 p-4 text-center text-sm text-muted-foreground">No active tenant right now.</p>
      )}

      <Button variant="outline" onClick={() => setAddingOpen(true)}>
        <Plus className="size-4" /> {activeTenant ? "Replace tenant" : "Add tenant"}
      </Button>
      {activeTenant && (
        <p className="text-center text-xs text-muted-foreground">Adding a new tenant automatically ends {activeTenant.name}'s current tenancy.</p>
      )}

      {pastTenants.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm font-medium text-muted-foreground"
          >
            <span>Tenant history ({pastTenants.length})</span>
            <ChevronRight className={cn("size-4 transition-transform", showHistory && "rotate-90")} />
          </button>
          {showHistory &&
            pastTenants.map((t) => <TenantCard key={t.id} tenant={t} onOpen={() => setSelectedTenantId(t.id)} compact />)}
        </div>
      )}

      <TenantFormDialog open={addingOpen} onOpenChange={setAddingOpen} property={property} />
      <TenantDetailDialog
        property={property}
        tenant={selectedTenant}
        open={selectedTenant !== null}
        onOpenChange={(o) => !o && setSelectedTenantId(null)}
      />
    </div>
  )
}

function TenantCard({ tenant, onOpen, compact }: { tenant: Tenant; onOpen: () => void; compact?: boolean }) {
  const badge = tenantStatusBadge(tenant)
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-left">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{tenant.name}</p>
        <p className="text-xs text-muted-foreground">{tenant.phone || "No phone"}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {!compact && <span className="font-serif text-sm font-semibold">{money(tenant.monthlyRent)}/mo</span>}
        <Badge variant="secondary" className={cn("text-[10px]", statusToneClass(badge.tone))}>
          {badge.label}
        </Badge>
      </div>
    </button>
  )
}

type TenantFormState = {
  name: string
  phone: string
  cnic: string
  guardianName: string
  address: string
  occupation: string
  emergencyContact: string
  monthlyRent: string
  securityDeposit: string
  leaseStart: string
  notes: string
}

function emptyTenantForm(): TenantFormState {
  return {
    name: "",
    phone: "",
    cnic: "",
    guardianName: "",
    address: "",
    occupation: "",
    emergencyContact: "",
    monthlyRent: "",
    securityDeposit: "",
    leaseStart: new Date().toISOString().slice(0, 10),
    notes: "",
  }
}

// Keystroke-level filters so the wrong kind of character can't be typed into
// a field in the first place (letters into a phone number, digits into a
// name, ...). Each returns the cleaned-up value to store.
const onlyLetters = (v: string) => v.replace(/[^a-zA-Z\s'.-]/g, "")
const phoneChars = (v: string) => v.replace(/[^0-9+\-\s]/g, "")

// Field-level validation messages shown once the field has something in it —
// these catch values that are the right *kind* of character but still not a
// usable phone/CNIC (too short, wrong length, etc).
function tenantFieldError(key: keyof TenantFormState, value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  switch (key) {
    case "name":
    case "guardianName":
      return trimmed.length < 2 ? "Enter a valid name" : ""
    case "occupation":
      return trimmed.length < 2 ? "Enter a valid occupation" : ""
    case "phone":
    case "emergencyContact": {
      const digits = trimmed.replace(/[^0-9]/g, "")
      return digits.length < 10 || digits.length > 11 ? "Enter a valid phone number (10–11 digits)" : ""
    }
    case "cnic": {
      const digits = trimmed.replace(/[^0-9]/g, "")
      return digits.length !== 13 ? "CNIC must be 13 digits" : ""
    }
    default:
      return ""
  }
}

function TenantFormDialog({ open, onOpenChange, property }: { open: boolean; onOpenChange: (o: boolean) => void; property: Property }) {
  const { addTenant } = useStore()
  const [form, setForm] = useState<TenantFormState>(emptyTenantForm())
  const activeTenant = (property.tenants ?? []).find((t) => t.status === "active")

  function update<K extends keyof TenantFormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const errors = {
    name: tenantFieldError("name", form.name),
    phone: tenantFieldError("phone", form.phone),
    cnic: tenantFieldError("cnic", form.cnic),
    guardianName: tenantFieldError("guardianName", form.guardianName),
    occupation: tenantFieldError("occupation", form.occupation),
    emergencyContact: tenantFieldError("emergencyContact", form.emergencyContact),
  }
  const hasBlockingError = Object.values(errors).some(Boolean)

  function submit() {
    if (!form.name.trim() || hasBlockingError) return
    addTenant(property.id, {
      name: form.name.trim(),
      phone: form.phone.trim(),
      cnic: form.cnic.trim(),
      guardianName: form.guardianName.trim(),
      address: form.address.trim(),
      occupation: form.occupation.trim(),
      emergencyContact: form.emergencyContact.trim(),
      monthlyRent: Number(form.monthlyRent) || 0,
      securityDeposit: Number(form.securityDeposit) || 0,
      leaseStart: form.leaseStart,
      notes: form.notes.trim(),
    })
    setForm(emptyTenantForm())
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setForm(emptyTenantForm())
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogTitle>Add tenant</DialogTitle>
        <DialogDescription>
          {activeTenant ? `This ends ${activeTenant.name}'s current tenancy and starts a fresh record.` : "Saved to this property's lifetime tenant history."}
        </DialogDescription>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">Personal details</p>
            <div>
              <Input value={form.name} onChange={(e) => update("name", onlyLetters(e.target.value))} placeholder="Full name" />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", phoneChars(e.target.value))}
                  placeholder="Phone"
                />
                {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
              </div>
              <div>
                <Input
                  inputMode="numeric"
                  value={form.cnic}
                  onChange={(e) => update("cnic", e.target.value.replace(/[^0-9]/g, "").slice(0, 13))}
                  placeholder="CNIC number"
                />
                {errors.cnic && <p className="mt-1 text-xs text-destructive">{errors.cnic}</p>}
              </div>
            </div>
            <div>
              <Input
                value={form.guardianName}
                onChange={(e) => update("guardianName", onlyLetters(e.target.value))}
                placeholder="Father / guardian name"
              />
              {errors.guardianName && <p className="mt-1 text-xs text-destructive">{errors.guardianName}</p>}
            </div>
            <Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Permanent address" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  value={form.occupation}
                  onChange={(e) => update("occupation", onlyLetters(e.target.value))}
                  placeholder="Occupation"
                />
                {errors.occupation && <p className="mt-1 text-xs text-destructive">{errors.occupation}</p>}
              </div>
              <div>
                <Input
                  inputMode="tel"
                  value={form.emergencyContact}
                  onChange={(e) => update("emergencyContact", phoneChars(e.target.value))}
                  placeholder="Emergency contact"
                />
                {errors.emergencyContact && <p className="mt-1 text-xs text-destructive">{errors.emergencyContact}</p>}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">Lease & rent</p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                inputMode="numeric"
                value={form.monthlyRent}
                onChange={(e) => update("monthlyRent", e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Monthly rent"
              />
              <Input
                inputMode="numeric"
                value={form.securityDeposit}
                onChange={(e) => update("securityDeposit", e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Security deposit"
              />
            </div>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Lease start
              <Input type="date" value={form.leaseStart} onChange={(e) => update("leaseStart", e.target.value)} />
            </label>
          </div>

          <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Notes (optional)" rows={2} />

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={submit} disabled={!form.name.trim() || hasBlockingError}>
              Save tenant
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function exportTenantExcel(property: Property, tenant: Tenant) {
  const entries = getTenantLedgerEntries(tenant)
  const summary = getTenantDepositSummary(tenant)

  const profileRows = [
    ["Property", property.name],
    ["Property location", property.location],
    ["Tenant name", tenant.name],
    ["Phone", tenant.phone],
    ["CNIC", tenant.cnic],
    ["Guardian / father name", tenant.guardianName],
    ["Permanent address", tenant.address],
    ["Occupation", tenant.occupation],
    ["Emergency contact", tenant.emergencyContact],
    ["Monthly rent", tenant.monthlyRent],
    ["Security deposit (target)", tenant.securityDeposit],
    ["Security deposit (remaining)", summary.depositRemaining],
    ["Advance credit (paid ahead)", summary.advanceCredit],
    ["Arrears (owed beyond deposit)", summary.arrears],
    ["Lease start", tenant.leaseStart],
    ["Lease end", tenant.leaseEnd || (tenant.status === "active" ? "Ongoing" : "")],
    ["Status", tenant.status],
    ["Notes", tenant.notes],
  ]

  const ledgerRows = [
    ["Date", "Description", "Due (Debit)", "Paid (Credit)", "Balance"],
    ...entries.map((e) => [new Date(e.timestamp).toLocaleDateString("en-GB"), e.label, e.debit || "", e.credit || "", e.balance]),
  ]

  const docsRows = [
    ["Document name", "Type", "Expiry", "Size", "Original file name"],
    ...(tenant.documents ?? []).map((d) => [d.name, d.type, d.expiry, d.size, d.fileName ?? ""]),
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(profileRows), "Profile")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ledgerRows), "Ledger")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(docsRows), "Documents")

  XLSX.writeFile(wb, `${tenant.name.replace(/[^a-z0-9]+/gi, "-") || "tenant"}-details.xlsx`)
}

function TenantLedgerPanel({ property, tenant }: { property: Property; tenant: Tenant }) {
  const { addTenantPayment, deleteTenantPayment } = useStore()
  const [sortKey, setSortKey] = useState<"date" | "amount" | "description">("date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [payAmount, setPayAmount] = useState("")
  const [payNote, setPayNote] = useState("")
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10))

  const entries = getTenantLedgerEntries(tenant)
  const sorted = [...entries].sort((a, b) => {
    let cmp = 0
    if (sortKey === "date") cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    else if (sortKey === "amount") cmp = (a.debit || a.credit) - (b.debit || b.credit)
    else cmp = a.label.localeCompare(b.label)
    return sortDir === "asc" ? cmp : -cmp
  })

  function recordPayment() {
    const amount = Number(payAmount)
    if (!amount) return
    addTenantPayment(property.id, tenant.id, { amount, date: payDate, note: payNote.trim() || undefined })
    setPayAmount("")
    setPayNote("")
  }

  return (
    <div className="flex flex-col gap-3">
      {tenant.status === "active" && (
        <div className="rounded-xl border border-dashed border-border p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Record a payment</p>
          <div className="grid grid-cols-2 gap-2">
            <Input inputMode="numeric" value={payAmount} onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Amount" />
            <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </div>
          <Input className="mt-2" value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Note (optional)" />
          <Button size="sm" className="mt-2 w-full" onClick={recordPayment} disabled={!payAmount}>
            <Plus className="size-3.5" /> Add payment
          </Button>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No ledger activity yet.</p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as "date" | "amount" | "description")}>
              <SelectTrigger className="h-9 flex-1" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="amount">Sort by Amount</SelectItem>
                <SelectItem value="description">Sort by Description</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-9 shrink-0" onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
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
                    <th className="bg-muted/60 px-2 py-2 text-left font-medium">Description</th>
                    <th className="bg-muted/60 px-2 py-2 text-right font-medium">Due</th>
                    <th className="bg-muted/60 px-2 py-2 text-right font-medium">Paid</th>
                    <th className="bg-muted/60 px-2 py-2 text-right font-medium">Balance</th>
                    <th className="bg-muted/60 px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((entry) => (
                    <tr key={entry.id} className="border-t border-border">
                      <td className="sticky left-0 z-10 whitespace-nowrap border-r border-border bg-popover px-2 py-2 text-muted-foreground shadow-[2px_0_4px_-2px_rgba(0,0,0,0.25)]">
                        {new Date(entry.timestamp).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-2 py-2">{entry.label}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{entry.debit ? money(entry.debit) : "—"}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-accent">{entry.credit ? money(entry.credit) : "—"}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-right font-medium tabular-nums">{money(entry.balance)}</td>
                      <td className="px-1 py-2 text-right">
                        {entry.kind === "payment" && (
                          <Button size="icon-xs" variant="ghost" onClick={() => deleteTenantPayment(property.id, tenant.id, entry.id)}>
                            <Trash2 className="text-destructive" />
                            <span className="sr-only">Delete payment</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function TenantDetailDialog({
  property,
  tenant,
  open,
  onOpenChange,
}: {
  property: Property
  tenant: Tenant | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { endTenancy, deleteTenant, addTenantDocument, deleteTenantDocument } = useStore()
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!tenant) return null
  const badge = tenantStatusBadge(tenant)
  const summary = getTenantDepositSummary(tenant)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto p-0">
        <DialogTitle className="sr-only">{tenant.name}</DialogTitle>
        <DialogDescription className="sr-only">Tenant profile, deposit ledger, and documents.</DialogDescription>
        <div className="border-b border-border p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate font-serif text-lg font-semibold">{tenant.name}</h2>
              <p className="text-xs text-muted-foreground">{tenant.phone || "No phone"}</p>
            </div>
            <Badge variant="secondary" className={cn("shrink-0 text-[10px]", statusToneClass(badge.tone))}>
              {badge.label}
            </Badge>
          </div>
        </div>

        <div className="p-4">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="profile" className="flex-1 gap-1">
                <UserRound className="size-3.5" /> Profile
              </TabsTrigger>
              <TabsTrigger value="ledger" className="flex-1 gap-1">
                <Wallet className="size-3.5" /> Ledger
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex-1 gap-1">
                <FileText className="size-3.5" /> Docs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <StatPill label="CNIC" value={tenant.cnic || "—"} />
                <StatPill label="Guardian" value={tenant.guardianName || "—"} />
                <StatPill label="Occupation" value={tenant.occupation || "—"} />
                <StatPill label="Emergency contact" value={tenant.emergencyContact || "—"} />
              </div>
              {tenant.address && (
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm">{tenant.address}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <StatPill label="Monthly rent" value={money(tenant.monthlyRent)} tone="accent" />
                <StatPill label="Lease start" value={tenant.leaseStart ? new Date(tenant.leaseStart).toLocaleDateString("en-GB") : "—"} />
              </div>
              {tenant.status === "ended" && (
                <StatPill label="Lease ended" value={tenant.leaseEnd ? new Date(tenant.leaseEnd).toLocaleDateString("en-GB") : "—"} />
              )}
              {tenant.notes && (
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{tenant.notes}</p>
                </div>
              )}

              <div className={cn("rounded-xl p-3", statusToneClass(badge.tone))}>
                <p className="text-xs opacity-80">Security deposit</p>
                <p className="font-serif text-xl font-semibold">
                  {money(summary.depositRemaining)} <span className="text-sm font-normal opacity-70">of {money(summary.depositTarget)}</span>
                </p>
                {summary.arrears > 0 && <p className="mt-1 text-xs">Advance exhausted — {money(summary.arrears)} still owed.</p>}
                {summary.advanceCredit > 0 && (
                  <p className="mt-1 text-xs">
                    {money(summary.advanceCredit)} credited ahead (~{summary.monthsAheadPaid} month{summary.monthsAheadPaid === 1 ? "" : "s"}).
                  </p>
                )}
              </div>

              <Button variant="outline" onClick={() => exportTenantExcel(property, tenant)}>
                <FileSpreadsheet className="size-4" /> Export to Excel
              </Button>

              {tenant.status === "active" && (
                <Button variant="outline" onClick={() => endTenancy(property.id, tenant.id)}>
                  End tenancy
                </Button>
              )}

              {!confirmDelete ? (
                <Button variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="size-4" /> Delete tenant record
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      deleteTenant(property.id, tenant.id)
                      setConfirmDelete(false)
                      onOpenChange(false)
                    }}
                  >
                    Confirm delete
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="ledger" className="mt-4">
              <TenantLedgerPanel property={property} tenant={tenant} />
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <DocumentManager
                documents={tenant.documents ?? []}
                zipBaseName={`${tenant.name}-documents`}
                onAdd={(doc) => addTenantDocument(property.id, tenant.id, doc)}
                onDelete={(id) => deleteTenantDocument(property.id, tenant.id, id)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function MapCanvas({ label }: { label: string }) {
  return (
    <div className="relative flex h-32 w-full items-center justify-center bg-[radial-gradient(circle_at_1px_1px,var(--color-border)_1px,transparent_0)] bg-[length:16px_16px]">
      <div className="flex flex-col items-center gap-1 rounded-lg bg-popover/90 px-3 py-2 text-center shadow-sm">
        <MapPin className="size-4 text-primary" />
        <span className="max-w-40 truncate text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}
