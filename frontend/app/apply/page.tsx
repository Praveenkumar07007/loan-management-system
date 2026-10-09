"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getToken } from "@/lib/auth"
import { useRouter } from "next/navigation"

const personalDetailsSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100, "Full name cannot exceed 100 characters"),
  dateOfBirth: z.string().refine((val) => {
    const date = new Date(val)
    const today = new Date()
    const minAge = 18
    const maxAge = 70
    const age = today.getFullYear() - date.getFullYear()
    return age >= minAge && age <= maxAge
  }, "Borrower must be between 18 and 70 years old"),
  phoneNumber: z.string().regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),
  address: z.string().min(10, "Address must be at least 10 characters"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pinCode: z.string().regex(/^[0-9]{6}$/, "Pin code must be 6 digits"),
})

type PersonalDetailsFormValues = z.infer<typeof personalDetailsSchema>

type ApplicationFormData = {
  personalDetails: PersonalDetailsFormValues
  employmentMode?: string
  monthlySalary?: number
  documentId?: string
  requestedPrincipal?: number
  tenureDays?: number
  annualInterestRate?: number
}

export default function ApplyPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [formData, setFormData] = useState<ApplicationFormData>({
    personalDetails: {
      fullName: "",
      dateOfBirth: "",
      phoneNumber: "",
      address: "",
      city: "",
      state: "",
      pinCode: "",
    },
  })
  const router = useRouter()

  const form = useForm<PersonalDetailsFormValues>({
    resolver: zodResolver(personalDetailsSchema),
    defaultValues: formData.personalDetails,
  })

  const onSubmit = async (data: PersonalDetailsFormValues) => {
    setIsLoading(true)
    setServerError(null)

    try {
      // Check if user is authenticated
      const token = getToken()
      if (!token) {
        router.push('/login')
        return
      }

      // Store personal details and move to next step
      setFormData((prev) => ({
        ...prev,
        personalDetails: data,
      }))
      setCurrentStep(2)
    } catch (error) {
      console.error("Error saving personal details:", error)
      setServerError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Loan Application</CardTitle>
          <CardDescription>
            Step {currentStep} of 5: {currentStep === 1 ? 'Personal Details' : currentStep === 2 ? 'Employment Details' : currentStep === 3 ? 'Salary Slip Upload' : currentStep === 4 ? 'Loan Amount & Tenure' : 'Review & Submit'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {serverError && (
                <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm">
                  {serverError}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    {...form.register("fullName")}
                  />
                  {form.formState.errors.fullName && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.fullName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    {...form.register("dateOfBirth")}
                  />
                  {form.formState.errors.dateOfBirth && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.dateOfBirth.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="1234567890"
                    {...form.register("phoneNumber")}
                  />
                  {form.formState.errors.phoneNumber && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.phoneNumber.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main Street"
                    {...form.register("address")}
                  />
                  {form.formState.errors.address && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.address.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Mumbai"
                      {...form.register("city")}
                    />
                    {form.formState.errors.city && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.city.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      placeholder="Maharashtra"
                      {...form.register("state")}
                    />
                    {form.formState.errors.state && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.state.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pinCode">Pin Code</Label>
                  <Input
                    id="pinCode"
                    type="text"
                    placeholder="400001"
                    {...form.register("pinCode")}
                  />
                  {form.formState.errors.pinCode && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.pinCode.message}
                    </p>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Saving..." : "Continue"}
              </Button>
            </form>
          )}

          {currentStep !== 1 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Step {currentStep} implementation coming next...</p>
              <Button onClick={() => setCurrentStep(1)} variant="outline">
                Back to Step 1
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
