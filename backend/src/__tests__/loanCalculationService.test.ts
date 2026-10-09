import {
  calculateSimpleInterest,
  roundToRupees,
  validateLoanInput,
  calculateLoan,
  validateLoanAgainstEligibility,
} from '../services/loanCalculationService';

describe('Loan Calculation Service', () => {
  describe('calculateSimpleInterest', () => {
    it('should calculate simple interest correctly', () => {
      // Principal: 100000, Rate: 12%, Time: 365 days (1 year)
      // Interest = 100000 * 12 * 1 / 100 = 12000
      const interest = calculateSimpleInterest(100000, 12, 365);
      expect(interest).toBe(12000);
    });

    it('should calculate interest for partial year', () => {
      // Principal: 100000, Rate: 12%, Time: 182.5 days (0.5 year)
      // Interest = 100000 * 12 * 0.5 / 100 = 6000
      const interest = calculateSimpleInterest(100000, 12, 182.5);
      expect(interest).toBe(6000);
    });

    it('should calculate interest for 30 days', () => {
      // Principal: 100000, Rate: 12%, Time: 30 days
      // Interest = 100000 * 12 * (30/365) / 100 = 986.30
      const interest = calculateSimpleInterest(100000, 12, 30);
      expect(interest).toBeCloseTo(986.30, 2);
    });

    it('should calculate interest for 0 interest rate', () => {
      const interest = calculateSimpleInterest(100000, 0, 365);
      expect(interest).toBe(0);
    });
  });

  describe('roundToRupees', () => {
    it('should round to 2 decimal places', () => {
      expect(roundToRupees(123.456)).toBe(123.46);
      expect(roundToRupees(123.454)).toBe(123.45);
    });

    it('should handle integer values', () => {
      expect(roundToRupees(100)).toBe(100);
      expect(roundToRupees(100.00)).toBe(100);
    });

    it('should handle rounding edge cases', () => {
      expect(roundToRupees(100.005)).toBe(100.01);
      expect(roundToRupees(100.015)).toBe(100.02);
    });

    it('should handle large values', () => {
      expect(roundToRupees(500000.789)).toBe(500000.79);
    });

    it('should handle very small values', () => {
      expect(roundToRupees(0.001)).toBe(0);
      expect(roundToRupees(0.005)).toBe(0.01);
    });
  });

  describe('validateLoanInput', () => {
    it('should validate correct input', () => {
      const result = validateLoanInput({
        principal: 100000,
        tenureDays: 180,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    describe('Principal validation', () => {
      it('should reject principal below minimum (49,999)', () => {
        const result = validateLoanInput({
          principal: 49999,
          tenureDays: 180,
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'principal',
          message: 'Principal amount is below minimum requirement',
          currentValue: 49999,
          requirement: 'Minimum principal: ₹50,000',
        });
      });

      it('should accept principal at minimum (50,000)', () => {
        const result = validateLoanInput({
          principal: 50000,
          tenureDays: 180,
        });

        expect(result.valid).toBe(true);
      });

      it('should accept principal at maximum (5,00,000)', () => {
        const result = validateLoanInput({
          principal: 500000,
          tenureDays: 180,
        });

        expect(result.valid).toBe(true);
      });

      it('should reject principal above maximum (5,00,001)', () => {
        const result = validateLoanInput({
          principal: 500001,
          tenureDays: 180,
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'principal',
          message: 'Principal amount exceeds maximum limit',
          currentValue: 500001,
          requirement: 'Maximum principal: ₹5,00,000',
        });
      });
    });

    describe('Tenure validation', () => {
      it('should reject tenure below minimum (29 days)', () => {
        const result = validateLoanInput({
          principal: 100000,
          tenureDays: 29,
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'tenureDays',
          message: 'Tenure is below minimum requirement',
          currentValue: 29,
          requirement: 'Minimum tenure: 30 days',
        });
      });

      it('should accept tenure at minimum (30 days)', () => {
        const result = validateLoanInput({
          principal: 100000,
          tenureDays: 30,
        });

        expect(result.valid).toBe(true);
      });

      it('should accept tenure at maximum (365 days)', () => {
        const result = validateLoanInput({
          principal: 100000,
          tenureDays: 365,
        });

        expect(result.valid).toBe(true);
      });

      it('should reject tenure above maximum (366 days)', () => {
        const result = validateLoanInput({
          principal: 100000,
          tenureDays: 366,
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'tenureDays',
          message: 'Tenure exceeds maximum limit',
          currentValue: 366,
          requirement: 'Maximum tenure: 365 days',
        });
      });
    });

    describe('Annual interest rate validation', () => {
      it('should accept default rate when not provided', () => {
        const result = validateLoanInput({
          principal: 100000,
          tenureDays: 180,
        });

        expect(result.valid).toBe(true);
      });

      it('should accept valid interest rate', () => {
        const result = validateLoanInput({
          principal: 100000,
          tenureDays: 180,
          annualInterestRate: 15,
        });

        expect(result.valid).toBe(true);
      });

      it('should reject negative interest rate', () => {
        const result = validateLoanInput({
          principal: 100000,
          tenureDays: 180,
          annualInterestRate: -1,
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'annualInterestRate',
          message: 'Annual interest rate cannot be negative',
          currentValue: -1,
          requirement: 'Annual interest rate must be non-negative',
        });
      });

      it('should reject interest rate above maximum (31%)', () => {
        const result = validateLoanInput({
          principal: 100000,
          tenureDays: 180,
          annualInterestRate: 31,
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'annualInterestRate',
          message: 'Annual interest rate exceeds maximum limit',
          currentValue: 31,
          requirement: 'Maximum annual interest rate: 30%',
        });
      });

      it('should accept interest rate at maximum (30%)', () => {
        const result = validateLoanInput({
          principal: 100000,
          tenureDays: 180,
          annualInterestRate: 30,
        });

        expect(result.valid).toBe(true);
      });
    });

    describe('Multiple validation errors', () => {
      it('should return all validation errors when multiple criteria fail', () => {
        const result = validateLoanInput({
          principal: 10000,
          tenureDays: 10,
          annualInterestRate: 35,
        });

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
        expect(result.errors.some((e) => e.field === 'principal')).toBe(true);
        expect(result.errors.some((e) => e.field === 'tenureDays')).toBe(true);
        expect(result.errors.some((e) => e.field === 'annualInterestRate')).toBe(true);
      });
    });
  });

  describe('calculateLoan', () => {
    it('should calculate loan with default interest rate (12%)', () => {
      const result = calculateLoan({
        principal: 100000,
        tenureDays: 365,
      });

      expect(result.principal).toBe(100000);
      expect(result.tenureDays).toBe(365);
      expect(result.annualInterestRate).toBe(12);
      expect(result.calculatedInterest).toBe(12000);
      expect(result.totalRepayment).toBe(112000);
      expect(result.monthlyInstallment).toBeGreaterThan(0);
    });

    it('should calculate loan with custom interest rate', () => {
      const result = calculateLoan({
        principal: 100000,
        tenureDays: 365,
        annualInterestRate: 15,
      });

      expect(result.annualInterestRate).toBe(15);
      expect(result.calculatedInterest).toBe(15000);
      expect(result.totalRepayment).toBe(115000);
    });

    it('should calculate loan for 30 days tenure', () => {
      const result = calculateLoan({
        principal: 100000,
        tenureDays: 30,
      });

      expect(result.calculatedInterest).toBeCloseTo(986.30, 2);
      expect(result.totalRepayment).toBeCloseTo(100986.30, 2);
    });

    it('should calculate loan for 180 days tenure', () => {
      const result = calculateLoan({
        principal: 100000,
        tenureDays: 180,
      });

      // Interest = 100000 * 12 * (180/365) / 100 = 5917.81
      expect(result.calculatedInterest).toBeCloseTo(5917.81, 2);
      expect(result.totalRepayment).toBeCloseTo(105917.81, 2);
    });

    it('should round monetary values correctly', () => {
      const result = calculateLoan({
        principal: 100000,
        tenureDays: 30,
      });

      expect(result.calculatedInterest).toBe(roundToRupees(result.calculatedInterest));
      expect(result.totalRepayment).toBe(roundToRupees(result.totalRepayment));
    });

    it('should throw validation error for invalid input', () => {
      expect(() => {
        calculateLoan({
          principal: 10000,
          tenureDays: 180,
        });
      }).toThrow('Loan calculation input validation failed');
    });

    describe('Boundary value tests', () => {
      it('should calculate loan at minimum principal (50,000)', () => {
        const result = calculateLoan({
          principal: 50000,
          tenureDays: 365,
        });

        expect(result.principal).toBe(50000);
        expect(result.calculatedInterest).toBe(6000);
        expect(result.totalRepayment).toBe(56000);
      });

      it('should calculate loan at maximum principal (5,00,000)', () => {
        const result = calculateLoan({
          principal: 500000,
          tenureDays: 365,
        });

        expect(result.principal).toBe(500000);
        expect(result.calculatedInterest).toBe(60000);
        expect(result.totalRepayment).toBe(560000);
      });

      it('should calculate loan at minimum tenure (30 days)', () => {
        const result = calculateLoan({
          principal: 100000,
          tenureDays: 30,
        });

        expect(result.tenureDays).toBe(30);
        expect(result.calculatedInterest).toBeCloseTo(986.30, 2);
      });

      it('should calculate loan at maximum tenure (365 days)', () => {
        const result = calculateLoan({
          principal: 100000,
          tenureDays: 365,
        });

        expect(result.tenureDays).toBe(365);
        expect(result.calculatedInterest).toBe(12000);
      });

      it('should calculate loan at both minimum boundaries', () => {
        const result = calculateLoan({
          principal: 50000,
          tenureDays: 30,
        });

        expect(result.principal).toBe(50000);
        expect(result.tenureDays).toBe(30);
        expect(result.calculatedInterest).toBeCloseTo(493.15, 2);
      });

      it('should calculate loan at both maximum boundaries', () => {
        const result = calculateLoan({
          principal: 500000,
          tenureDays: 365,
        });

        expect(result.principal).toBe(500000);
        expect(result.tenureDays).toBe(365);
        expect(result.calculatedInterest).toBe(60000);
      });
    });
  });

  describe('validateLoanAgainstEligibility', () => {
    it('should throw error when borrower is not eligible', () => {
      expect(() => {
        validateLoanAgainstEligibility(100000, false);
      }).toThrow('Loan application cannot be submitted: borrower is not eligible');
    });

    it('should not throw error when borrower is eligible', () => {
      expect(() => {
        validateLoanAgainstEligibility(100000, true);
      }).not.toThrow();
    });
  });
});
