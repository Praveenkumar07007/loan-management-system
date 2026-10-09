"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { setToken } from "@/lib/auth"
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

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const router = useRouter()

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
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Login failed')
      }

      const result = await response.json()
      setToken(result.data.token)
      router.push('/apply')
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
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: data.fullName,
          email: data.email,
          password: data.password,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Registration failed')
      }

      const result = await response.json()
      setToken(result.data.token)
      router.push('/apply')
    } catch (error) {
      console.error("Sign up error:", error)
      setAuthError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome to LMS"
      description="Your trusted partner for quick and easy loan management"
    >
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Account</CardTitle>
          <CardDescription>
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authError && (
            <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm mb-4">
              {authError}
            </div>
          )}
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={signInForm.handleSubmit(onSignInSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="name@example.com"
                    {...signInForm.register("email")}
                  />
                  {signInForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {signInForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    {...signInForm.register("password")}
                  />
                  {signInForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {signInForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    {...signUpForm.register("fullName")}
                  />
                  {signUpForm.formState.errors.fullName && (
                    <p className="text-sm text-destructive">
                      {signUpForm.formState.errors.fullName.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="name@example.com"
                    {...signUpForm.register("email")}
                  />
                  {signUpForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {signUpForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    {...signUpForm.register("password")}
                  />
                  {signUpForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {signUpForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm Password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="••••••••"
                    {...signUpForm.register("confirmPassword")}
                  />
                  {signUpForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {signUpForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
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
