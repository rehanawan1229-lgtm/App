"use client"

import { Bell, Download, Moon, RotateCcw, Ruler, ShieldCheck, Sun, Wifi, WifiOff, RefreshCw } from "lucide-react"
import { useStore } from "@/components/store-provider"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

export function ScreenSettings() {
  const { data, settings, setSettings, theme, setTheme, resetData, online, pendingSyncCount } = useStore()

  function downloadBackup() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data, settings }, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `zameen-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      <header>
        <p className="text-sm text-muted-foreground">Preferences & backup</p>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Settings</h1>
      </header>

      <section
        className={`flex items-center gap-3 rounded-2xl border p-4 ${
          online ? "border-border bg-card" : "border-accent/30 bg-accent/10"
        }`}
      >
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${online ? "bg-primary/10 text-primary" : "bg-accent/20 text-accent"}`}>
          {online ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{online ? "Online" : "Offline — working locally"}</p>
          <p className="text-xs text-muted-foreground">
            {pendingSyncCount > 0
              ? `${pendingSyncCount} ${pendingSyncCount === 1 ? "entry" : "entries"} saved on this device, syncing to the server${online ? "…" : " once you're back online."}`
              : "Everything is recorded and synced."}
          </p>
        </div>
        {pendingSyncCount > 0 && online && <RefreshCw className="size-4 shrink-0 animate-spin text-muted-foreground" />}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <SettingRow icon={Ruler} title="Preferred area unit" subtitle="Used when adding properties">
          <Select value={settings.areaUnit ?? "Marla"} onValueChange={(value) => setSettings({ areaUnit: value ?? "Marla" })}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {['Marla', 'Kanal', 'Sq ft'].map((unit) => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow icon={Bell} title="Expiry reminders" subtitle="Show document alerts">
          <Switch checked={settings.reminders} onCheckedChange={(checked) => setSettings({ reminders: checked })} />
        </SettingRow>
        <SettingRow icon={theme === "dark" ? Moon : Sun} title="Dark appearance" subtitle="Comfortable at night">
          <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
        </SettingRow>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-serif text-lg font-semibold">Your data</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Project expenses, transport costs, and payments are saved to the server, so every device stays in sync — but the app works fully offline too: anything you add with no signal is kept on this device and synced automatically once you're back online. Properties, tenants, and these preferences stay local to this device.
          </p>
        </div>
        <Button variant="outline" className="justify-start" onClick={downloadBackup}>
          <Download /> Download local backup
        </Button>
        <Button
          variant="outline"
          className="justify-start text-destructive"
          onClick={() => window.confirm("Reset all local changes and restore sample data?") && resetData()}
        >
          <RotateCcw /> Restore sample data
        </Button>
      </section>

      <div className="flex items-start gap-3 rounded-xl bg-accent/10 p-4 text-accent">
        <ShieldCheck className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="text-sm font-medium">Works with or without signal</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Nothing is ever blocked by a bad connection — entries save instantly on this device and sync to the server in the background.
          </p>
        </div>
      </div>
    </div>
  )
}

function SettingRow({ icon: Icon, title, subtitle, children }: { icon: typeof Ruler; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-20 items-center gap-3 border-b border-border p-4 last:border-b-0">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}
