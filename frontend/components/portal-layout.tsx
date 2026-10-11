"use client"

import { ReactNode, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { getToken, removeToken } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { GridPattern } from "@/components/grid-pattern"
import Image from "next/image"
import Link from "next/link"
import { useTheme } from "@/components/theme-provider"

interface PortalLayoutProps {
  children: ReactNode
  currentStep?: number
  userName?: string
  userRole?: string
  userEmail?: string
}

export function PortalLayout({ children, currentStep, userName = "User", userRole = "Borrower", userEmail }: PortalLayoutProps) {
  const router = useRouter()
  const token = getToken()
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = () => {
    removeToken()
    router.push("/login")
  }

  const toggleDarkMode = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const steps = [
    { id: 1, label: "Personal Details" },
    { id: 2, label: "Eligibility Check" },
    { id: 3, label: "Salary Slip" },
    { id: 4, label: "Loan Config" },
  ]

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background w-full relative">
        <div className="relative z-10">
          <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center justify-between border-b border-border bg-background px-3 sm:px-4 md:px-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 animate-pulse bg-muted rounded" />
              <div className="h-6 w-32 animate-pulse bg-muted rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 animate-pulse bg-muted rounded" />
            </div>
          </header>
          <main className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
            <div className="h-64 animate-pulse bg-muted rounded" />
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background w-full relative">
      {/* Dashed Bottom Right Fade Grid */}
      <GridPattern variant="bottom-right" />

      <div className="relative z-10">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center justify-between border-b border-border bg-background px-3 sm:px-4 md:px-6 shadow-sm">
          {/* Brand */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Image
                src="/image.png"
                alt="Loanify Logo"
                width={28}
                height={28}
                className="rounded"
              />
              <h1 className="text-lg md:text-2xl font-bold text-primary">Loanify</h1>
            </Link>
            <Link href="/my-loans" className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <i className="fas fa-list h-4 w-4"></i>
              My Loans
            </Link>
          </div>

          {/* Stepper - Desktop */}
          {currentStep && (
            <nav className="hidden lg:flex items-center gap-2" aria-label="Application progress">
              {steps.map((step, index) => {
                const status = step.id < currentStep ? "done" : step.id === currentStep ? "active" : "upcoming"
                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                          status === "done"
                            ? "bg-primary text-primary-foreground"
                            : status === "active"
                            ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                            : "bg-muted text-muted-foreground"
                        }`}
                        aria-current={status === "active" ? "step" : undefined}
                      >
                        {status === "done" ? "✓" : step.id}
                      </div>
                      <span
                        className={`text-xs sm:text-sm font-medium ${
                          status === "active" ? "text-foreground" : status === "done" ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className="mx-2 h-px w-6 sm:w-10 bg-border" aria-hidden="true" />
                    )}
                  </div>
                )
              })}
            </nav>
          )}

          {/* Stepper - Mobile */}
          {currentStep && (
            <div className="lg:hidden text-xs sm:text-sm font-medium text-muted-foreground">
              Step {currentStep} of {steps.length}
            </div>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-accent"
            >
              {theme === "dark" ? <i className="fas fa-sun h-4 w-4"></i> : <i className="fas fa-moon h-4 w-4"></i>}
            </Button>

            {/* User Profile Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 h-8 sm:h-9 px-2 sm:px-3 hover:bg-accent"
              >
                <i className="fas fa-user h-4 w-4 text-muted-foreground"></i>
                <span className="hidden sm:inline font-medium text-foreground text-sm">{userName}</span>
                <i className="fas fa-chevron-down h-4 w-4 text-muted-foreground"></i>
              </Button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-popover rounded-lg shadow-lg border border-border py-2 z-50">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-popover-foreground">{userName}</p>
                    {userEmail && <p className="text-xs text-muted-foreground mt-1">{userEmail}</p>}
                    <p className="text-xs text-muted-foreground/70 mt-1 capitalize">{userRole}</p>
                  </div>
                  <div className="px-4 py-2">
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="w-full justify-start text-left h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <i className="fas fa-sign-out-alt h-4 w-4 mr-2"></i>
                      Sign out
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
