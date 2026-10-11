"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getToken, removeToken, getUserData, logout } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { GridPattern } from "@/components/grid-pattern"
import Image from "next/image"
import Link from "next/link"
import { useTheme } from "@/components/theme-provider"

type UserRole = "Admin" | "Sales" | "Sanction" | "Disbursement" | "Collection" | "Borrower"

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
  userRole?: UserRole
  currentPage?: string
}

// Role-based navigation configuration
const roleNavigation: Record<UserRole, { name: string; href: string }[]> = {
  Admin: [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Sales", href: "/sales" },
    { name: "Sanction", href: "/sanction" },
    { name: "Disbursement", href: "/disbursement" },
    { name: "Collection", href: "/collection" },
  ],
  Sales: [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Sales", href: "/sales" },
  ],
  Sanction: [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Sanction", href: "/sanction" },
  ],
  Disbursement: [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Disbursement", href: "/disbursement" },
  ],
  Collection: [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Collection", href: "/collection" },
  ],
  Borrower: [
    { name: "My Loans", href: "/my-loans" },
  ],
}

export function DashboardLayout({ children, title, userRole, currentPage = "dashboard" }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>("Sales")
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const token = getToken()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)

    const userData = getUserData()
    if (userData) {
      setCurrentUser(userData)
      setCurrentUserRole(userData.role as UserRole)
    }
  }, [])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const toggleDarkMode = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const navigation = roleNavigation[currentUserRole] || roleNavigation.Sales

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-background w-full relative">
      {/* Dashed Center Fade Grid */}
      <GridPattern variant="center" />

      <div className="relative z-10">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Main navigation"
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <Link href="/" className="flex h-14 items-center border-b border-sidebar-border px-4 gap-2 hover:opacity-80 transition-opacity">
            <Image
              src="/image.png"
              alt="Loanify Logo"
              width={32}
              height={32}
              className="rounded"
            />
            <span className="text-lg font-bold text-sidebar-foreground">Loanify</span>
          </Link>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4" aria-label="Main">
            {navigation.map((item) => {
              const isCurrent = item.href === `/${currentPage}` || item.href === currentPage
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors min-h-[44px] ${
                    isCurrent
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User info */}
          <div className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
                <i className="fas fa-user h-4 w-4"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate capitalize">
                  {currentUser?.fullName || currentUserRole} User
                </p>
                <p className="text-xs text-sidebar-foreground/70 truncate">
                  {currentUser?.email || `${currentUserRole}@lms.com`}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start gap-2 mt-3"
            >
              <i className="fas fa-sign-out-alt h-4 w-4"></i>
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 md:h-16 items-center gap-2 md:gap-4 border-b bg-background px-3 sm:px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9 md:h-10 md:w-10"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <i className="fas fa-bars h-4 w-4 md:h-5 md:w-5"></i>
          </Button>

          <div className="ml-auto flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden lg:block">
              <i className="fas fa-search absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true"></i>
              <Input
                type="search"
                placeholder="Search..."
                className="w-64 pl-8"
                aria-label="Search"
              />
            </div>

            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              className="h-8 w-8 md:h-10 md:w-10"
            >
              {theme === "dark" ? <i className="fas fa-sun h-4 w-4"></i> : <i className="fas fa-moon h-4 w-4"></i>}
            </Button>

            {/* Profile menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="gap-2 h-8 md:h-10 min-h-[36px] md:min-h-[44px]"
                aria-expanded={profileMenuOpen}
                aria-haspopup="true"
              >
                <i className="fas fa-user h-4 w-4"></i>
                <span className="hidden md:inline capitalize text-sm">
                  {currentUser?.fullName || currentUserRole}
                </span>
                <i className="fas fa-chevron-down h-4 w-4"></i>
              </Button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-popover shadow-md" role="menu">
                  <div className="p-3">
                    <div className="px-2 py-1.5 text-sm font-semibold text-popover-foreground capitalize">
                      {currentUser?.fullName || currentUserRole} User
                    </div>
                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      {currentUser?.email || `${currentUserRole}@lms.com`}
                    </div>
                    <div className="my-2 border-t" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="w-full justify-start gap-2 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                      role="menuitem"
                    >
                      <i className="fas fa-sign-out-alt h-4 w-4"></i>
                      Sign out
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
          <div className="mb-4 md:mb-6">
            <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
          </div>
          {children}
        </main>
      </div>
    </div>
    </div>
  )
} 
