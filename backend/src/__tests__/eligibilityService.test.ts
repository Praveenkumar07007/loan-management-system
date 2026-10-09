import { calculateAge, validatePANFormat, evaluateEligibility } from '../services/eligibilityService';
import { EmploymentMode } from '../models/LoanApplication';

describe('Eligibility Service', () => {
  describe('calculateAge', () => {
    it('should calculate age correctly when birthday has passed this year', () => {
      const today = new Date('2024-06-15');
      const dateOfBirth = new Date('1990-01-01');
      const age = calculateAge(dateOfBirth, today);
      expect(age).toBe(34);
    });

    it('should calculate age correctly when birthday has not passed this year', () => {
      const today = new Date('2024-06-15');
      const dateOfBirth = new Date('1990-12-01');
      const age = calculateAge(dateOfBirth, today);
      expect(age).toBe(33);
    });

    it('should calculate age correctly on birthday', () => {
      const today = new Date('2024-06-15');
      const dateOfBirth = new Date('1990-06-15');
      const age = calculateAge(dateOfBirth, today);
      expect(age).toBe(34);
    });

    it('should handle leap year birthdays correctly', () => {
      const today = new Date('2024-03-01');
      const dateOfBirth = new Date('2000-02-29');
      const age = calculateAge(dateOfBirth, today);
      expect(age).toBe(24);
    });

    it('should default to today when reference date not provided', () => {
      const dateOfBirth = new Date('1990-01-01');
      const age = calculateAge(dateOfBirth);
      const expectedAge = new Date().getFullYear() - 1990;
      expect(age).toBeGreaterThanOrEqual(expectedAge - 1);
      expect(age).toBeLessThanOrEqual(expectedAge);
    });
  });

  describe('validatePANFormat', () => {
    it('should accept valid PAN format', () => {
      expect(validatePANFormat('ABCDE1234F')).toBe(true);
      expect(validatePANFormat('BCDER5678K')).toBe(true);
      expect(validatePANFormat('XYZAB9012M')).toBe(true);
    });

    it('should accept PAN with lowercase and convert to uppercase', () => {
      expect(validatePANFormat('abcde1234f')).toBe(true);
      expect(validatePANFormat('ABCDE1234f')).toBe(true);
      expect(validatePANFormat('ABCDE1234F')).toBe(true);
    });

    it('should accept PAN with spaces and trim', () => {
      expect(validatePANFormat(' ABCDE1234F ')).toBe(true);
      expect(validatePANFormat('ABCDE1234F ')).toBe(true);
      expect(validatePANFormat(' ABCDE1234F')).toBe(true);
    });

    it('should reject PAN with only 4 letters at start', () => {
      expect(validatePANFormat('ABCD1234F')).toBe(false);
    });

    it('should reject PAN with 6 letters at start', () => {
      expect(validatePANFormat('ABCDEF1234F')).toBe(false);
    });

    it('should reject PAN with last character as digit', () => {
      expect(validatePANFormat('ABCDE12345')).toBe(false);
    });

    it('should reject PAN that is too short', () => {
      expect(validatePANFormat('ABCDE123')).toBe(false);
    });

    it('should reject PAN that is too long', () => {
      expect(validatePANFormat('ABCDE12345F')).toBe(false);
    });

    it('should reject PAN with special characters', () => {
      expect(validatePANFormat('ABC-E1234F')).toBe(false);
      expect(validatePANFormat('ABCDE@234F')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validatePANFormat('')).toBe(false);
    });

    it('should reject undefined', () => {
      expect(validatePANFormat(undefined as any)).toBe(false);
    });

    it('should reject null', () => {
      expect(validatePANFormat(null as any)).toBe(false);
    });
  });

  describe('evaluateEligibility - Age Boundary Tests', () => {
    const today = new Date('2024-06-15');

    it('should reject applicant aged 22 (below minimum)', () => {
      const dateOfBirth = new Date('2002-06-16');
      const age = calculateAge(dateOfBirth, today);
      expect(age).toBe(21);

      const result = evaluateEligibility({
        dateOfBirth,
        monthlySalary: 30000,
        employmentMode: EmploymentMode.Salaried,
      });

      expect(result.eligible).toBe(false);
      expect(result.rejectionReasons).toContainEqual({
        field: 'age',
        message: 'Applicant is below minimum age requirement',
        currentValue: 21,
        requirement: 'Minimum age: 23 years',
      });
    });

    it('should accept applicant aged 23 (at minimum)', () => {
      const dateOfBirth = new Date('2001-06-15');
      const age = calculateAge(dateOfBirth, today);
      expect(age).toBe(23);

      const result = evaluateEligibility({
        dateOfBirth,
        monthlySalary: 30000,
        employmentMode: EmploymentMode.Salaried,
      });

      expect(result.eligible).toBe(true);
      expect(result.rejectionReasons).toHaveLength(0);
    });

    it('should accept applicant aged 50 (at maximum)', () => {
      const dateOfBirth = new Date('1974-06-15');
      const age = calculateAge(dateOfBirth, today);
      expect(age).toBe(50);

      const result = evaluateEligibility({
        dateOfBirth,
        monthlySalary: 30000,
        employmentMode: EmploymentMode.Salaried,
      });

      expect(result.eligible).toBe(true);
      expect(result.rejectionReasons).toHaveLength(0);
    });

    it('should reject applicant aged 51 (above maximum)', () => {
      const dateOfBirth = new Date('1973-06-16');
      const age = calculateAge(dateOfBirth, today);
      expect(age).toBe(50);

      const dateOfBirth2 = new Date('1972-06-15');
      const age2 = calculateAge(dateOfBirth2, today);
      expect(age2).toBe(52);

      const result = evaluateEligibility({
        dateOfBirth: dateOfBirth2,
        monthlySalary: 30000,
        employmentMode: EmploymentMode.Salaried,
      });

      expect(result.eligible).toBe(false);
      expect(result.rejectionReasons).toContainEqual({
        field: 'age',
        message: 'Applicant is above maximum age requirement',
        currentValue: 52,
        requirement: 'Maximum age: 50 years',
      });
    });
  });

  describe('evaluateEligibility - Salary Boundary Tests', () => {
    it('should reject applicant with salary ₹24,999 (below minimum)', () => {
      const result = evaluateEligibility({
        dateOfBirth: new Date('1990-01-01'),
        monthlySalary: 24999,
        employmentMode: EmploymentMode.Salaried,
      });

      expect(result.eligible).toBe(false);
      expect(result.rejectionReasons).toContainEqual({
        field: 'monthlySalary',
        message: 'Monthly salary is below minimum requirement',
        currentValue: 24999,
        requirement: 'Minimum monthly salary: ₹25,000',
      });
    });

    it('should accept applicant with salary ₹25,000 (at minimum)', () => {
      const result = evaluateEligibility({
        dateOfBirth: new Date('1990-01-01'),
        monthlySalary: 25000,
        employmentMode: EmploymentMode.Salaried,
      });

      expect(result.eligible).toBe(true);
      expect(result.rejectionReasons).toHaveLength(0);
    });

    it('should accept applicant with salary above minimum', () => {
      const result = evaluateEligibility({
        dateOfBirth: new Date('1990-01-01'),
        monthlySalary: 50000,
        employmentMode: EmploymentMode.Salaried,
      });

      expect(result.eligible).toBe(true);
      expect(result.rejectionReasons).toHaveLength(0);
    });
  });

  describe('evaluateEligibility - PAN Validation', () => {
    it('should accept valid PAN format', () => {
      const result = evaluateEligibility({
        dateOfBirth: new Date('1990-01-01'),
        monthlySalary: 30000,
        panNumber: 'ABCDE1234F',
        employmentMode: EmploymentMode.Salaried,
      });

      expect(result.eligible).toBe(true);
      expect(result.rejectionReasons).toHaveLength(0);
    });

    it('should reject invalid PAN format', () => {
      const result = evaluateEligibility({
        dateOfBirth: new Date('1990-01-01'),
        monthlySalary: 30000,
        panNumber: 'INVALID_PAN',
        employmentMode: EmploymentMode.Salaried,
      });

      expect(result.eligible).toBe(false);
      expect(result.rejectionReasons).toContainEqual({
        field: 'panNumber',
        message: 'PAN number format is invalid',
        currentValue: 'INVALID_PAN',
        requirement: 'Format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)',
      });
    });

    it('should not reject when PAN is not provided', () => {
      const result = evaluateEligibility({
        dateOfBirth: new Date('1990-01-01'),
        monthlySalary: 30000,
        employmentMode: EmploymentMode.Salaried,
      });

      expect(result.eligible).toBe(true);
      expect(result.rejectionReasons).toHaveLength(0);
    });

    it('should accept PAN with lowercase', () => {
      const result = evaluateEligibility({
        dateOfBirth: new Date('1990-01-01'),
        monthlySalary: 30000,
        panNumber: 'abcde1234f',
        employmentMode: EmploymentMode.Salaried,
      });

      expect(result.eligible).toBe(true);
      expect(result.rejectionReasons).toHaveLength(0);
    });
  });

  describe('evaluateEligibility - Employment Mode Validation', () => {
    it('should accept Salaried employment mode', () => {
      const result = evaluateEligibility({
        dateOfBirth: new Date('1990-01-01'),
        monthlySalary: 30000,
        employmentMode: EmploymentMode.Salaried,
      });

      expect(result.eligible).toBe(true);
      expect(result.rejectionReasons).toHaveLength(0);
    });

    it('should accept SelfEmployed employment mode', () => {
      const result = evaluateEligibility({
        dateOfBirth: new Date('1990-01-01'),
        monthlySalary: 30000,
        employmentMode: EmploymentMode.SelfEmployed,
      });

      expect(result.eligible).toBe(true);
      expect(result.rejectionReasons).toHaveLength(0);
    });

    it('should accept Business employment mode', () => {
      const result = evaluateEligibility({
        dateOfBirth: new Date('1990-01-01'),
        monthlySalary: 30000,
        employmentMode: EmploymentMode.Business,
      });

      expect(result.eligible).toBe(true);
      expect(result.rejectionReasons).toHaveLength(0);
    });

    it('should reject Other employment mode (Unemployed)', () => {
      const result = evaluateEligibility({
        dateOfBirth: new Date('1990-01-01'),
        monthlySalary: 30000,
        employmentMode: EmploymentMode.Other,
      });

      expect(result.eligible).toBe(false);
      expect(result.rejectionReasons).toContainEqual({
        field: 'employmentMode',
        message: 'Employment mode is not acceptable',
        currentValue: EmploymentMode.Other,
        requirement: 'Must be Salaried, SelfEmployed, or Business (Other/Unemployed not allowed)',
      });
    });
  });

  describe('evaluateEligibility - Multiple Rejection Reasons', () => {
    it('should return all rejection reasons when multiple criteria fail', () => {
      const result = evaluateEligibility({
        dateOfBirth: new Date('2010-01-01'),
        monthlySalary: 10000,
        panNumber: 'INVALID',
        employmentMode: EmploymentMode.Other,
      });

      expect(result.eligible).toBe(false);
      expect(result.rejectionReasons.length).toBeGreaterThan(1);
      expect(result.rejectionReasons.some(r => r.field === 'age')).toBe(true);
      expect(result.rejectionReasons.some(r => r.field === 'monthlySalary')).toBe(true);
      expect(result.rejectionReasons.some(r => r.field === 'panNumber')).toBe(true);
      expect(result.rejectionReasons.some(r => r.field === 'employmentMode')).toBe(true);
    });
  });

  describe('evaluateEligibility - Fully Eligible Applicant', () => {
    it('should accept applicant who meets all criteria', () => {
      const result = evaluateEligibility({
        dateOfBirth: new Date('1990-01-01'),
        monthlySalary: 50000,
        panNumber: 'ABCDE1234F',
        employmentMode: EmploymentMode.Salaried,
      });

      expect(result.eligible).toBe(true);
      expect(result.rejectionReasons).toHaveLength(0);
    });
  });

  describe('evaluateEligibility - Pure Function Properties', () => {
    it('should not have side effects', () => {
      const input = {
        dateOfBirth: new Date('1990-01-01'),
        monthlySalary: 30000,
        employmentMode: EmploymentMode.Salaried,
      };

      const originalDateOfBirth = new Date(input.dateOfBirth);
      const originalSalary = input.monthlySalary;

      evaluateEligibility(input);

      expect(input.dateOfBirth.getTime()).toBe(originalDateOfBirth.getTime());
      expect(input.monthlySalary).toBe(originalSalary);
    });

    it('should return same result for same input', () => {
      const input = {
        dateOfBirth: new Date('1990-01-01'),
        monthlySalary: 30000,
        employmentMode: EmploymentMode.Salaried,
      };

      const result1 = evaluateEligibility(input);
      const result2 = evaluateEligibility(input);

      expect(result1).toEqual(result2);
    });
  });
});
