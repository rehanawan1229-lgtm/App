"use client"

import { useEffect, useState } from "react"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Fixed sign-in credentials for this app. Change these two values if the
// username/password ever needs to be updated.
const REQUIRED_USERNAME = "Faisal"
const REQUIRED_PASSWORD = "90851234"

const AUTH_STORAGE_KEY = "zameen-auth-v1"

// The unlock is stored in sessionStorage (not localStorage), so it only
// survives reloads/tab-switches within the current browsing session. As
// soon as the app/browser tab is fully closed and reopened — or the PWA is
// swiped away and relaunched — sessionStorage is cleared and the login
// screen appears again. This is per-device by nature (each phone asks for
// the password on its own), but the underlying data is still fully shared
// across every device via the cloud sync in store-provider.
function readStoredSession(): boolean {
  try {
    return sessionStorage.getItem(AUTH_STORAGE_KEY) === "unlocked"
  } catch {
    return false
  }
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  // "checking" avoids briefly flashing the login form (or the app) before
  // we've had a chance to read sessionStorage on mount.
  const [status, setStatus] = useState<"checking" | "locked" | "unlocked">("checking")

  useEffect(() => {
    setStatus(readStoredSession() ? "unlocked" : "locked")
  }, [])

  function unlock() {
    try {
      sessionStorage.setItem(AUTH_STORAGE_KEY, "unlocked")
    } catch {
      // ignore storage errors — the session just won't persist across reloads
    }
    setStatus("unlocked")
  }

  if (status === "checking") {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Opening Zameen…</p>
      </main>
    )
  }

  if (status === "locked") {
    return <LoginScreen onUnlock={unlock} />
  }

  return <>{children}</>
}

function LoginScreen({ onUnlock }: { onUnlock: () => void }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  function attemptUnlock() {
    if (username.trim().toLowerCase() === REQUIRED_USERNAME.toLowerCase() && password === REQUIRED_PASSWORD) {
      setError("")
      onUnlock()
      return
    }
    setError("Incorrect username or password.")
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="size-5" />
          </div>
          <h1 className="font-serif text-xl font-semibold">Zameen is locked</h1>
          <p className="text-sm text-muted-foreground">Sign in to open this device.</p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-username" className="text-xs font-medium text-muted-foreground">
              Username
            </label>
            <Input
              id="auth-username"
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                if (error) setError("")
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") attemptUnlock()
              }}
              placeholder="Username"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-password" className="text-xs font-medium text-muted-foreground">
              Password
            </label>
            <Input
              id="auth-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError("")
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") attemptUnlock()
              }}
              placeholder="Password"
            />
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button className="w-full" disabled={!username.trim() || !password} onClick={attemptUnlock}>
          Unlock
        </Button>
      </div>
    </main>
  )
}
