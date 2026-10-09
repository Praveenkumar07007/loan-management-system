import { z } from 'zod';

export const loanApplicationSubmissionSchema = z.object({
  requestedPrincipal: z.number({
    required_error: 'Requested principal is required',
  }).min(0, 'Requested principal cannot be negative'),

  tenureDays: z.number({
    required_error: 'Tenure days is required',
  }).int('Tenure days must be an integer')
   .min(1, 'Tenure days must be at least 1'),

  annualInterestRate: z.number({
    required_error: 'Annual interest rate is required',
  }).min(0, 'Annual interest rate cannot be negative')
   .max(30, 'Annual interest rate cannot exceed 30%'),

  // Personal details
  personalDetails: z.object({
    fullName: z.string({
      required_error: 'Full name is required',
    }).min(2, 'Full name must be at least 2 characters')
     .max(100, 'Full name cannot exceed 100 characters'),

    dateOfBirth: z.coerce.date({
      required_error: 'Date of birth is required',
      invalid_type_error: 'Invalid date format',
    }),

    phoneNumber: z.string({
      required_error: 'Phone number is required',
    }).regex(/^[0-9]{10}$/, 'Phone number must be 10 digits'),

    address: z.string({
      required_error: 'Address is required',
    }).min(10, 'Address must be at least 10 characters'),

    city: z.string({
      required_error: 'City is required',
    }).trim(),

    state: z.string({
      required_error: 'State is required',
    }).trim(),

    pinCode: z.string({
      required_error: 'Pin code is required',
    }).regex(/^[0-9]{6}$/, 'Pin code must be 6 digits'),
  }),

  // Employment details
  employmentMode: z.enum(['Salaried', 'SelfEmployed', 'Business', 'Other'], {
    required_error: 'Employment mode is required',
  }),

  monthlySalary: z.number({
    required_error: 'Monthly salary is required',
  }).min(0, 'Monthly salary cannot be negative'),

  // Document reference (optional, for pre-uploaded documents)
  documentId: z.string().optional(),
});

// Note: calculatedInterest and totalRepayment are NOT in the schema
// These will be calculated on the server-side and should never be trusted from client

export type LoanApplicationSubmissionInput = z.infer<typeof loanApplicationSubmissionSchema>;
