"use client"

import { useEffect } from "react"

export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal — the app works fine without it, it just won't
        // open with zero connectivity on a completely cold start.
      })
    }
  }, [])
  return null
}
