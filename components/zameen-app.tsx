"use client"

import { useState } from "react"
import { Building2, HardHat, Home, Map, Settings } from "lucide-react"
import { AuthGate } from "@/components/auth-gate"
import { StoreProvider, useStore } from "@/components/store-provider"
import { ScreenHome } from "@/components/screen-home"
import { ScreenProperties } from "@/components/screen-properties"
import { ScreenConstruction } from "@/components/screen-construction"
import { ScreenMap } from "@/components/screen-map"
import { ScreenSettings } from "@/components/screen-settings"
import { cn } from "@/lib/utils"

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "properties", label: "Properties", icon: Building2 },
  { id: "construction", label: "Projects", icon: HardHat },
  { id: "map", label: "Map", icon: Map },
  { id: "settings", label: "Settings", icon: Settings },
] as const

type Tab = (typeof tabs)[number]["id"]

export function ZameenApp() {
  return (
    <AuthGate>
      <StoreProvider>
        <AppShell />
      </StoreProvider>
    </AuthGate>
  )
}

function AppShell() {
  const { ready } = useStore()
  const [active, setActive] = useState<Tab>("home")

  if (!ready) {
    return <main className="flex min-h-svh items-center justify-center bg-background"><p className="text-sm text-muted-foreground">Opening Zameen…</p></main>
  }

  return (
    <main className="min-h-svh bg-muted/40 md:py-8">
      <div className="relative mx-auto min-h-svh max-w-md overflow-hidden bg-background shadow-xl md:min-h-[calc(100svh-4rem)] md:rounded-3xl md:border md:border-border">
        <div className="h-1 bg-primary" />
        <div className="sticky top-0 z-20 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="grid grid-cols-5 gap-1 px-2 py-2 sm:px-3">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActive(id as Tab)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors",
                  active === id && "bg-primary text-primary-foreground",
                )}
              >
                <Icon className="size-4" />
                <span className="leading-none">{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-5">
          {active === "home" && <ScreenHome onNavigate={(tab) => setActive(tab as Tab)} />}
          {active === "properties" && <ScreenProperties />}
          {active === "construction" && <ScreenConstruction />}
          {active === "map" && <ScreenMap />}
          {active === "settings" && <ScreenSettings />}
        </div>
      </div>
    </main>
  )
}
