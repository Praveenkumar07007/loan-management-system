"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatCard } from "@/components/stat-card"
import { StatusBadge } from "@/components/status-badge"
import { collectionApi } from "@/lib/api"
import { ChevronLeft, ChevronRight, Search, Calendar, DollarSign, User, FileText, TrendingUp, Clock, CheckCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface PersonalDetails {
  fullName: string
  dateOfBirth: string
  phoneNumber: string
  address: string
  city: string
  state: string
  pinCode: string
}

interface Borrower {
  _id: string
  fullName: string
  email: string
}

interface LoanApplication {
  _id: string
  borrowerId: Borrower
  personalDetails: PersonalDetails
  employmentMode: string
  monthlySalary: number
  requestedPrincipal: number
  tenureDays: number
  annualInterestRate: number
  calculatedInterest: number
  totalRepayment: number
  amountPaid: number
  status: string
  createdAt: string
  disbursedAt?: string
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  sortBy: string
  sortOrder: string
}

export default function CollectionPage() {
  const [applications, setApplications] = useState<LoanApplication[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [statistics, setStatistics] = useState<any>(null)

  const fetchActiveLoans = async () => {
    setLoading(true)
    setError(null)

    try {
      const params: any = {
        page: currentPage,
        limit: 10,
        sortBy,
        sortOrder,
      }
      if (searchQuery) {
        params.search = searchQuery
      }
      const result = await collectionApi.getActiveLoans(params)
      setApplications(result.applications || [])
      setPagination(result.pagination)
    } catch (err) {
      console.error("Error fetching active loans:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      const stats = await collectionApi.getStatistics()
      setStatistics(stats)
    } catch (err) {
      console.error("Error fetching statistics:", err)
    }
  }

  useEffect(() => {
    fetchActiveLoans()
    fetchStatistics()
  }, [currentPage, sortBy, sortOrder, searchQuery])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const calculateOutstanding = (app: LoanApplication) => {
    return app.totalRepayment - app.amountPaid
  }

  return (
    <ProtectedRoute allowedRoles={["Admin", "Collection"]}>
      <DashboardLayout
        title="Collection"
        currentPage="collection"
      >
      {/* Header Banner with Vector Image */}
      <div className="relative mb-6 rounded-2xl overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-primary/80 shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <Image
            src="/febrianes86-money-7065558_1920.png"
            alt="Collection"
            fill
            className="object-cover"
          />
        </div>
        <div className="relative z-10 p-6 md:p-8">
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <Image
                src="/febrianes86-money-7065558_1920.png"
                alt="Money collection"
                width={64}
                height={64}
                className="rounded-lg"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-primary-foreground mb-1">Loan Collection Dashboard</h2>
              <p className="text-primary-foreground/80">Track payments and manage loan repayments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Active Loans"
          value={statistics?.activeLoans || 0}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          title="Collected This Month"
          value={formatCurrency(statistics?.collectedThisMonth || 0)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Collection Rate"
          value={statistics?.collectionRate || "0%"}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Loans</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <form onSubmit={(e) => e.preventDefault()} className="mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by borrower name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </form>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading loans...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive mb-4">
              <p className="text-sm">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchActiveLoans}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && applications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No active loans found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                There are no active loans pending collection.
              </p>
            </div>
          )}

          {/* Table */}
          {!loading && applications.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Borrower</TableHead>
                    <TableHead>Loan Amount</TableHead>
                    <TableHead>Total Repayment</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications
                    .filter((app) =>
                      app.personalDetails.fullName
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                    )
                    .map((app) => (
                      <TableRow key={app._id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{app.personalDetails.fullName}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">{app.borrowerId?.email || 'N/A'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            {formatCurrency(app.requestedPrincipal)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            {formatCurrency(app.totalRepayment)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            {formatCurrency(app.amountPaid || 0)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-destructive">{formatCurrency((app.totalRepayment || 0) - (app.amountPaid || 0))}</span>
                          </div>
                        </TableCell>
                        <TableCell><StatusBadge status={app.status as any} /></TableCell>
                        <TableCell className="text-right">
                          {app._id ? (
                            <Link href={`/collection/${app._id}`}>
                              <Button size="sm">
                                Manage
                                <ArrowRight className="h-4 w-4 ml-1" />
                              </Button>
                            </Link>
                          ) : (
                            <Button size="sm" disabled>
                              Manage
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} loans
              </p>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  disabled={!pagination.hasPreviousPage}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = i + 1
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === pagination.page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  disabled={!pagination.hasNextPage}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
