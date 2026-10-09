import { z } from 'zod';

export const borrowerListQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),

  // Search
  search: z.string().optional(),

  // Filters
  role: z.enum(['Borrower']).optional(), // Only borrowers
  registeredAfter: z.coerce.date().optional(),
  registeredBefore: z.coerce.date().optional(),

  // Sorting
  sortBy: z.enum(['fullName', 'email', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type BorrowerListQueryInput = z.infer<typeof borrowerListQuerySchema>;
