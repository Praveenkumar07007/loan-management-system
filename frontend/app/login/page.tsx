"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { setToken, setUserData, isAuthenticated, getUserData } from "@/lib/auth"
import { authApi } from "@/lib/api"
import { useRouter } from "next/navigation"

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

const signUpSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100, "Full name cannot exceed 100 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

type SignInFormValues = z.infer<typeof signInSchema>
type SignUpFormValues = z.infer<typeof signUpSchema>

type UserRole = "Admin" | "Sales" | "Sanction" | "Disbursement" | "Collection" | "Borrower"

const roleRedirectMap: Record<UserRole, string> = {
  Admin: "/dashboard",
  Sales: "/sales",
  Sanction: "/sanction",
  Disbursement: "/disbursement",
  Collection: "/collection",
  Borrower: "/my-loans",
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated()) {
      const userData = getUserData()
      const userRole = userData?.role as UserRole
      const redirectPath = roleRedirectMap[userRole] || "/dashboard"
      router.push(redirectPath)
    }
  }, [router])

  const signInForm = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const signUpForm = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const onSignInSubmit = async (data: SignInFormValues) => {
    setIsLoading(true)
    setAuthError(null)
    try {
      const result = await authApi.login(data.email, data.password)
      setToken(result.token)
      setUserData(result.user)

      // Redirect based on user role
      const userRole = result.user.role as UserRole
      const redirectPath = roleRedirectMap[userRole] || "/dashboard"
      router.push(redirectPath)
    } catch (error) {
      console.error("Sign in error:", error)
      setAuthError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const onSignUpSubmit = async (data: SignUpFormValues) => {
    setIsLoading(true)
    setAuthError(null)
    try {
      const result = await authApi.register({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
      })
      setToken(result.token)
      setUserData(result.user)

      // Redirect based on user role (new users are always Borrowers)
      router.push("/my-loans")
    } catch (error) {
      console.error("Sign up error:", error)
      setAuthError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome to Loanify"
      description="Your trusted partner for quick and easy loan management"
    >
      <Card className="border-0 shadow-2xl w-full">
        <CardHeader className="space-y-3 pb-6 md:pb-8">
          <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">Account</CardTitle>
          <CardDescription className="text-muted-foreground text-sm md:text-base">
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authError && (
            <div className="p-3 md:p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs md:text-sm mb-4 md:mb-6">
              {authError}
            </div>
          )}
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 md:mb-8 h-11 md:h-12">
              <TabsTrigger value="signin" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm md:text-base font-medium">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm md:text-base font-medium">Create Account</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={signInForm.handleSubmit(onSignInSubmit)} className="space-y-4 md:space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="name@example.com"
                    error={!!signInForm.formState.errors.email}
                    className="h-10 md:h-12"
                    {...signInForm.register("email")}
                  />
                  {signInForm.formState.errors.email && (
                    <p className="text-xs md:text-sm text-destructive">
                      {signInForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    error={!!signInForm.formState.errors.password}
                    className="h-10 md:h-12"
                    {...signInForm.register("password")}
                  />
                  {signInForm.formState.errors.password && (
                    <p className="text-xs md:text-sm text-destructive">
                      {signInForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full h-10 md:h-12 text-sm md:text-base font-medium" size="lg" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-medium">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    error={!!signUpForm.formState.errors.fullName}
                    className="h-10 md:h-12"
                    {...signUpForm.register("fullName")}
                  />
                  {signUpForm.formState.errors.fullName && (
                    <p className="text-xs md:text-sm text-destructive">
                      {signUpForm.formState.errors.fullName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="name@example.com"
                    error={!!signUpForm.formState.errors.email}
                    className="h-10 md:h-12"
                    {...signUpForm.register("email")}
                  />
                  {signUpForm.formState.errors.email && (
                    <p className="text-xs md:text-sm text-destructive">
                      {signUpForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    error={!!signUpForm.formState.errors.password}
                    className="h-10 md:h-12"
                    {...signUpForm.register("password")}
                  />
                  {signUpForm.formState.errors.password && (
                    <p className="text-xs md:text-sm text-destructive">
                      {signUpForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm" className="text-sm font-medium">Confirm Password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="••••••••"
                    error={!!signUpForm.formState.errors.confirmPassword}
                    className="h-10 md:h-12"
                    {...signUpForm.register("confirmPassword")}
                  />
                  {signUpForm.formState.errors.confirmPassword && (
                    <p className="text-xs md:text-sm text-destructive">
                      {signUpForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full h-10 md:h-12 text-sm md:text-base font-medium" size="lg" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
