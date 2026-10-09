import { EmploymentMode } from '../models/LoanApplication';

export interface EligibilityInput {
  dateOfBirth: Date;
  monthlySalary: number;
  panNumber?: string;
  employmentMode: EmploymentMode;
}

export interface RejectionReason {
  field: string;
  message: string;
  currentValue: any;
  requirement: string;
}

export interface EligibilityResult {
  eligible: boolean;
  rejectionReasons: RejectionReason[];
}

const MIN_AGE = 23;
const MAX_AGE = 50;
const MIN_MONTHLY_SALARY = 25000;

/**
 * PAN Format Regex Explanation:
 * 
 * Indian PAN (Permanent Account Number) format: ABCDE1234F
 * 
 * Pattern breakdown:
 * - [A-Z]{5}       : First 5 characters are uppercase letters (can be any letter A-Z)
 * - [0-9]{4}       : Next 4 characters are digits (0-9)
 * - [A-Z]{1}       : Last character is an uppercase letter
 * 
 * Examples of valid PANs:
 * - ABCDE1234F
 * - BCDER5678K
 * - XYZAB9012M
 * 
 * Examples of invalid PANs:
 * - abcde1234f (lowercase)
 * - ABCD1234F (only 4 letters at start)
 * - ABCDE12345 (last character is digit)
 * - ABCDE123 (too short)
 * - ABCDE12345F (too long)
 * 
 * Note: This is a format validation only. It does not validate the
 * actual existence or correctness of the PAN with government records.
 */
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

/**
 * Calculate age from date of birth, considering whether birthday has occurred this year.
 */
export const calculateAge = (dateOfBirth: Date, referenceDate: Date = new Date()): number => {
  const birth = new Date(dateOfBirth);
  const today = new Date(referenceDate);

  let age = today.getFullYear() - birth.getFullYear();

  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

/**
 * Validate PAN number format.
 */
export const validatePANFormat = (panNumber: string): boolean => {
  if (!panNumber) {
    return false;
  }

  const trimmed = panNumber.trim().toUpperCase();
  return PAN_REGEX.test(trimmed);
};

/**
 * Check if employment mode is valid (not unemployed).
 */
export const isValidEmploymentMode = (employmentMode: EmploymentMode): boolean => {
  return employmentMode === EmploymentMode.Salaried ||
         employmentMode === EmploymentMode.SelfEmployed ||
         employmentMode === EmploymentMode.Business;
};

/**
 * Evaluate loan eligibility based on borrower's details.
 */
export const evaluateEligibility = (input: EligibilityInput): EligibilityResult => {
  const rejectionReasons: RejectionReason[] = [];

  const age = calculateAge(input.dateOfBirth);

  if (age < MIN_AGE) {
    rejectionReasons.push({
      field: 'age',
      message: 'Applicant is below minimum age requirement',
      currentValue: age,
      requirement: `Minimum age: ${MIN_AGE} years`,
    });
  }

  if (age > MAX_AGE) {
    rejectionReasons.push({
      field: 'age',
      message: 'Applicant is above maximum age requirement',
      currentValue: age,
      requirement: `Maximum age: ${MAX_AGE} years`,
    });
  }

  if (input.monthlySalary < MIN_MONTHLY_SALARY) {
    rejectionReasons.push({
      field: 'monthlySalary',
      message: 'Monthly salary is below minimum requirement',
      currentValue: input.monthlySalary,
      requirement: `Minimum monthly salary: ₹${MIN_MONTHLY_SALARY.toLocaleString()}`,
    });
  }

  if (input.panNumber && !validatePANFormat(input.panNumber)) {
    rejectionReasons.push({
      field: 'panNumber',
      message: 'PAN number format is invalid',
      currentValue: input.panNumber,
      requirement: 'Format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)',
    });
  }

  if (!isValidEmploymentMode(input.employmentMode)) {
    rejectionReasons.push({
      field: 'employmentMode',
      message: 'Employment mode is not acceptable',
      currentValue: input.employmentMode,
      requirement: 'Must be Salaried, SelfEmployed, or Business (Other/Unemployed not allowed)',
    });
  }

  return {
    eligible: rejectionReasons.length === 0,
    rejectionReasons,
  };
};
