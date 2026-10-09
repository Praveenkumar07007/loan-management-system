import { ReactNode } from "react"
import { cn } from "cn"

interface AuthLayoutProps {
  children: ReactNode
  title?: string
  description?: string
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col md:flex-row min-h-screen">
        {/* Left Panel - Brand */}
        <div className="hidden md:flex md:w-1/2 lg:w-5/12 bg-primary p-12 flex-col justify-between">
          <div>
            <h1 className="text-4xl font-bold text-primary-foreground mb-4">
              LMS
            </h1>
            <p className="text-lg text-primary-foreground/80">
              Loan Management System
            </p>
          </div>
          
          <div className="space-y-8">
            <h2 className="text-3xl font-semibold text-primary-foreground">
              {title || "Manage your loans with ease"}
            </h2>
            {description && (
              <p className="text-primary-foreground/70 text-lg">
                {description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-foreground">10K+</div>
              <div className="text-sm text-primary-foreground/70 mt-1">Active Loans</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-foreground">5K+</div>
              <div className="text-sm text-primary-foreground/70 mt-1">Happy Users</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-foreground">98%</div>
              <div className="text-sm text-primary-foreground/70 mt-1">Success Rate</div>
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
