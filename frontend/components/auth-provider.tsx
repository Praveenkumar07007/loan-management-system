"use client"

import { useEffect } from "react"
import { isAuthenticated, getUserData } from "@/lib/auth"
import { useRouter } from "next/navigation"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    // Check authentication on mount
    if (!isAuthenticated()) {
      router.push("/login")
    }
  }, [router])

  return <>{children}</>
}
