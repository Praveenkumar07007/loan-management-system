"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Moon, Sun, X, User, LogOut } from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { setToken, setUserData, getUserData, isAuthenticated, logout } from "@/lib/auth"
import { authApi } from "@/lib/api"
import { useRouter } from "next/navigation"
import { useTheme } from "@/components/theme-provider"
import {
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card"

export default function Home() {
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userData, setUserDataState] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)

    // Check if user is already logged in
    const authenticated = isAuthenticated()
    const user = getUserData()
    setIsLoggedIn(authenticated)
    setUserDataState(user)
  }, [])

  const toggleDarkMode = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handleEmailSignIn = async (email: string, password: string) => {
    setIsLoading(true)
    setAuthError(null)
    try {
      const result = await authApi.login(email, password)
      setToken(result.token)
      setUserData(result.user)

      // Redirect based on user role
      const roleRedirectMap: Record<string, string> = {
        Admin: "/dashboard",
        Sales: "/sales",
        Sanction: "/sanction",
        Disbursement: "/disbursement",
        Collection: "/collection",
        Borrower: "/my-loans",
      }
      const redirectPath = roleRedirectMap[result.user.role] || "/dashboard"
      router.push(redirectPath)
      setAuthModalOpen(false)
    } catch (error) {
      console.error("Sign in error:", error)
      setAuthError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailSignUp = async (fullName: string, email: string, password: string) => {
    setIsLoading(true)
    setAuthError(null)
    try {
      const result = await authApi.register({ fullName, email, password })
      setToken(result.token)
      setUserData(result.user)
      router.push("/my-loans")
      setAuthModalOpen(false)
    } catch (error) {
      console.error("Sign up error:", error)
      setAuthError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen w-full relative">
        <div
          className="absolute inset-0 z-0"
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #f5f5f4 50%, #ffffff 100%)",
          }}
        />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full relative">
      {/* Background - only apply dark gradient when dark mode is active */}
      {theme === "dark" && (
        <div
          className="absolute inset-0 z-0"
          style={{
            background: "linear-gradient(135deg, #1a1a1a 0%, #2d1f14 50%, #1a1a1a 100%)",
          }}
        />
      )}

      {/* Light mode background */}
      {theme === "light" && (
        <div
          className="absolute inset-0 z-0"
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #f5f5f4 50%, #ffffff 100%)",
          }}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Image
                src="/image.png"
                alt="Loanify Logo"
                width={32}
                height={32}
                className="rounded"
              />
              <span className="text-xl font-bold text-foreground">Loanify</span>
            </Link>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                aria-label="Toggle dark mode"
                className="h-9 w-9"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              {isLoggedIn ? (
                <div className="flex items-center gap-2">
                  {userData?.role === 'Borrower' ? (
                    <>
                      <Link href="/my-loans">
                        <Button variant="outline" size="sm" className="hidden sm:flex">
                          My Loans
                        </Button>
                      </Link>
                      <Link href="/my-loans">
                        <Button size="sm" className="bg-destructive hover:bg-destructive/90">
                          Apply for Loan
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <Link href="/dashboard">
                      <Button size="sm" className="bg-destructive hover:bg-destructive/90">
                        Dashboard
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      logout()
                      setIsLoggedIn(false)
                      setUserDataState(null)
                    }}
                    aria-label="Sign out"
                    className="h-9 w-9"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setAuthModalOpen(true)} size="sm" className="bg-destructive hover:bg-destructive/90">
                  Check Eligibility
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative z-10">
        {isLoggedIn ? (
          // Logged in view - personalized based on role
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                <User className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 md:mb-6">
              Welcome back, <span className="text-destructive">{userData?.fullName?.split(' ')[0] || 'User'}</span>!
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-foreground/80 mb-6 md:mb-8 max-w-2xl mx-auto">
              {userData?.role === 'Borrower' 
                ? 'Manage your loans or apply for a new one. What would you like to do today?'
                : `Access your ${userData?.role} dashboard. What would you like to do today?`
              }
            </p>
            
            {/* Role-specific buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 md:mb-12">
              {userData?.role === 'Borrower' ? (
                <>
                  <Link href="/my-loans">
                    <Button size="lg" className="min-h-[48px] bg-destructive hover:bg-destructive/90 w-full sm:w-auto">
                      <i className="fas fa-list mr-2"></i>
                      View My Loans
                    </Button>
                  </Link>
                  <Link href="/my-loans">
                    <Button variant="outline" size="lg" className="min-h-[48px] bg-foreground/10 border-foreground/20 hover:bg-foreground/20 w-full sm:w-auto">
                      <i className="fas fa-plus mr-2"></i>
                      Apply for New Loan
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/dashboard">
                    <Button size="lg" className="min-h-[48px] bg-destructive hover:bg-destructive/90 w-full sm:w-auto">
                      <i className="fas fa-tachometer-alt mr-2"></i>
                      Go to Dashboard
                    </Button>
                  </Link>
                  {userData?.role === 'Sales' && (
                    <Link href="/sales">
                      <Button variant="outline" size="lg" className="min-h-[48px] bg-foreground/10 border-foreground/20 hover:bg-foreground/20 w-full sm:w-auto">
                        <i className="fas fa-users mr-2"></i>
                        View Borrowers
                      </Button>
                    </Link>
                  )}
                  {userData?.role === 'Sanction' && (
                    <Link href="/sanction">
                      <Button variant="outline" size="lg" className="min-h-[48px] bg-foreground/10 border-foreground/20 hover:bg-foreground/20 w-full sm:w-auto">
                        <i className="fas fa-clipboard-check mr-2"></i>
                        View Applications
                      </Button>
                    </Link>
                  )}
                  {userData?.role === 'Disbursement' && (
                    <Link href="/disbursement">
                      <Button variant="outline" size="lg" className="min-h-[48px] bg-foreground/10 border-foreground/20 hover:bg-foreground/20 w-full sm:w-auto">
                        <i className="fas fa-money-bill-wave mr-2"></i>
                        View Sanctioned Loans
                      </Button>
                    </Link>
                  )}
                  {userData?.role === 'Collection' && (
                    <Link href="/collection">
                      <Button variant="outline" size="lg" className="min-h-[48px] bg-foreground/10 border-foreground/20 hover:bg-foreground/20 w-full sm:w-auto">
                        <i className="fas fa-hand-holding-usd mr-2"></i>
                        View Active Loans
                      </Button>
                    </Link>
                  )}
                  {userData?.role === 'Admin' && (
                    <Link href="/dashboard">
                      <Button variant="outline" size="lg" className="min-h-[48px] bg-foreground/10 border-foreground/20 hover:bg-foreground/20 w-full sm:w-auto">
                        <i className="fas fa-cogs mr-2"></i>
                        Manage System
                      </Button>
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Role-specific Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mt-12 md:mt-20">
              {userData?.role === 'Borrower' ? (
                <>
                  <Card className="border border-border/20 bg-background/20 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <i className="fas fa-file-alt text-3xl text-primary mb-4"></i>
                      <div className="text-xl font-bold text-foreground mb-2">My Applications</div>
                      <p className="text-sm text-foreground/70">Track your loan status</p>
                    </CardContent>
                  </Card>
                  <Card className="border border-border/20 bg-background/20 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <i className="fas fa-clock text-3xl text-primary mb-4"></i>
                      <div className="text-xl font-bold text-foreground mb-2">Pending Actions</div>
                      <p className="text-sm text-foreground/70">Complete your applications</p>
                    </CardContent>
                  </Card>
                  <Card className="border border-border/20 bg-background/20 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <i className="fas fa-history text-3xl text-primary mb-4"></i>
                      <div className="text-xl font-bold text-foreground mb-2">Payment History</div>
                      <p className="text-sm text-foreground/70">View your EMI payments</p>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <Card className="border border-border/20 bg-background/20 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <i className="fas fa-tachometer-alt text-3xl text-primary mb-4"></i>
                      <div className="text-xl font-bold text-foreground mb-2">Dashboard</div>
                      <p className="text-sm text-foreground/70">View your statistics</p>
                    </CardContent>
                  </Card>
                  <Card className="border border-border/20 bg-background/20 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <i className="fas fa-chart-line text-3xl text-primary mb-4"></i>
                      <div className="text-xl font-bold text-foreground mb-2">Analytics</div>
                      <p className="text-sm text-foreground/70">Track performance metrics</p>
                    </CardContent>
                  </Card>
                  <Card className="border border-border/20 bg-background/20 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <i className="fas fa-cog text-3xl text-primary mb-4"></i>
                      <div className="text-xl font-bold text-foreground mb-2">Settings</div>
                      <p className="text-sm text-foreground/70">Manage your preferences</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        ) : (
          // Not logged in view
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 md:mb-6">
              Your next loan, <span className="text-destructive">made simple.</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-foreground/80 mb-6 md:mb-8 max-w-2xl mx-auto">
              Check your eligibility in minutes, compare your options, and get funds with a clear repayment plan.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 md:mb-12">
              <Button onClick={() => setAuthModalOpen(true)} size="lg" className="min-h-[48px] bg-destructive hover:bg-destructive/90 w-full sm:w-auto">
                Check My Eligibility
                <i className="fas fa-arrow-right ml-2"></i>
              </Button>
              <Button variant="outline" size="lg" className="min-h-[48px] bg-foreground/10 border-foreground/20 hover:bg-foreground/20 w-full sm:w-auto">
                <i className="fas fa-play mr-2"></i>
                Explore Loan Options
              </Button>
            </div>

            {/* Feature Icons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-8 md:gap-16 text-foreground/70">
              <div className="flex items-center gap-2">
                <i className="fas fa-bolt text-xl sm:text-2xl"></i>
                <span className="text-xs sm:text-sm">Quick eligibility check</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="fas fa-file-contract text-xl sm:text-2xl"></i>
                <span className="text-xs sm:text-sm">Transparent terms</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="fas fa-shield-alt text-xl sm:text-2xl"></i>
                <span className="text-xs sm:text-sm">Secure application</span>
              </div>
            </div>
          </div>
        )}

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-12 md:mt-20">
          <Card className="border border-border/20 bg-background/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <i className="fas fa-clock text-3xl text-primary mb-4"></i>
              <div className="text-xl font-bold text-foreground mb-2">2 min</div>
              <p className="text-sm text-foreground/70">Eligibility check</p>
            </CardContent>
          </Card>
          <Card className="border border-border/20 bg-background/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <i className="fas fa-credit-card text-3xl text-primary mb-4"></i>
              <div className="text-xl font-bold text-foreground mb-2">Flexible</div>
              <p className="text-sm text-foreground/70">Repayment options</p>
            </CardContent>
          </Card>
          <Card className="border border-border/20 bg-background/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <i className="fas fa-file-invoice-dollar text-3xl text-primary mb-4"></i>
              <div className="text-xl font-bold text-foreground mb-2">Transparent</div>
              <p className="text-sm text-foreground/70">No hidden fees</p>
            </CardContent>
          </Card>
          <Card className="border border-border/20 bg-background/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <i className="fas fa-lock text-3xl text-primary mb-4"></i>
              <div className="text-xl font-bold text-foreground mb-2">Secure</div>
              <p className="text-sm text-foreground/70">Encrypted application</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Auth Modal */}
      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="max-w-[400px] p-0 overflow-hidden">
          <button
            onClick={() => setAuthModalOpen(false)}
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground z-10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <Tabs defaultValue="signin" className="w-full">
            <div className="px-5 pt-6 pb-4 text-center">
              <h2 className="text-xl font-bold text-foreground mb-1">Welcome to Loanify</h2>
              <p className="text-muted-foreground text-sm">Sign in to your account or create a new one</p>
            </div>
            <div className="px-5 mb-4">
              <TabsList className="grid w-full grid-cols-2 h-11">
                <TabsTrigger value="signin" className="text-sm font-medium">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="text-sm font-medium">Create Account</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="signin" className="mt-0 px-5 pb-6">
              {authError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-4">
                  {authError}
                </div>
              )}
              <form onSubmit={(e) => {
                e.preventDefault()
                const email = (document.getElementById('signin-email') as HTMLInputElement)?.value
                const password = (document.getElementById('signin-password') as HTMLInputElement)?.value
                if (email && password) {
                  handleEmailSignIn(email, password)
                }
              }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input id="signin-email" type="email" placeholder="name@example.com" className="h-11" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password">Password</Label>
                    <a href="#" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </a>
                  </div>
                  <Input id="signin-password" type="password" placeholder="•••••••••" className="h-11" />
                </div>
              </form>
              <div className="flex flex-col gap-3 mt-6">
                <Button
                  type="button"
                  onClick={() => {
                    const email = (document.getElementById('signin-email') as HTMLInputElement)?.value
                    const password = (document.getElementById('signin-password') as HTMLInputElement)?.value
                    if (email && password) {
                      handleEmailSignIn(email, password)
                    }
                  }}
                  className="w-full h-11"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="signup" className="mt-0 px-5 pb-6">
              {authError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-4">
                  {authError}
                </div>
              )}
              <form onSubmit={(e) => {
                e.preventDefault()
                const fullName = (document.getElementById('signup-name') as HTMLInputElement)?.value
                const email = (document.getElementById('signup-email') as HTMLInputElement)?.value
                const password = (document.getElementById('signup-password') as HTMLInputElement)?.value
                if (fullName && email && password) {
                  handleEmailSignUp(fullName, email, password)
                }
              }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input id="signup-name" type="text" placeholder="John Doe" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" placeholder="name@example.com" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" type="password" placeholder="•••••••••" className="h-11" />
                </div>
              </form>
              <div className="flex flex-col gap-3 mt-6">
                <Button
                  type="button"
                  onClick={() => {
                    const fullName = (document.getElementById('signup-name') as HTMLInputElement)?.value
                    const email = (document.getElementById('signup-email') as HTMLInputElement)?.value
                    const password = (document.getElementById('signup-password') as HTMLInputElement)?.value
                    if (fullName && email && password) {
                      handleEmailSignUp(fullName, email, password)
                    }
                  }}
                  className="w-full h-11"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}
