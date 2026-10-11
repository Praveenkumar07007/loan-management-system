"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated, getUserData, getUserRole } from "@/lib/auth"

type UserRole = "Admin" | "Sales" | "Sanction" | "Disbursement" | "Collection" | "Borrower"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter()

  useEffect(() => {
    const isAuth = isAuthenticated()
    const userRole = getUserRole()

    if (!isAuth) {
      router.push("/login")
      return
    }

    if (allowedRoles && userRole && !allowedRoles.includes(userRole as UserRole)) {
      // Redirect to appropriate page based on role
      const roleRedirectMap: Record<UserRole, string> = {
        Admin: "/dashboard",
        Sales: "/sales",
        Sanction: "/sanction",
        Disbursement: "/disbursement",
        Collection: "/collection",
        Borrower: "/my-loans",
      }
      router.push(roleRedirectMap[userRole as UserRole] || "/dashboard")
    }
  }, [router, allowedRoles])

  const isAuth = isAuthenticated()
  const userRole = getUserRole()

  if (!isAuth) {
    return null
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole as UserRole)) {
    return null
  }

  return <>{children}</>
}
