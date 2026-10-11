"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { FileUpload } from "@/components/file-upload"
import { DatePicker } from "@/components/ui/date-picker"
import { documentApi, loanApi } from "@/lib/api"
import { getUserData } from "@/lib/auth"
import { Check, X, Upload, ChevronLeft, ChevronRight, Percent, AlertCircle } from "lucide-react"
import { calcSimpleInterest, calcTotalRepayment, formatINR } from "@/lib/loanMath"

const eligibilitySchema = z.object({
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format"),
  dateOfBirth: z.date().refine((val) => {
    const today = new Date()
    const minAge = 23
    const maxAge = 50
    const age = today.getFullYear() - val.getFullYear()
    return age >= minAge && age <= maxAge
  }, "Age must be between 23 and 50"),
  monthlySalary: z.number().min(25000, "Salary must be at least ₹25,000"),
  employmentMode: z.enum(['Salaried', 'SelfEmployed', 'Business'], {
    required_error: 'Employment mode is required',
  }),
})

type EligibilityFormValues = z.infer<typeof eligibilitySchema>

type ApplicationFormData = {
  personalDetails?: {
    fullName: string
    dateOfBirth: string
    phoneNumber: string
    address: string
    city: string
    state: string
    pinCode: string
  }
  eligibilityData?: EligibilityFormValues
  documentId?: string
  requestedPrincipal?: number
  tenureDays?: number
  annualInterestRate?: number
  eligibilityResult?: {
    eligible: boolean
    rejectionReasons?: string[]
  }
  salarySlipFile?: File
}

interface EligibilityRule {
  id: string
  label: string
  passed: boolean
  description?: string
}

interface LoanApplicationFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  existingPersonalDetails?: ApplicationFormData['personalDetails']
}

export function LoanApplicationForm({ onSuccess, onCancel, existingPersonalDetails }: LoanApplicationFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
  const [formData, setFormData] = useState<ApplicationFormData>({
    personalDetails: existingPersonalDetails || {
      fullName: "",
      dateOfBirth: "",
      phoneNumber: "",
      address: "",
      city: "",
      state: "",
      pinCode: "",
    },
  })
  const [eligibilityRules, setEligibilityRules] = useState<EligibilityRule[]>([
    { id: "age", label: "Age 23 to 50", passed: true },
    { id: "salary", label: "Salary at least ₹25,000", passed: true },
    { id: "pan", label: "Valid PAN format", passed: true },
    { id: "employment", label: "Not unemployed", passed: true },
  ])

  const userData = getUserData()

  // Load form data from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    const savedData = localStorage.getItem('loanApplicationFormData')
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        // Convert date strings back to Date objects
        if (parsed.eligibilityData?.dateOfBirth) {
          parsed.eligibilityData.dateOfBirth = new Date(parsed.eligibilityData.dateOfBirth)
        }
        setFormData(parsed)
        // Restore step if saved
        if (parsed.eligibilityData && parsed.documentId && parsed.personalDetails?.phoneNumber) {
          setCurrentStep(4)
        } else if (parsed.eligibilityData && parsed.documentId) {
          setCurrentStep(3)
        } else if (parsed.eligibilityData) {
          setCurrentStep(2)
        } else if (parsed.personalDetails) {
          setCurrentStep(1)
        }
      } catch (error) {
        console.error('Error loading saved form data:', error)
      }
    }
  }, [])

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('loanApplicationFormData', JSON.stringify(formData))
    }
  }, [formData])

  // Clear localStorage on successful submission or cancel
  const clearSavedData = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('loanApplicationFormData')
    }
  }

  const handleCancel = () => {
    clearSavedData()
    onCancel?.()
  }

  const eligibilityForm = useForm<EligibilityFormValues>({
    resolver: zodResolver(eligibilitySchema),
    defaultValues: {
      panNumber: "",
      dateOfBirth: undefined,
      monthlySalary: 0,
      employmentMode: "Salaried",
    },
  })

  // Sync eligibilityForm with formData when formData changes
  useEffect(() => {
    if (formData.eligibilityData) {
      eligibilityForm.reset({
        panNumber: formData.eligibilityData.panNumber,
        dateOfBirth: formData.eligibilityData.dateOfBirth,
        monthlySalary: formData.eligibilityData.monthlySalary,
        employmentMode: formData.eligibilityData.employmentMode,
      })
    }
  }, [formData.eligibilityData, eligibilityForm])

  const checkEligibility = (data: EligibilityFormValues) => {
    const dateOfBirth = data.dateOfBirth
    const today = new Date()
    const age = today.getFullYear() - dateOfBirth.getFullYear()

    const rules: EligibilityRule[] = [
      {
        id: "age",
        label: "Age 23 to 50",
        passed: age >= 23 && age <= 50,
        description: age < 23 ? `Age ${age} is below minimum of 23` : age > 50 ? `Age ${age} is above maximum of 50` : undefined,
      },
      {
        id: "salary",
        label: "Salary at least ₹25,000",
        passed: data.monthlySalary >= 25000,
        description: data.monthlySalary < 25000 ? `Salary ₹${data.monthlySalary.toLocaleString()} is below minimum` : undefined,
      },
      {
        id: "pan",
        label: "Valid PAN format",
        passed: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.panNumber),
        description: !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.panNumber) ? "PAN must look like ABCDE1234F" : undefined,
      },
      {
        id: "employment",
        label: "Not unemployed",
        passed: data.employmentMode !== "Unemployed",
      },
    ]

    setEligibilityRules(rules)
    const eligible = rules.every(rule => rule.passed)

    setFormData((prev) => ({
      ...prev,
      eligibilityData: data,
      eligibilityResult: {
        eligible,
        rejectionReasons: rules.filter(r => !r.passed).map(r => r.description || r.label),
      },
    }))

    return eligible
  }

  const onSubmitEligibility = async (data: EligibilityFormValues) => {
    setIsLoading(true)
    setServerError(null)

    try {
      const eligible = checkEligibility(data)

      if (!eligible) {
        setIsLoading(false)
        return
      }

      // Update personal details with DOB from eligibility check
      setFormData((prev) => ({
        ...prev,
        personalDetails: {
          ...prev.personalDetails,
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.toISOString() : "",
        },
        eligibilityData: data,
      }))

      setCurrentStep(3)
    } catch (error) {
      console.error("Error checking eligibility:", error)
      setServerError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4)
    }
  }

  const handleSalarySlipUpload = async (file: File) => {
    setIsLoading(true)
    setServerError(null)

    try {
      const result = await documentApi.uploadSalarySlip(file)
      setFormData((prev) => ({
        ...prev,
        documentId: result.documentId,
        salarySlipFile: file,
      }))
      // Don't auto-advance, let user click continue
    } catch (error) {
      console.error("Error uploading salary slip:", error)
      setServerError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSalarySlipRemove = () => {
    setFormData((prev) => ({
      ...prev,
      documentId: undefined,
      salarySlipFile: undefined,
    }))
  }

  const handleSubmitApplication = async () => {
    setIsLoading(true)
    setServerError(null)

    try {
      // Use existing personal details if available, otherwise use defaults
      const personalDetails = formData.personalDetails || {
        fullName: userData?.fullName || "",
        dateOfBirth: "",
        phoneNumber: "",
        address: "",
        city: "",
        state: "",
        pinCode: "",
      }

      await loanApi.submitApplication({
        personalDetails: {
          ...personalDetails,
          dateOfBirth: new Date(personalDetails.dateOfBirth),
        },
        employmentMode: formData.eligibilityData?.employmentMode || 'Salaried',
        monthlySalary: formData.eligibilityData?.monthlySalary || 0,
        documentId: formData.documentId,
        requestedPrincipal: formData.requestedPrincipal || 100000,
        tenureDays: formData.tenureDays || 180,
        annualInterestRate: 12,
      })
      clearSavedData()
      onSuccess?.()
    } catch (error) {
      console.error("Error submitting application:", error)
      setServerError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const failedRules = eligibilityRules.filter(r => !r.passed)

  const steps = [
    { id: 1, label: "Personal Details" },
    { id: 2, label: "Eligibility Check" },
    { id: 3, label: "Salary Slip" },
    { id: 4, label: "Loan Config" },
  ]

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-6">
        {steps.map((step, index) => {
          const status = step.id < currentStep ? "done" : step.id === currentStep ? "active" : "upcoming"
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                    status === "done"
                      ? "bg-primary text-primary-foreground"
                      : status === "active"
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {status === "done" ? "✓" : step.id}
                </div>
                <span
                  className={`text-xs font-medium ${
                    status === "active" ? "text-foreground" : status === "done" ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="mx-2 h-px flex-1 bg-border" />
              )}
            </div>
          )
        })}
      </div>

      {/* Alert Banner */}
      {currentStep === 1 && failedRules.length > 0 && (
        <div className="bg-destructive/10 border-b border-destructive/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">
                Application blocked. {failedRules.length} of 4 eligibility checks failed.
              </p>
              <ul className="mt-2 text-sm text-destructive/80 list-disc list-inside space-y-1">
                {failedRules.map(rule => (
                  <li key={rule.id}>{rule.description || rule.label}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Personal Details */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
            <CardDescription>Step 1 of 4</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.personalDetails?.fullName || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    personalDetails: { ...prev.personalDetails!, fullName: e.target.value }
                  }))}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.personalDetails?.phoneNumber || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    personalDetails: { ...prev.personalDetails!, phoneNumber: e.target.value }
                  }))}
                  placeholder="9876543210"
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">Must be 10 digits</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.personalDetails?.address || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    personalDetails: { ...prev.personalDetails!, address: e.target.value }
                  }))}
                  placeholder="Enter your full address"
                />
                <p className="text-xs text-muted-foreground">Minimum 10 characters</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.personalDetails?.city || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      personalDetails: { ...prev.personalDetails!, city: e.target.value }
                    }))}
                    placeholder="Mumbai"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.personalDetails?.state || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      personalDetails: { ...prev.personalDetails!, state: e.target.value }
                    }))}
                    placeholder="Maharashtra"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pinCode">Pin Code</Label>
                <Input
                  id="pinCode"
                  value={formData.personalDetails?.pinCode || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    personalDetails: { ...prev.personalDetails!, pinCode: e.target.value }
                  }))}
                  placeholder="400001"
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground">Must be 6 digits</p>
              </div>
              <Button onClick={() => {
                // Validate personal details before proceeding
                if (!formData.personalDetails?.fullName || !formData.personalDetails?.phoneNumber) {
                  setServerError("Please fill in all required fields")
                  return
                }
                setCurrentStep(2)
              }} className="w-full">
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Eligibility Check */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Eligibility Check</CardTitle>
            <CardDescription>Step 2 of 4</CardDescription>
          </CardHeader>
          <CardContent>
            <form key="eligibility-form" onSubmit={eligibilityForm.handleSubmit(onSubmitEligibility)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="panNumber">PAN Number</Label>
                <Input
                  id="panNumber"
                  placeholder="ABCDE1234F"
                  {...eligibilityForm.register("panNumber")}
                />
                {eligibilityForm.formState.errors.panNumber && (
                  <p className="text-sm text-destructive">{eligibilityForm.formState.errors.panNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="eligibility-dateOfBirth">Date of Birth</Label>
                <DatePicker
                  value={eligibilityForm.watch("dateOfBirth")}
                  onChange={(date) => eligibilityForm.setValue("dateOfBirth", date)}
                  placeholder="Select date of birth"
                />
                {eligibilityForm.formState.errors.dateOfBirth && (
                  <p className="text-sm text-destructive">{eligibilityForm.formState.errors.dateOfBirth.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlySalary">Monthly Salary</Label>
                <Input
                  id="monthlySalary"
                  type="number"
                  placeholder="25000"
                  {...eligibilityForm.register("monthlySalary", { valueAsNumber: true })}
                />
                {eligibilityForm.formState.errors.monthlySalary && (
                  <p className="text-sm text-destructive">{eligibilityForm.formState.errors.monthlySalary.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employmentMode">Employment Mode</Label>
                <select
                  id="employmentMode"
                  {...eligibilityForm.register("employmentMode")}
                  className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background"
                >
                  <option value="Salaried">Salaried</option>
                  <option value="SelfEmployed">Self Employed</option>
                  <option value="Business">Business</option>
                </select>
                {eligibilityForm.formState.errors.employmentMode && (
                  <p className="text-sm text-destructive">{eligibilityForm.formState.errors.employmentMode.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Checking..." : "Check Eligibility"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Salary Slip Upload */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Salary Slip</CardTitle>
            <CardDescription>Step 3 of 4</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <FileUpload
                onFileSelect={handleSalarySlipUpload}
                onFileRemove={handleSalarySlipRemove}
                selectedFile={formData.salarySlipFile}
                uploadSuccess={!!formData.documentId}
                acceptedFileTypes=".pdf,.jpg,.jpeg,.png"
                maxSize={5 * 1024 * 1024}
              />
              {formData.documentId && (
                <Button onClick={() => setCurrentStep(4)} className="w-full">
                  Continue
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={handleBack} className="flex-1">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Loan Configuration */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configure Your Loan</CardTitle>
              <CardDescription>Step 4 of 4</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Loan amount</Label>
                  <span className="font-semibold text-lg">{formatINR(formData.requestedPrincipal || 100000)}</span>
                </div>
                <Slider
                  value={[formData.requestedPrincipal || 100000]}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, requestedPrincipal: value[0] }))}
                  min={50000}
                  max={500000}
                  step={5000}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>₹50,000</span>
                  <span>₹5,00,000</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Tenure</Label>
                  <span className="font-semibold text-lg">{formData.tenureDays || 180} days</span>
                </div>
                <Slider
                  value={[formData.tenureDays || 180]}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, tenureDays: value[0] }))}
                  min={30}
                  max={365}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>30 days</span>
                  <span>365 days</span>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Interest rate: <span className="font-semibold">12% p.a. fixed</span></span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle>Repayment summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-primary-foreground/80">Principal</span>
                  <span className="font-medium">{formatINR(formData.requestedPrincipal || 100000)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-primary-foreground/80">Interest ({formData.tenureDays || 180} days)</span>
                  <span className="font-medium">
                    {formatINR(calcSimpleInterest(formData.requestedPrincipal || 100000, formData.tenureDays || 180, 12))}
                  </span>
                </div>

                <div className="border-t border-primary-foreground/30 pt-3 flex justify-between">
                  <span className="font-semibold">Total repayment</span>
                  <span className="font-semibold text-lg">
                    {formatINR(calcTotalRepayment(formData.requestedPrincipal || 100000, formData.tenureDays || 180, 12))}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={handleBack} className="flex-1 bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button onClick={handleSubmitApplication} disabled={isLoading} className="flex-1 bg-accent-foreground text-accent hover:bg-accent-foreground/90">
                  {isLoading ? "Submitting..." : "Apply for this loan"}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {serverError && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          {serverError}
        </div>
      )}
    </div>
  )
}
