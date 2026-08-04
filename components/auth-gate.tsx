"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Fixed sign-in credentials for this app. Change these two values if the
// username/password ever needs to be updated.
const REQUIRED_USERNAME = "Faisal"
const REQUIRED_PASSWORD = "90851234"

// Once unlocked, a device doesn't have to sign in again for this long.
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

const AUTH_STORAGE_KEY = "zameen-auth-v1"

type StoredSession = { expiresAt: number }

// The unlock is stored in this browser's own localStorage, so it's
// per-device by nature: unlocking on one phone never unlocks it on anyone
// else's phone or browser — each one gets asked for the password the first
// time, then stays unlocked on that device alone for 24 hours.
function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return typeof parsed?.expiresAt === "number" ? parsed : null
  } catch {
    return null
  }
}

function isSessionValid(session: StoredSession | null): boolean {
  return !!session && session.expiresAt > Date.now()
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  // "checking" avoids briefly flashing the login form (or the app) before
  // we've had a chance to read localStorage on mount.
  const [status, setStatus] = useState<"checking" | "locked" | "unlocked">("checking")

  useEffect(() => {
    setStatus(isSessionValid(readStoredSession()) ? "unlocked" : "locked")
  }, [])

  function unlock() {
    try {
      const session: StoredSession = { expiresAt: Date.now() + SESSION_DURATION_MS }
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (username.trim() === REQUIRED_USERNAME && password === REQUIRED_PASSWORD) {
      setError("")
      onUnlock()
      return
    }
    setError("Incorrect username or password.")
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
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
              placeholder="Password"
            />
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={!username.trim() || !password}>
          Unlock
        </Button>
      </form>
    </main>
  )
}
