import { z } from 'zod';

export const approvedLoansQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),

  // Search
  search: z.string().optional(),

  // Filters
  status: z.enum(['Approved']).optional(),

  // Sorting
  sortBy: z.enum(['createdAt', 'requestedPrincipal', 'totalRepayment', 'approvedAt']).default('approvedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const disburseLoanSchema = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
});

export type ApprovedLoansQueryInput = z.infer<typeof approvedLoansQuerySchema>;
export type DisburseLoanInput = z.infer<typeof disburseLoanSchema>;
