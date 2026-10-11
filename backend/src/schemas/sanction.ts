import { z } from 'zod';

export const pendingApplicationsQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),

  // Search
  search: z.string().optional(),

  // Filters
  status: z.enum(['Pending', 'UnderReview', 'Approved']).optional(),
  mySanctions: z.coerce.boolean().optional(),

  // Sorting
  sortBy: z.enum(['createdAt', 'requestedPrincipal', 'totalRepayment']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const approveApplicationSchema = z.object({
  approvalReason: z.string().min(10, 'Approval reason must be at least 10 characters')
    .max(500, 'Approval reason cannot exceed 500 characters')
    .optional(),
});

export const rejectApplicationSchema = z.object({
  rejectionReason: z.string({
    required_error: 'Rejection reason is required',
  }).min(10, 'Rejection reason must be at least 10 characters')
   .max(500, 'Rejection reason cannot exceed 500 characters'),
});

export type PendingApplicationsQueryInput = z.infer<typeof pendingApplicationsQuerySchema>;
export type ApproveApplicationInput = z.infer<typeof approveApplicationSchema>;
export type RejectApplicationInput = z.infer<typeof rejectApplicationSchema>;
