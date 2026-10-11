"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DatePicker } from "@/components/ui/date-picker"
import { collectionApi } from "@/lib/api"
import { formatINR } from "@/lib/loanMath"
import { DollarSign, Calendar, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { use } from "react"
import { cn } from "cn"
import Image from "next/image"

interface Payment {
  _id: string
  utr: string
  paymentDate: string
  amount: number
  recordedBy?: {
    fullName: string
  }
}

interface LoanDetails {
  _id: string
  borrowerId: {
    fullName: string
    email: string
  }
  personalDetails: {
    fullName: string
  }
  requestedPrincipal: number
  totalRepayment: number
  amountPaid: number
  status: string
  payments?: Payment[]
}

export function CollectionPageContent({ params }: { params: Promise<{ loanId: string }> }) {
  const { loanId } = use(params)
  const router = useRouter()
  const [loanDetails, setLoanDetails] = useState<LoanDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Payment form state
  const [utr, setUtr] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState<Date>(new Date())
  const [utrError, setUtrError] = useState<string | null>(null)
  const [amountError, setAmountError] = useState<string | null>(null)
  const [dateError, setDateError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchLoanDetails = async () => {
    setLoading(true)
    setError(null)

    // Validate loan ID
    if (!loanId || loanId === 'undefined' || loanId === 'null') {
      setError("Invalid loan ID")
      router.push('/collection')
      setLoading(false)
      return
    }

    try {
      const result = await collectionApi.getLoanDetails(loanId)
      const application = result.application || result
      // Payments are a sibling of application in the API response
      const payments = result.payments || application.payments || []
      // Ensure payments array exists
      setLoanDetails({
        ...application,
        payments: payments
      })
    } catch (err: any) {
      console.error("Error fetching loan details:", err)
      if (err?.statusCode === 404) {
        setError("Loan not found or has been deleted")
        // Auto-redirect to collection list after 2 seconds
        setTimeout(() => router.push('/collection'), 2000)
      } else if (err?.statusCode === 403) {
        setError("You don't have permission to view this loan")
      } else {
        setError(err?.message || "Failed to load loan details")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLoanDetails()
  }, [loanId])

  const validateUtr = (value: string) => {
    if (!value.trim()) {
      setUtrError("UTR is required")
      return false
    }
    if (value.trim().length < 12) {
      setUtrError("UTR must be at least 12 characters")
      return false
    }
    if (loanDetails?.payments?.some(p => p.utr === value.trim().toUpperCase())) {
      setUtrError("This UTR has already been used")
      return false
    }
    setUtrError(null)
    return true
  }

  const validateAmount = (value: string) => {
    const num = parseFloat(value)
    if (!value || isNaN(num) || num <= 0) {
      setAmountError("Amount must be greater than 0")
      return false
    }
    const outstanding = loanDetails ? (loanDetails.totalRepayment - loanDetails.amountPaid) : 0
    if (loanDetails && num > outstanding) {
      setAmountError(`Amount cannot exceed outstanding amount of ${formatINR(outstanding)}`)
      return false
    }
    setAmountError(null)
    return true
  }

  const validateDate = (value: Date) => {
    const selectedDate = value
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (selectedDate > today) {
      setDateError("Date cannot be in the future")
      return false
    }
    setDateError(null)
    return true
  }

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault()

    const isUtrValid = validateUtr(utr)
    const isAmountValid = validateAmount(amount)
    const isDateValid = validateDate(date)

    if (!isUtrValid || !isAmountValid || !isDateValid) {
      return
    }

    setSubmitting(true)

    try {
      await collectionApi.recordPayment(loanId, {
        utr: utr.trim(),
        amount: parseFloat(amount),
        paymentDate: date.toISOString().split('T')[0],
      })
      setUtr("")
      setAmount("")
      setDate(new Date())
      fetchLoanDetails()
    } catch (err) {
      console.error("Error recording payment:", err)
      alert(err instanceof Error ? err.message : "Failed to record payment")
    } finally {
      setSubmitting(false)
    }
  }

  const outstandingAmount = loanDetails ? (loanDetails.totalRepayment - loanDetails.amountPaid) : 0
  const progressPercentage = loanDetails
    ? (loanDetails.amountPaid / loanDetails.totalRepayment) * 100
    : 0

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["Admin", "Collection"]}>
        <DashboardLayout title="Collection" currentPage="collection">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (!loanDetails) {
    return (
      <ProtectedRoute allowedRoles={["Admin", "Collection"]}>
        <DashboardLayout title="Collection" currentPage="collection">
          <Card>
            <CardContent className="py-12">
              {error ? (
                <div className="text-center space-y-4">
                  <p className="text-destructive font-medium">{error}</p>
                  <Button onClick={() => router.back()} variant="outline">
                    Go Back
                  </Button>
                </div>
              ) : (
                <p className="text-center text-muted-foreground">Loan not found</p>
              )}
            </CardContent>
          </Card>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["Admin", "Collection"]}>
      <DashboardLayout title="Collection" currentPage="collection">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Collection
      </Button>

      {/* Header Banner with Vector Image */}
      <div className="relative mb-6 rounded-2xl overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-primary/80 shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <Image
            src="/mohamed_hassan-money-5948190_1920.png"
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
              <h2 className="text-2xl font-bold text-primary-foreground mb-1">Loan Collection</h2>
              <p className="text-primary-foreground/80">Track payments and manage loan repayments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Loan Header */}
      <Card className="mb-6 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{loanDetails.personalDetails?.fullName || loanDetails.borrowerId?.fullName || 'Unknown'}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Loan ID: {loanDetails._id}</p>
            </div>
            {loanDetails.status === "Closed" && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Closed</span>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Money Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-md">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Total Repayment</p>
              <p className="text-2xl font-bold">{formatINR(loanDetails.totalRepayment)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Paid Amount</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatINR(loanDetails.amountPaid)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
              <p className="text-2xl font-bold text-destructive">{formatINR(outstandingAmount)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="mb-6 shadow-md">
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Repayment Progress</span>
              <span className="font-medium">{progressPercentage.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
                role="progressbar"
                aria-valuenow={progressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment History */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            {!loanDetails.payments || loanDetails.payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payments recorded yet
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>UTR</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loanDetails.payments?.map((payment) => (
                      <TableRow key={payment._id}>
                        <TableCell className="font-mono text-sm">{payment.utr}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {(() => {
                              const dateStr = payment.paymentDate
                              const date = new Date(dateStr)
                              const year = date.getUTCFullYear()
                              const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
                              const day = date.getUTCDate()
                              return `${month} ${day}, ${year}`
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatINR(payment.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Record Payment Form */}
        {loanDetails.status !== "Closed" && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Record Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitPayment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="utr" className="text-sm font-medium">UTR Number *</Label>
                  <Input
                    id="utr"
                    value={utr}
                    onChange={(e) => {
                      setUtr(e.target.value)
                      if (utrError) validateUtr(e.target.value)
                    }}
                    placeholder="Enter UTR number"
                    className={cn("h-11", utrError && "border-destructive")}
                  />
                  {utrError && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {utrError}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-medium">Amount (₹) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value)
                      if (amountError) validateAmount(e.target.value)
                    }}
                    placeholder="Enter amount"
                    min="0"
                    max={outstandingAmount}
                    step="0.01"
                    className={cn("h-11", amountError && "border-destructive")}
                  />
                  {amountError && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {amountError}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Max: {formatINR(outstandingAmount)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-medium">Payment Date *</Label>
                  <DatePicker
                    value={date}
                    onChange={(newDate) => {
                      setDate(newDate || new Date())
                      if (dateError && newDate) validateDate(newDate)
                    }}
                    placeholder="Select payment date"
                    className={cn(dateError && "border-destructive")}
                  />
                  {dateError && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {dateError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12"
                  disabled={submitting}
                >
                  {submitting ? "Recording..." : "Record Payment"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {loanDetails.status === "Closed" && (
          <Card className="shadow-lg">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Loan Fully Repaid</h3>
              <p className="text-muted-foreground">
                This loan has been closed. All payments have been received.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
