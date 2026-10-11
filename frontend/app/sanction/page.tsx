"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { StatCard } from "@/components/stat-card"
import { StatusBadge } from "@/components/status-badge"
import { sanctionApi } from "@/lib/api"
import { ChevronLeft, ChevronRight, Search, Check, X, Calendar, DollarSign, User, FileText, TrendingUp, Clock, CheckCircle } from "lucide-react"
import Image from "next/image"

interface PersonalDetails {
  fullName: string
  dateOfBirth: string
  phoneNumber: string
  address: string
  city: string
  state: string
  pinCode: string
  panNumber?: string
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
  status: string
  approvalReason?: string
  rejectionReason?: string
  approvedBy?: {
    _id: string
    fullName: string
  }
  approvedAt?: string
  createdAt: string
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

export default function SanctionPage() {
  const [applications, setApplications] = useState<LoanApplication[]>([])
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [statistics, setStatistics] = useState<any>(null)
  const [mySanctionsOnly, setMySanctionsOnly] = useState(false)

  // Detail panel state
  const [selectedApplication, setSelectedApplication] = useState<LoanApplication | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  // Approval dialog state
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [approving, setApproving] = useState(false)
  const [approvalReason, setApprovalReason] = useState("")
  const [approvalError, setApprovalError] = useState<string | null>(null)

  // Rejection dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [rejectionError, setRejectionError] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)

  const fetchApplications = async () => {
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
      if (mySanctionsOnly) {
        params.mySanctions = true
      }
      const result = await sanctionApi.getApplications(params)
      setApplications(result.applications)
      setPagination(result.pagination)
    } catch (err) {
      console.error("Error fetching applications:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      const stats = await sanctionApi.getStatistics()
      setStatistics(stats)
    } catch (err) {
      console.error("Error fetching statistics:", err)
    }
  }

  useEffect(() => {
    fetchApplications()
    fetchStatistics()
  }, [currentPage, sortBy, sortOrder, mySanctionsOnly])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchApplications()
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  const openApproveDialog = (application: LoanApplication) => {
    setSelectedApplication(application)
    setApprovalReason("")
    setApprovalError(null)
    setApproveDialogOpen(true)
  }

  const openRejectDialog = (application: LoanApplication) => {
    setSelectedApplication(application)
    setRejectionReason("")
    setRejectionError(null)
    setRejectDialogOpen(true)
  }

  const openDetailPanel = (application: LoanApplication) => {
    setSelectedApplication(application)
    setDetailDialogOpen(true)
  }

  const closeDetailPanel = () => {
    setSelectedApplication(null)
    setDetailDialogOpen(false)
  }

  const handleApprove = async () => {
    if (!selectedApplication || !selectedApplication._id) {
      setApprovalError("Invalid application data - missing ID")
      return
    }

    // Validate approval reason if provided
    if (approvalReason && approvalReason.trim().length < 10) {
      setApprovalError("Approval reason must be at least 10 characters")
      return
    }

    setApproving(true)
    setApprovalError(null)
    try {
      await sanctionApi.approveApplication(selectedApplication._id, approvalReason.trim() || undefined)
      setApproveDialogOpen(false)
      setSelectedApplication(null)
      setApprovalReason("")
      setDetailDialogOpen(false)
      fetchApplications()
    } catch (err) {
      console.error("Error approving application:", err)
      setApprovalError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async () => {
    if (!selectedApplication || !selectedApplication._id) {
      setRejectionError("Invalid application data - missing ID")
      return
    }

    // Validate rejection reason
    if (rejectionReason.trim().length < 10) {
      setRejectionError("Rejection reason must be at least 10 characters")
      return
    }

    setRejecting(true)
    setRejectionError(null)

    try {
      await sanctionApi.rejectApplication(selectedApplication._id, rejectionReason.trim())
      setRejectDialogOpen(false)
      setSelectedApplication(null)
      setRejectionReason("")
      setDetailDialogOpen(false)
      fetchApplications()
    } catch (err) {
      console.error("Error rejecting application:", err)
      setRejectionError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setRejecting(false)
    }
  }

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

  return (
    <ProtectedRoute allowedRoles={["Admin", "Sanction"]}>
      <DashboardLayout
        title="Sanction"
        currentPage="sanction"
      >
      {/* Header Banner with Vector Image */}
      <div className="relative mb-6 rounded-2xl overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-primary/80 shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <Image
            src="/mohamed_hassan-businessman-7682434_1920.png"
            alt="Business"
            fill
            className="object-cover"
          />
        </div>
        <div className="relative z-10 p-6 md:p-8">
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <Image
                src="/mohamed_hassan-businessman-7682434_1920.png"
                alt="Sanction officer"
                width={64}
                height={64}
                className="rounded-full"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-primary-foreground mb-1">Loan Sanction Dashboard</h2>
              <p className="text-primary-foreground/80">Review and approve loan applications efficiently</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Pending Applications"
          value={statistics?.pendingApplications || 0}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          title="Sanctioned This Month"
          value={statistics?.approvedThisMonth || 0}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard
          title="Total Sanctioned Amount"
          value={formatCurrency(statistics?.totalSanctionedAmount || 0)}
          icon={<DollarSign className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Main Table */}
        <div>
          <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Pending Loan Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by borrower name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 pl-9"
                />
              </div>
              <Button type="submit" className="h-11">Search</Button>
              <Button
                type="button"
                variant={mySanctionsOnly ? "default" : "outline"}
                onClick={() => setMySanctionsOnly(!mySanctionsOnly)}
                className="h-11"
              >
                {mySanctionsOnly ? "All Applications" : "My Sanctions Only"}
              </Button>
            </div>
          </form>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading applications...</p>
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
                onClick={fetchApplications}
                className="mt-2 h-9"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && applications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No applications found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                {searchQuery
                  ? "No applications match your search criteria. Try a different search term."
                  : "There are no pending or under-review loan applications."}
              </p>
            </div>
          )}

          {/* Table */}
          {!loading && !error && applications.length > 0 && (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort("createdAt")}
                      >
                        Applied On
                        {sortBy === "createdAt" && (
                          <span className="ml-1">
                            {sortOrder === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </TableHead>
                      <TableHead>Borrower</TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort("requestedPrincipal")}
                      >
                        Amount
                        {sortBy === "requestedPrincipal" && (
                          <span className="ml-1">
                            {sortOrder === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </TableHead>
                      <TableHead>Tenure</TableHead>
                      <TableHead>Interest Rate</TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort("totalRepayment")}
                      >
                        Total Repayment
                        {sortBy === "totalRepayment" && (
                          <span className="ml-1">
                            {sortOrder === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app) => (
                      <TableRow key={app._id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(app.createdAt)}
                          </div>
                        </TableCell>
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
                        <TableCell>{app.tenureDays} days</TableCell>
                        <TableCell>{app.annualInterestRate}%</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            {formatCurrency(app.totalRepayment)}
                          </div>
                        </TableCell>
                        <TableCell><StatusBadge status={app.status as any} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDetailPanel(app)}
                              className="h-9"
                            >
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openApproveDialog(app)}
                              disabled={app.status !== "Pending" && app.status !== "UnderReview"}
                              className="h-9"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openRejectDialog(app)}
                              disabled={app.status !== "Pending" && app.status !== "UnderReview"}
                              className="h-9"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
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
                    {pagination.total} applications
                  </p>
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => prev - 1)}
                      disabled={!pagination.hasPreviousPage}
                      className="h-9"
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
                            className="h-9"
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
                      className="h-9"
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
        </div>
      </div>

      {/* Application Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              View detailed information about this loan application
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Borrower</Label>
                  <p className="font-medium">{selectedApplication.personalDetails.fullName}</p>
                  <p className="text-sm text-muted-foreground">{selectedApplication.borrowerId?.email || 'N/A'}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Employment Mode</Label>
                  <p className="font-medium">{selectedApplication.employmentMode}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Monthly Salary</Label>
                  <p className="font-medium">{formatCurrency(selectedApplication.monthlySalary)}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Eligibility</Label>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-3 w-3" />
                    Passed
                  </span>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Requested Principal</Label>
                  <p className="font-medium">{formatCurrency(selectedApplication.requestedPrincipal)}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Total Repayment</Label>
                  <p className="font-medium text-lg">{formatCurrency(selectedApplication.totalRepayment)}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Tenure</Label>
                  <p className="font-medium">{selectedApplication.tenureDays} days</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Interest Rate</Label>
                  <p className="font-medium">{selectedApplication.annualInterestRate}%</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Address</Label>
                <p className="font-medium text-sm">
                  {selectedApplication.personalDetails.address}, {selectedApplication.personalDetails.city}, {selectedApplication.personalDetails.state} - {selectedApplication.personalDetails.pinCode}
                </p>
              </div>

              {selectedApplication.approvalReason && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Approval Reason</Label>
                  <p className="font-medium text-sm">{selectedApplication.approvalReason}</p>
                </div>
              )}

              {selectedApplication.rejectionReason && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Rejection Reason</Label>
                  <p className="font-medium text-sm text-destructive">{selectedApplication.rejectionReason}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-muted-foreground">Salary Slip</Label>
                <Button variant="outline" size="sm" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  View Document
                </Button>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  className="flex-1"
                  onClick={() => {
                    closeDetailPanel()
                    openApproveDialog(selectedApplication)
                  }}
                  disabled={selectedApplication.status !== "Pending" && selectedApplication.status !== "UnderReview"}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Sanction
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    closeDetailPanel()
                    openRejectDialog(selectedApplication)
                  }}
                  disabled={selectedApplication.status !== "Pending" && selectedApplication.status !== "UnderReview"}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sanction Confirmation Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sanction Loan Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to sanction this loan application? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="py-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Borrower:</span>
                <span className="font-medium">{selectedApplication.personalDetails.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Loan Amount:</span>
                <span className="font-medium">{formatCurrency(selectedApplication.requestedPrincipal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Repayment:</span>
                <span className="font-medium">{formatCurrency(selectedApplication.totalRepayment)}</span>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="approvalReason">Approval Reason (Optional)</Label>
            <Textarea
              id="approvalReason"
              placeholder="Provide a reason for approving this application..."
              value={approvalReason}
              onChange={(e) => setApprovalReason(e.target.value)}
              className="min-h-[100px]"
            />
            {approvalError && (
              <p className="text-sm text-destructive">{approvalError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Optional. If provided, minimum 10 characters, maximum 500 characters
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
              disabled={approving}
            >
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={approving}>
              {approving ? "Sanctioning..." : "Sanction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Loan Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this loan application. This will be communicated to the borrower.
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="py-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Borrower:</span>
                <span className="font-medium">{selectedApplication.personalDetails.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Loan Amount:</span>
                <span className="font-medium">{formatCurrency(selectedApplication.requestedPrincipal)}</span>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="rejectionReason">Rejection Reason *</Label>
            <Textarea
              id="rejectionReason"
              placeholder="Please explain why this application is being rejected..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
            {rejectionError && (
              <p className="text-sm text-destructive">{rejectionError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters, maximum 500 characters
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={rejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejecting || rejectionReason.trim().length < 10}
            >
              {rejecting ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
