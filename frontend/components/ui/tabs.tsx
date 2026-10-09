"use client"

import * as React from "react"
import { cn } from "cn"

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

function Tabs({ defaultValue, value, onValueChange, children, className }: React.HTMLAttributes<HTMLDivElement> & {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  
  const currentValue = value !== undefined ? value : internalValue
  const handleValueChange = React.useCallback((newValue: string) => {
    if (onValueChange) {
      onValueChange(newValue)
    } else {
      setInternalValue(newValue)
    }
  }, [onValueChange])

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className={cn(className)}>{children}</div>
    </TabsContext.Provider>
  )
}

function TabsList({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("inline-flex h-8 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)}>
      {children}
    </div>
  )
}

function TabsTrigger({ value, children, className }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const context = React.useContext(TabsContext)
  
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        context?.value === value
          ? "bg-background text-foreground shadow-sm"
          : "hover:bg-background/50 hover:text-foreground",
        className
      )}
      onClick={() => context?.onValueChange(value)}
    >
      {children}
    </button>
  )
}

function TabsContent({ value, children, className }: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const context = React.useContext(TabsContext)
  
  if (context?.value !== value) {
    return null
  }
  
  return (
    <div className={cn("ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}>
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
