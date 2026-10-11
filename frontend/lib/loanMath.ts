/**
 * Calculate simple interest
 * Formula: SI = (P × R × T) / (365 × 100)
 * @param principal - Principal amount
 * @param tenureDays - Tenure in days
 * @param rate - Annual interest rate (default 12%)
 * @returns Interest amount rounded to 2 decimal places
 */
export function calcSimpleInterest(
  principal: number,
  tenureDays: number,
  rate: number = 12
): number {
  const interest = (principal * rate * tenureDays) / (365 * 100)
  return Math.round(interest * 100) / 100
}

/**
 * Calculate total repayment amount
 * @param principal - Principal amount
 * @param tenureDays - Tenure in days
 * @param rate - Annual interest rate (default 12%)
 * @returns Total repayment rounded to 2 decimal places
 */
export function calcTotalRepayment(
  principal: number,
  tenureDays: number,
  rate: number = 12
): number {
  const interest = calcSimpleInterest(principal, tenureDays, rate)
  const total = principal + interest
  return Math.round(total * 100) / 100
}

/**
 * Format amount in Indian Rupees
 * @param amount - Amount to format
 * @returns Formatted string (e.g., "₹1,23,456.78")
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
