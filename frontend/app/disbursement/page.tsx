"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import { StatCard } from "@/components/stat-card"
import { StatusBadge } from "@/components/status-badge"
import { disbursementApi } from "@/lib/api"
import { ChevronLeft, ChevronRight, Search, Check, Calendar, DollarSign, User, FileText, TrendingUp, Clock, CheckCircle } from "lucide-react"

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
  disbursedAt?: string
  disbursedBy?: any
  createdAt: string
}

export default function DisbursementPage() {
  const [applications, setApplications] = useState<LoanApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statistics, setStatistics] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<"pending" | "disbursed">("pending")

  // Disbursement dialog state
  const [disburseDialogOpen, setDisburseDialogOpen] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<LoanApplication | null>(null)
  const [disbursing, setDisbursing] = useState(false)

  const fetchDisbursedLoans = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await disbursementApi.getSanctionedLoans({
        page: 1,
        limit: 10,
        search: searchQuery || undefined,
        status: activeTab === 'pending' ? 'Approved' : 'Active', // Show Active loans in disbursed tab
      })
      setApplications(result.applications || [])
    } catch (err) {
      console.error("Error fetching loans:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      const stats = await disbursementApi.getStatistics()
      setStatistics(stats)
    } catch (err) {
      console.error("Error fetching statistics:", err)
    }
  }

  useEffect(() => {
    fetchDisbursedLoans()
    fetchStatistics()
  }, [activeTab])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        fetchDisbursedLoans()
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, activeTab])

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

  const openDisburseDialog = (application: LoanApplication) => {
    setSelectedApplication(application)
    setDisburseDialogOpen(true)
  }

  const handleDisburse = async () => {
    if (!selectedApplication) return

    setDisbursing(true)
    try {
      await disbursementApi.disburseLoan(selectedApplication._id)
      setDisburseDialogOpen(false)
      setSelectedApplication(null)
      fetchDisbursedLoans()
    } catch (err) {
      console.error("Error disbursing loan:", err)
      alert(err instanceof Error ? err.message : "Failed to disburse loan")
    } finally {
      setDisbursing(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={["Admin", "Disbursement"]}>
      <DashboardLayout
        title="Disbursement"
        currentPage="disbursement"
      >
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Pending Disbursements"
          value={statistics?.pendingDisbursements || 0}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          title="Disbursed This Month"
          value={statistics?.disbursedThisMonth || 0}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <StatCard
          title="Total Disbursed Amount"
          value={formatCurrency(statistics?.totalDisbursedAmount || 0)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Loan Disbursement</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "pending" | "disbursed")} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">Pending Disbursement</TabsTrigger>
              <TabsTrigger value="disbursed">Disbursed Loans</TabsTrigger>
            </TabsList>

            {/* Search - common for both tabs */}
            <form onSubmit={(e) => e.preventDefault()} className="mt-6 mb-6">
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

            {/* Pending Disbursement Tab Content */}
            <TabsContent value="pending">
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
                    onClick={fetchDisbursedLoans}
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
                  <h3 className="text-lg font-medium mb-2">No pending disbursements</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    There are no loans pending disbursement.
                  </p>
                </div>
              )}

              {/* Table */}
              {!loading && !error && applications.length > 0 && (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Borrower</TableHead>
                        <TableHead>Loan Amount</TableHead>
                        <TableHead>Tenure</TableHead>
                        <TableHead>Total Repayment</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((app) => (
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
                            <TableCell>{app.tenureDays} days</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                {formatCurrency(app.totalRepayment)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={() => openDisburseDialog(app)}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Mark Disbursed
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Disbursed Loans Tab Content */}
            <TabsContent value="disbursed">
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
                    onClick={fetchDisbursedLoans}
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
                  <h3 className="text-lg font-medium mb-2">No disbursed loans found</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    You haven't disbursed any loans yet.
                  </p>
                </div>
              )}

              {/* Table */}
              {!loading && !error && applications.length > 0 && (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Borrower</TableHead>
                        <TableHead>Loan Amount</TableHead>
                        <TableHead>Tenure</TableHead>
                        <TableHead>Total Repayment</TableHead>
                        <TableHead>Disbursed On</TableHead>
                        <TableHead>Disbursed By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((app) => (
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
                            <TableCell>{app.tenureDays} days</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                {formatCurrency(app.totalRepayment)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {app.disbursedAt ? formatDate(app.disbursedAt) : 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{app.disbursedBy?.fullName || 'N/A'}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Disbursement Confirmation Dialog */}
      <Dialog open={disburseDialogOpen} onOpenChange={setDisburseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Loan as Disbursed</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this loan as disbursed? This action cannot be undone.
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDisburseDialogOpen(false)}
              disabled={disbursing}
            >
              Cancel
            </Button>
            <Button onClick={handleDisburse} disabled={disbursing}>
              {disbursing ? "Processing..." : "Confirm Disbursement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
