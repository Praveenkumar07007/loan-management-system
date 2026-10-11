import { ReactNode } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { GridPattern } from "@/components/grid-pattern"
import Link from "next/link"
import { useTheme } from "@/components/theme-provider"

interface AuthLayoutProps {
  children: ReactNode
  title?: string
  description?: string
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  const { theme, setTheme } = useTheme()

  const toggleDarkMode = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <div className="min-h-screen bg-background w-full relative">
      {/* Dashed Top Left Fade Grid */}
      <GridPattern variant="top-left" />

      <div className="relative z-10 flex flex-col md:flex-row min-h-screen">
        {/* Left Panel - Brand */}
        <div className="hidden md:flex md:w-1/2 lg:w-5/12 bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-12 flex-col justify-between relative overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/loan giver image.png"
              alt="Loan Giver"
              fill
              className="object-cover opacity-20"
              priority
            />
          </div>

          <div className="relative z-10">
            <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
              <div className="flex items-center gap-4 mb-3">
                <Image
                  src="/image.png"
                  alt="Loanify Logo"
                  width={80}
                  height={80}
                  className="rounded-lg"
                />
                <h1 className="text-6xl font-bold text-primary-foreground tracking-tight">
                  Loanify
                </h1>
              </div>
            </Link>
            <p className="text-xl text-primary-foreground/80 font-medium tracking-wide">
              Loan Management System
            </p>
          </div>

          <div className="space-y-8 relative z-10">
            <h2 className="text-4xl font-semibold text-primary-foreground leading-tight">
              {title || "Quick & Easy Loans"}
            </h2>
            {description && (
              <p className="text-primary-foreground/90 text-xl leading-relaxed font-light">
                {description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-8 relative z-10">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary-foreground mb-2">10K+</div>
              <div className="text-sm text-primary-foreground/70 font-medium tracking-wide">Active Loans</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-primary-foreground mb-2">5K+</div>
              <div className="text-sm text-primary-foreground/70 font-medium tracking-wide">Happy Users</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-primary-foreground mb-2">98%</div>
              <div className="text-sm text-primary-foreground/70 font-medium tracking-wide">Success Rate</div>
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-12 bg-background relative">
          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
            className="absolute top-4 right-4 md:top-6 md:right-6 h-9 w-9 md:h-10 md:w-10 hover:bg-accent"
          >
            {theme === "dark" ? <i className="fas fa-sun h-4 w-4"></i> : <i className="fas fa-moon h-4 w-4"></i>}
          </Button>

          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
