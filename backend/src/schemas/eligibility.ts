import { z } from 'zod';
import { EmploymentMode } from '../models/LoanApplication';

export const eligibilityValidationSchema = z.object({
  dateOfBirth: z.coerce.date({
    required_error: 'Date of birth is required',
    invalid_type_error: 'Invalid date format',
  }),
  monthlySalary: z.number({
    required_error: 'Monthly salary is required',
  }).min(0, 'Monthly salary cannot be negative'),
  panNumber: z.string().optional(),
  employmentMode: z.nativeEnum(EmploymentMode, {
    required_error: 'Employment mode is required',
  }),
});

export type EligibilityValidationInput = z.infer<typeof eligibilityValidationSchema>;
