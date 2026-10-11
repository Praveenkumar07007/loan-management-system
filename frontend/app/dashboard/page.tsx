"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/stat-card"
import { DollarSign, Users, TrendingUp, Clock, FileText, CheckCircle, AlertCircle } from "lucide-react"
import { getUserData, isAuthenticated } from "@/lib/auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { sanctionApi, salesApi, disbursementApi, collectionApi, loanApi } from "@/lib/api"

type UserRole = "Admin" | "Sales" | "Sanction" | "Disbursement" | "Collection" | "Borrower"

export default function DashboardPage() {
  const router = useRouter()
  const userData = getUserData()
  const userRole = userData?.role as UserRole
  const [statistics, setStatistics] = useState<any>(null)
  const [recentActivities, setRecentActivities] = useState<any[]>([])

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthenticated() || !userData) {
      router.push("/login")
    }
  }, [userData, router])

  useEffect(() => {
    if (!userRole) return

    // Fetch role-specific statistics
    const fetchStatistics = async () => {
      try {
        switch (userRole) {
          case "Sanction":
            const sanctionStats = await sanctionApi.getStatistics()
            setStatistics(sanctionStats)
            // Fetch recent activities for Sanction role
            const sanctionActivities = await sanctionApi.getRecentActivity()
            setRecentActivities(sanctionActivities.activities || [])
            break
          case "Sales":
            const salesStats = await salesApi.getStatistics()
            setStatistics(salesStats)
            break
          case "Disbursement":
            const disbursementStats = await disbursementApi.getStatistics()
            setStatistics(disbursementStats)
            // Fetch recent activities for Disbursement role
            try {
              const disbursementActivities = await disbursementApi.getRecentActivity()
              setRecentActivities(disbursementActivities.activities || [])
            } catch (activityError) {
              // Silently handle activity fetch error
            }
            break
          case "Collection":
            const collectionStats = await collectionApi.getStatistics()
            setStatistics(collectionStats)
            break
          case "Borrower":
            const borrowerStats = await loanApi.getStatistics()
            setStatistics(borrowerStats)
            break
          case "Admin":
            // Admin uses sanction statistics for now
            const adminStats = await sanctionApi.getStatistics()
            setStatistics(adminStats)
            const adminActivities = await sanctionApi.getRecentActivity()
            setRecentActivities(adminActivities.activities || [])
            break
        }
      } catch (error) {
        console.error("Error fetching statistics:", error)
      }
    }

    fetchStatistics()
  }, [userRole])

  if (!userData) {
    return null
  }

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Role-specific dashboard configurations
  const getDashboardConfig = (role: UserRole) => {
    switch (role) {
      case "Admin":
        return {
          stats: [
            { title: "Pending Applications", value: statistics?.pendingApplications || 0, change: "", changeType: "neutral" as const, icon: <Clock className="h-5 w-5" /> },
            { title: "Approved This Month", value: statistics?.approvedThisMonth || 0, change: "", changeType: "positive" as const, icon: <CheckCircle className="h-5 w-5" /> },
            { title: "Total Sanctioned Amount", value: formatCurrency(statistics?.totalSanctionedAmount || 0), change: "", changeType: "positive" as const, icon: <DollarSign className="h-5 w-5" /> },
            { title: "Total Approved", value: statistics?.approvedTotal || 0, change: "", changeType: "positive" as const, icon: <TrendingUp className="h-5 w-5" /> },
          ],
          activities: recentActivities,
          actions: [
            { label: "View All Applications", href: "/sanction" },
            { label: "Manage Borrowers", href: "/sales" },
            { label: "Generate Reports", href: "#" },
            { label: "System Settings", href: "#" }
          ]
        }
      case "Sales":
        return {
          stats: [
            { title: "Total Applications", value: statistics?.totalApplications || 0, change: "", changeType: "positive" as const, icon: <FileText className="h-5 w-5" /> },
            { title: "Pending Review", value: statistics?.pendingApplications || 0, change: "", changeType: "neutral" as const, icon: <Clock className="h-5 w-5" /> },
            { title: "Approved This Month", value: statistics?.approvedThisMonth || 0, change: "", changeType: "positive" as const, icon: <CheckCircle className="h-5 w-5" /> },
            { title: "Rejected This Month", value: statistics?.rejectedThisMonth || 0, change: "", changeType: "positive" as const, icon: <AlertCircle className="h-5 w-5" /> },
          ],
          activities: recentActivities,
          actions: [
            { label: "View All Applications", href: "/sales" },
            { label: "Review Pending", href: "/sales" },
            { label: "Track Conversions", href: "#" }
          ]
        }
      case "Sanction":
        return {
          stats: [
            { title: "Pending Sanctions", value: statistics?.pendingApplications || 0, change: `${statistics?.underReview || 0} under review`, changeType: "neutral" as const, icon: <Clock className="h-5 w-5" /> },
            { title: "Sanctioned This Month", value: statistics?.approvedThisMonth || 0, change: "", changeType: "positive" as const, icon: <CheckCircle className="h-5 w-5" /> },
            { title: "Total Sanctioned Amount", value: formatCurrency(statistics?.totalSanctionedAmount || 0), change: "", changeType: "positive" as const, icon: <DollarSign className="h-5 w-5" /> },
            { title: "Total Approved", value: statistics?.approvedTotal || 0, change: "", changeType: "positive" as const, icon: <TrendingUp className="h-5 w-5" /> },
          ],
          activities: recentActivities,
          actions: [
            { label: "Review Pending Sanctions", href: "/sanction" },
            { label: "View Sanctioned Loans", href: "/sanction" },
            { label: "Generate Reports", href: "#" }
          ]
        }
      case "Disbursement":
        return {
          stats: [
            { title: "Pending Disbursements", value: statistics?.pendingDisbursements || 0, change: "", changeType: "neutral" as const, icon: <Clock className="h-5 w-5" /> },
            { title: "Disbursed This Month", value: statistics?.disbursedThisMonth || 0, change: "", changeType: "positive" as const, icon: <CheckCircle className="h-5 w-5" /> },
            { title: "Total Disbursed", value: formatCurrency(statistics?.totalDisbursedAmount || 0), change: "", changeType: "positive" as const, icon: <DollarSign className="h-5 w-5" /> },
            { title: "Total Disbursed Count", value: statistics?.totalDisbursed || 0, change: "", changeType: "positive" as const, icon: <TrendingUp className="h-5 w-5" /> },
          ],
          activities: recentActivities,
          actions: [
            { label: "Process Disbursements", href: "/disbursement" },
            { label: "View Failed Transactions", href: "/disbursement" },
            { label: "Generate Reports", href: "#" }
          ]
        }
      case "Collection":
        return {
          stats: [
            { title: "Active Loans", value: statistics?.activeLoans || 0, change: "", changeType: "neutral" as const, icon: <AlertCircle className="h-5 w-5" /> },
            { title: "Collected This Month", value: formatCurrency(statistics?.collectedThisMonth || 0), change: "", changeType: "positive" as const, icon: <DollarSign className="h-5 w-5" /> },
            { title: "Collection Rate", value: statistics?.collectionRate || "0%", change: "", changeType: "positive" as const, icon: <TrendingUp className="h-5 w-5" /> },
            { title: "Upcoming EMI", value: statistics?.upcomingEMI || 0, change: "", changeType: "neutral" as const, icon: <Clock className="h-5 w-5" /> },
          ],
          activities: recentActivities,
          actions: [
            { label: "View Overdue Loans", href: "/collection" },
            { label: "Send Reminders", href: "#" },
            { label: "Generate Collection Reports", href: "#" }
          ]
        }
      case "Borrower":
        return {
          stats: [
            { title: "Active Loans", value: statistics?.disbursedApplications || 0, change: "", changeType: "neutral" as const, icon: <FileText className="h-5 w-5" /> },
            { title: "Next EMI", value: formatCurrency(statistics?.nextEmiAmount || 0), change: "", changeType: "neutral" as const, icon: <Clock className="h-5 w-5" /> },
            { title: "Total Borrowed", value: formatCurrency(statistics?.totalBorrowed || 0), change: "", changeType: "positive" as const, icon: <DollarSign className="h-5 w-5" /> },
            { title: "Applications", value: statistics?.totalApplications || 0, change: `${statistics?.pendingApplications || 0} pending`, changeType: "neutral" as const, icon: <AlertCircle className="h-5 w-5" /> },
          ],
          activities: recentActivities,
          actions: ["View My Loans", "Make Payment"]
        }
      default:
        return {
          stats: [],
          activities: [],
          actions: []
        }
    }
  }

  const config = getDashboardConfig(userRole)

  const getIconColor = (icon: string) => {
    switch (icon) {
      case "green": return "bg-green-500 dark:bg-green-400"
      case "primary": return "bg-primary"
      case "purple": return "bg-purple-500"
      default: return "bg-primary"
    }
  }

  // Default activities if none are loaded
  const displayActivities = recentActivities.length > 0 ? recentActivities : [
    { icon: "primary", text: "No recent activity", time: "-" }
  ]

  return (
    <DashboardLayout title="Dashboard" currentPage="dashboard" userRole={userRole}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {config.stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            changeType={stat.changeType}
            icon={stat.icon}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayActivities.map((activity, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className={`h-2 w-2 rounded-full ${getIconColor(activity.icon)}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.text}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {config.actions.map((action, index) => {
                // Handle both string and object actions
                const actionLabel = typeof action === 'string' ? action : action.label
                const actionHref = typeof action === 'string' ? undefined : action.href

                // Map string actions to routes for backward compatibility
                const actionRoutes: Record<string, string> = {
                  "View My Loans": "/my-loans",
                  "Make Payment": "/my-loans",
                }
                const href = actionHref || actionRoutes[actionLabel]

                return href ? (
                  <Link key={index} href={href}>
                    <button className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors min-h-[44px]">
                      {actionLabel}
                    </button>
                  </Link>
                ) : (
                  <button key={index} className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors min-h-[44px]">
                    {actionLabel}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
