"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LoanApplicationForm } from "@/components/loan-application-form"
import { DatePicker } from "@/components/ui/date-picker"
import { getUserData, isAuthenticated } from "@/lib/auth"
import { loanApi } from "@/lib/api"
import { useRouter } from "next/navigation"
import { ChevronRight, Clock, CheckCircle, XCircle, AlertCircle, FileText, Calendar, IndianRupee, User, Edit } from "lucide-react"
import Link from "next/link"

type LoanStatus = "Pending" | "UnderReview" | "Approved" | "Sanctioned" | "Disbursed" | "Rejected" | "Collecting" | "Completed"

interface LoanApplication {
  _id: string
  borrowerId: any
  personalDetails: {
    fullName: string
    dateOfBirth: string
    phoneNumber: string
    address: string
    city: string
    state: string
    pinCode: string
  }
  employmentMode: string
  monthlySalary: number
  requestedPrincipal: number
  tenureDays: number
  annualInterestRate: number
  calculatedInterest: number
  totalRepayment: number
  status: LoanStatus
  createdAt: string
  updatedAt: string
  documentId?: string
}

const statusConfig: Record<LoanStatus, { icon: any; color: string; bgColor: string; label: string }> = {
  "Pending": { icon: Clock, color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-900/30", label: "Pending" },
  "Under Review": { icon: AlertCircle, color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30", label: "Under Review" },
  "Approved": { icon: CheckCircle, color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30", label: "Approved" },
  "Sanctioned": { icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-900/30", label: "Sanctioned" },
  "Disbursed": { icon: CheckCircle, color: "text-teal-600 dark:text-teal-400", bgColor: "bg-teal-100 dark:bg-teal-900/30", label: "Disbursed" },
  "Rejected": { icon: XCircle, color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30", label: "Rejected" },
  "Collecting": { icon: Clock, color: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-900/30", label: "Collecting" },
  "Completed": { icon: CheckCircle, color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30", label: "Completed" },
}

export default function MyLoansPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const userData = getUserData()
  const [loans, setLoans] = useState<LoanApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isApplyFormOpen, setIsApplyFormOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [profileData, setProfileData] = useState({
    fullName: userData?.fullName || "",
    phoneNumber: "",
    address: "",
    city: "",
    state: "",
    pinCode: "",
    dateOfBirth: undefined as Date | undefined,
  })
  const hasFetched = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchUserLoans = useCallback(async () => {
    try {
      const response = await loanApi.getApplications()
      setLoans(response.applications || [])
    } catch (error) {
      console.error("Error fetching loans:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    // Redirect to login if not authenticated
    if (!isAuthenticated()) {
      router.push("/login")
      return
    }

    if (!userData) {
      router.push("/login")
      return
    }

    // Fetch user's loan applications only once
    if (!hasFetched.current) {
      fetchUserLoans()
      hasFetched.current = true
    }
  }, [userData, fetchUserLoans, mounted])

  const handleApplicationSuccess = () => {
    setIsApplyFormOpen(false)
    hasFetched.current = false // Allow refetch
    fetchUserLoans() // Refresh the loan list
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const formatStatus = (status: string) => {
    const statusMap: Record<string, LoanStatus> = {
      "Pending": "Pending",
      "UnderReview": "Under Review",
      "Approved": "Approved",
      "Sanctioned": "Sanctioned",
      "Disbursed": "Disbursed",
      "Rejected": "Rejected",
    }
    return statusMap[status] || status
  }

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (!mounted || !userData) {
    return null
  }

  return (
    <DashboardLayout title="My Loans" currentPage="my-loans" userRole="Borrower">
      <div className="space-y-6">
        {/* Header with CTA */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-2xl font-bold mb-1">Your Loan Applications</h2>
              <p className="text-muted-foreground">Track and manage your loan applications</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsProfileOpen(true)} className="hidden sm:flex">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setIsProfileOpen(true)} className="sm:hidden flex-1 gap-2">
              <User className="h-4 w-4" />
              Edit Profile
            </Button>
            <Button onClick={() => setIsApplyFormOpen(true)} className="w-full sm:w-auto gap-2">
              <FileText className="h-4 w-4" />
              Apply for New Loan
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loans.length}</p>
                  <p className="text-sm text-muted-foreground">Total Applications</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loans.filter(l => ["Pending", "UnderReview"].includes(l.status)).length}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{loans.filter(l => ["Approved", "Sanctioned", "Disbursed"].includes(l.status)).length}</p>
                  <p className="text-sm text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                  <IndianRupee className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatINR(loans.filter(l => l.status === "Disbursed").reduce((sum, l) => sum + l.requestedPrincipal, 0))}</p>
                  <p className="text-sm text-muted-foreground">Disbursed Amount</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loans List */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading your loans...</p>
            </CardContent>
          </Card>
        ) : loans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Loan Applications Yet</h3>
              <p className="text-muted-foreground mb-6">You haven't applied for any loans yet. Start your first application today!</p>
              <Button onClick={() => setIsApplyFormOpen(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Apply for Your First Loan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {loans.map((loan) => {
              const status = formatStatus(loan.status)
              const StatusIcon = statusConfig[status]?.icon || Clock
              return (
                <Card key={loan._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Loan Info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <Badge className={`${statusConfig[status]?.bgColor || 'bg-gray-100'} ${statusConfig[status]?.color || 'text-gray-600'} border-0`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[status]?.label || status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Loan Amount</p>
                            <p className="text-lg font-semibold">{formatINR(loan.requestedPrincipal)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Tenure</p>
                            <p className="text-lg font-semibold">{loan.tenureDays} days</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Interest Rate</p>
                            <p className="text-lg font-semibold">{loan.annualInterestRate}% p.a.</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Applied On</p>
                            <p className="text-lg font-semibold">{formatDate(loan.createdAt)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Right: Action Button */}
                      <div className="flex lg:flex-col gap-2 lg:w-32">
                        <Button variant="outline" className="w-full justify-between lg:justify-center">
                          View Details
                          <ChevronRight className="h-4 w-4 lg:hidden" />
                        </Button>
                        {loan.status === "Disbursed" && (
                          <Button className="w-full">
                            Pay EMI
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <input
                type="text"
                value={profileData.fullName}
                onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <input
                type="tel"
                value={profileData.phoneNumber}
                onChange={(e) => setProfileData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="9876543210"
                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date of Birth</label>
              <DatePicker
                value={profileData.dateOfBirth}
                onChange={(date) => setProfileData(prev => ({ ...prev, dateOfBirth: date }))}
                placeholder="Select date of birth"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <input
                type="text"
                value={profileData.address}
                onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="123 Main Street"
                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">City</label>
                <input
                  type="text"
                  value={profileData.city}
                  onChange={(e) => setProfileData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Mumbai"
                  className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">State</label>
                <input
                  type="text"
                  value={profileData.state}
                  onChange={(e) => setProfileData(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="Maharashtra"
                  className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Pin Code</label>
              <input
                type="text"
                value={profileData.pinCode}
                onChange={(e) => setProfileData(prev => ({ ...prev, pinCode: e.target.value }))}
                placeholder="400001"
                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsProfileOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={() => {
              setIsProfileOpen(false)
            }} className="flex-1">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loan Application Sheet */}
      <Sheet open={isApplyFormOpen} onOpenChange={setIsApplyFormOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Apply for New Loan</SheetTitle>
          </SheetHeader>
          <LoanApplicationForm
            onSuccess={handleApplicationSuccess}
            onCancel={() => setIsApplyFormOpen(false)}
            existingPersonalDetails={profileData}
          />
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  )
}
