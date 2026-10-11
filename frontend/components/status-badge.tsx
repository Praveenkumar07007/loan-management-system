import { cn } from "cn"

type LoanStatus = "Applied" | "Sanctioned" | "Rejected" | "Disbursed" | "Closed" | "Pending" | "UnderReview" | "Approved"

interface StatusBadgeProps {
  status: LoanStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig: Record<LoanStatus, { variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"; label: string }> = {
    Applied: { variant: "secondary", label: "Applied" },
    Sanctioned: { variant: "default", label: "Sanctioned" },
    Rejected: { variant: "destructive", label: "Rejected" },
    Disbursed: { variant: "outline", label: "Disbursed" },
    Closed: { variant: "success", label: "Closed" },
    Pending: { variant: "warning", label: "Pending" },
    UnderReview: { variant: "secondary", label: "Under Review" },
    Approved: { variant: "success", label: "Approved" },
  }

  const config = statusConfig[status] || { variant: "secondary", label: status }

  const variantStyles = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-destructive text-destructive-foreground",
    outline: "border border-input bg-background",
    success: "bg-green-600 dark:bg-green-500 text-white",
    warning: "bg-yellow-500 dark:bg-yellow-400 text-white",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[config.variant],
        className
      )}
    >
      {config.label}
    </span>
  )
}
