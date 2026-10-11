"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatCard } from "@/components/stat-card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { salesApi, loanApi } from "@/lib/api"
import { ChevronLeft, ChevronRight, Search, User, Mail, Calendar, Users, TrendingUp, Clock, Phone, MapPin, FileText, X } from "lucide-react"

interface Borrower {
  _id: string
  fullName: string
  email: string
  role: string
  createdAt: string
  phoneNumber?: string
  address?: string
  city?: string
  state?: string
  pinCode?: string
  applicationCount?: number
}

interface LoanApplication {
  _id: string
  status: string
  requestedPrincipal: number
  tenureDays: number
  annualInterestRate: number
  createdAt: string
  personalDetails: {
    fullName: string
    phoneNumber: string
    address: string
  }
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

export default function SalesPage() {
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [statistics, setStatistics] = useState<any>(null)
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null)
  const [borrowerLoans, setBorrowerLoans] = useState<LoanApplication[]>([])
  const [loadingBorrowerDetails, setLoadingBorrowerDetails] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)

  const fetchBorrowers = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await salesApi.getBorrowers({
        page: currentPage,
        limit: 10,
        search: searchQuery || undefined,
        sortBy,
        sortOrder,
      })
      setBorrowers(result.borrowers)
      setPagination(result.pagination)
    } catch (err) {
      console.error("Error fetching borrowers:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      const stats = await salesApi.getStatistics()
      setStatistics(stats)
    } catch (err) {
      console.error("Error fetching statistics:", err)
    }
  }

  const fetchBorrowerDetails = async (borrower: Borrower) => {
    setLoadingBorrowerDetails(true)
    setSelectedBorrower(borrower)
    setDetailsDialogOpen(true)

    try {
      // Fetch borrower details with loan applications from backend
      const result = await salesApi.getBorrowerDetails(borrower._id)
      setSelectedBorrower(result.borrower)
      setBorrowerLoans(result.loanApplications || [])
    } catch (err) {
      console.error("Error fetching borrower details:", err)
    } finally {
      setLoadingBorrowerDetails(false)
    }
  }

  useEffect(() => {
    fetchBorrowers()
    fetchStatistics()
  }, [currentPage, sortBy, sortOrder])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchBorrowers()
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <ProtectedRoute allowedRoles={["Admin", "Sales"]}>
      <DashboardLayout
        title="Sales"
        currentPage="sales"
      >
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Applications"
          value={statistics?.totalApplications || 0}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Pending Review"
          value={statistics?.pendingApplications || 0}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          title="Approved This Month"
          value={statistics?.approvedThisMonth || 0}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Borrowers</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit">Search</Button>
            </div>
          </form>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading borrowers...</p>
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
                onClick={fetchBorrowers}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && borrowers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No borrowers found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                {searchQuery
                  ? "No borrowers match your search criteria. Try a different search term."
                  : "There are no registered borrowers without loan applications."}
              </p>
            </div>
          )}

          {/* Table */}
          {!loading && !error && borrowers.length > 0 && (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort("fullName")}
                      >
                        Name
                        {sortBy === "fullName" && (
                          <span className="ml-1">
                            {sortOrder === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort("email")}
                      >
                        Email
                        {sortBy === "email" && (
                          <span className="ml-1">
                            {sortOrder === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort("createdAt")}
                      >
                        Registered On
                        {sortBy === "createdAt" && (
                          <span className="ml-1">
                            {sortOrder === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </TableHead>
                      <TableHead>Applications</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {borrowers.map((borrower) => (
                      <TableRow key={borrower._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <User className="h-4 w-4" />
                            </div>
                            {borrower.fullName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {borrower.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(borrower.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            borrower.applicationCount === 0
                              ? "bg-gray-100 text-gray-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {borrower.applicationCount || 0} application(s)
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchBorrowerDetails(borrower)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                    {pagination.total} borrowers
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Borrower Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Borrower Details</DialogTitle>
          </DialogHeader>
          {loadingBorrowerDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading details...</p>
              </div>
            </div>
          ) : selectedBorrower ? (
            <div className="space-y-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium">{selectedBorrower.fullName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedBorrower.email}</p>
                    </div>
                    {selectedBorrower.phoneNumber && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Phone Number</p>
                        <p className="font-medium">{selectedBorrower.phoneNumber}</p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Registered On</p>
                      <p className="font-medium">{formatDate(selectedBorrower.createdAt)}</p>
                    </div>
                    {selectedBorrower.address && (
                      <div className="space-y-1 col-span-2">
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="font-medium">{selectedBorrower.address}</p>
                      </div>
                    )}
                    {selectedBorrower.city && selectedBorrower.state && (
                      <>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">City</p>
                          <p className="font-medium">{selectedBorrower.city}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">State</p>
                          <p className="font-medium">{selectedBorrower.state}</p>
                        </div>
                      </>
                    )}
                    {selectedBorrower.pinCode && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Pin Code</p>
                        <p className="font-medium">{selectedBorrower.pinCode}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Loan Applications */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Loan Applications</CardTitle>
                  <CardDescription>
                    {borrowerLoans.length === 0
                      ? "No loan applications yet"
                      : `${borrowerLoans.length} application(s)`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {borrowerLoans.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground">
                        This borrower hasn't applied for any loans yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {borrowerLoans.map((loan) => (
                        <div
                          key={loan._id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="space-y-1">
                            <p className="font-medium">
                              {new Intl.NumberFormat("en-IN", {
                                style: "currency",
                                currency: "INR",
                                maximumFractionDigits: 0,
                              }).format(loan.requestedPrincipal)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {loan.tenureDays} days • {loan.annualInterestRate}% interest
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Applied on {formatDate(loan.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                loan.status === "Approved"
                                  ? "bg-green-100 text-green-800"
                                  : loan.status === "Rejected"
                                  ? "bg-red-100 text-red-800"
                                  : loan.status === "Pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {loan.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
