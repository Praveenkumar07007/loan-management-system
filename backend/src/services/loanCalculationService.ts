import { ValidationError } from '../errors/AppError';

export interface LoanCalculationInput {
  principal: number;
  tenureDays: number;
  annualInterestRate?: number; // Optional, defaults to 12%
}

export interface LoanCalculationResult {
  principal: number;
  tenureDays: number;
  annualInterestRate: number;
  calculatedInterest: number;
  totalRepayment: number;
  monthlyInstallment?: number;
}

export interface LoanValidationResult {
  valid: boolean;
  errors: {
    field: string;
    message: string;
    currentValue: any;
    requirement: string;
  }[];
}

// Constants
const MIN_PRINCIPAL = 50000;
const MAX_PRINCIPAL = 500000;
const MIN_TENURE_DAYS = 30;
const MAX_TENURE_DAYS = 365;
const DEFAULT_ANNUAL_INTEREST_RATE = 12; // 12%

/**
 * Simple interest formula: interest = principal × rate × time / 100
 * Where time is in years (tenureDays / 365)
 */
export const calculateSimpleInterest = (
  principal: number,
  annualInterestRate: number,
  tenureDays: number
): number => {
  const timeInYears = tenureDays / 365;
  const interest = (principal * annualInterestRate * timeInYears) / 100;
  return interest;
};

/**
 * Safe monetary rounding to 2 decimal places (rupees and paise)
 * Uses banker's rounding (round half to even) for financial accuracy
 */
export const roundToRupees = (amount: number): number => {
  return Math.round(amount * 100) / 100;
};

/**
 * Validate loan calculation input parameters
 */
export const validateLoanInput = (input: LoanCalculationInput): LoanValidationResult => {
  const errors: LoanValidationResult['errors'] = [];

  // Validate principal
  if (input.principal < MIN_PRINCIPAL) {
    errors.push({
      field: 'principal',
      message: 'Principal amount is below minimum requirement',
      currentValue: input.principal,
      requirement: `Minimum principal: ₹${MIN_PRINCIPAL.toLocaleString()}`,
    });
  }

  if (input.principal > MAX_PRINCIPAL) {
    errors.push({
      field: 'principal',
      message: 'Principal amount exceeds maximum limit',
      currentValue: input.principal,
      requirement: `Maximum principal: ₹${MAX_PRINCIPAL.toLocaleString()}`,
    });
  }

  // Validate tenure
  if (input.tenureDays < MIN_TENURE_DAYS) {
    errors.push({
      field: 'tenureDays',
      message: 'Tenure is below minimum requirement',
      currentValue: input.tenureDays,
      requirement: `Minimum tenure: ${MIN_TENURE_DAYS} days`,
    });
  }

  if (input.tenureDays > MAX_TENURE_DAYS) {
    errors.push({
      field: 'tenureDays',
      message: 'Tenure exceeds maximum limit',
      currentValue: input.tenureDays,
      requirement: `Maximum tenure: ${MAX_TENURE_DAYS} days`,
    });
  }

  // Validate annual interest rate if provided
  if (input.annualInterestRate !== undefined) {
    if (input.annualInterestRate < 0) {
      errors.push({
        field: 'annualInterestRate',
        message: 'Annual interest rate cannot be negative',
        currentValue: input.annualInterestRate,
        requirement: 'Annual interest rate must be non-negative',
      });
    }

    if (input.annualInterestRate > 30) {
      errors.push({
        field: 'annualInterestRate',
        message: 'Annual interest rate exceeds maximum limit',
        currentValue: input.annualInterestRate,
        requirement: 'Maximum annual interest rate: 30%',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Calculate loan details with validation
 * Uses simple interest formula: interest = principal × rate × time / 100
 * totalRepayment = principal + interest
 */
export const calculateLoan = (input: LoanCalculationInput): LoanCalculationResult => {
  // Validate input
  const validation = validateLoanInput(input);
  if (!validation.valid) {
    throw new ValidationError(
      'Loan calculation input validation failed',
      validation.errors
    );
  }

  const annualInterestRate = input.annualInterestRate ?? DEFAULT_ANNUAL_INTEREST_RATE;

  // Calculate interest using simple interest formula
  const calculatedInterest = calculateSimpleInterest(
    input.principal,
    annualInterestRate,
    input.tenureDays
  );

  // Round to 2 decimal places for monetary accuracy
  const roundedInterest = roundToRupees(calculatedInterest);
  const totalRepayment = roundToRupees(input.principal + roundedInterest);

  // Calculate monthly installment (approximate)
  const monthlyInstallment = roundToRupees(totalRepayment / (input.tenureDays / 30));

  return {
    principal: input.principal,
    tenureDays: input.tenureDays,
    annualInterestRate,
    calculatedInterest: roundedInterest,
    totalRepayment,
    monthlyInstallment,
  };
};

/**
 * Validate loan amount against eligibility (optional feature)
 * This can be used to ensure the requested loan amount is appropriate
 * based on the borrower's eligibility status
 */
export const validateLoanAgainstEligibility = (
  requestedPrincipal: number,
  eligible: boolean
): void => {
  if (!eligible) {
    throw new ValidationError(
      'Loan application cannot be submitted: borrower is not eligible',
      [{ field: 'eligibility', message: 'Borrower is not eligible for loan' }]
    );
  }
};
