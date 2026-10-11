import { z } from 'zod';

export const activeLoansQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),

  // Search
  search: z.string().optional(),

  // Filters
  status: z.enum(['Disbursed', 'Active']).optional(),

  // Sorting
  sortBy: z.enum(['createdAt', 'requestedPrincipal', 'totalRepayment', 'disbursedAt', 'amountPaid']).default('disbursedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const recordPaymentSchema = z.object({
  utr: z.string({
    required_error: 'UTR is required',
  }).min(12, 'UTR must be at least 12 characters')
   .max(50, 'UTR cannot exceed 50 characters')
   .regex(/^[A-Z0-9]+$/i, 'UTR must contain only alphanumeric characters'),

  amount: z.number({
    required_error: 'Payment amount is required',
  }).positive('Payment amount must be positive')
   .min(0.01, 'Payment amount must be at least 0.01'),

  paymentDate: z.coerce.date({
    required_error: 'Payment date is required',
    invalid_type_error: 'Invalid date format',
  }).refine((date) => date <= new Date(), {
    message: 'Payment date cannot be in the future',
  }),
});

export type ActiveLoansQueryInput = z.infer<typeof activeLoansQuerySchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
