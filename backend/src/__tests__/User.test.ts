import mongoose from 'mongoose';
import User, { UserRole } from '../models/User';

describe('User Model', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid user', async () => {
      const userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        role: UserRole.Admin,
      };

      const user = await User.create(userData);
      expect(user.fullName).toBe(userData.fullName);
      expect(user.email).toBe(userData.email.toLowerCase());
      expect(user.role).toBe(userData.role);
      expect(user.password).not.toBe(userData.password);
    });

    it('should fail validation for missing full name', async () => {
      const userData = {
        email: 'john@example.com',
        password: 'SecurePass123',
        role: UserRole.Admin,
      };

      await expect(User.create(userData)).rejects.toThrow('Full name is required');
    });

    it('should fail validation for short full name', async () => {
      const userData = {
        fullName: 'J',
        email: 'john@example.com',
        password: 'SecurePass123',
        role: UserRole.Admin,
      };

      await expect(User.create(userData)).rejects.toThrow('at least 2 characters');
    });

    it('should fail validation for missing email', async () => {
      const userData = {
        fullName: 'John Doe',
        password: 'SecurePass123',
        role: UserRole.Admin,
      };

      await expect(User.create(userData)).rejects.toThrow('Email is required');
    });

    it('should fail validation for invalid email format', async () => {
      const userData = {
        fullName: 'John Doe',
        email: 'invalid-email',
        password: 'SecurePass123',
        role: UserRole.Admin,
      };

      await expect(User.create(userData)).rejects.toThrow('valid email address');
    });

    it('should fail validation for missing password', async () => {
      const userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        role: UserRole.Admin,
      };

      await expect(User.create(userData)).rejects.toThrow('Password is required');
    });

    it('should fail validation for short password', async () => {
      const userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        password: 'short',
        role: UserRole.Admin,
      };

      await expect(User.create(userData)).rejects.toThrow('at least 8 characters');
    });

    it('should fail validation for missing role', async () => {
      const userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
      };

      const user = await User.create(userData);
      expect(user.role).toBe(UserRole.Borrower);
    });
  });

  describe('Role Validation', () => {
    it('should accept all valid roles', async () => {
      const validRoles = Object.values(UserRole);

      for (const role of validRoles) {
        const userData = {
          fullName: 'Test User',
          email: `test${role}@example.com`,
          password: 'SecurePass123',
          role,
        };

        const user = await User.create(userData);
        expect(user.role).toBe(role);
      }
    });

    it('should reject invalid role', async () => {
      const userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        role: 'InvalidRole',
      };

      await expect(User.create(userData)).rejects.toThrow('not a valid role');
    });
  });

  describe('Email Constraints', () => {
    it('should normalize email to lowercase', async () => {
      const userData = {
        fullName: 'John Doe',
        email: 'JOHN@EXAMPLE.COM',
        password: 'SecurePass123',
        role: UserRole.Admin,
      };

      const user = await User.create(userData);
      expect(user.email).toBe('john@example.com');
    });

    it('should reject duplicate emails', async () => {
      const userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        role: UserRole.Admin,
      };

      await User.create(userData);

      const duplicateData = {
        fullName: 'Jane Doe',
        email: 'JOHN@EXAMPLE.COM',
        password: 'AnotherPass123',
        role: UserRole.Sales,
      };

      await expect(User.create(duplicateData)).rejects.toThrow();
    });

    it('should reject duplicate emails with different case', async () => {
      const userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        role: UserRole.Admin,
      };

      await User.create(userData);

      const duplicateData = {
        fullName: 'Jane Doe',
        email: 'John@Example.com',
        password: 'AnotherPass123',
        role: UserRole.Sales,
      };

      await expect(User.create(duplicateData)).rejects.toThrow();
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const plainPassword = 'SecurePass123';
      const userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        password: plainPassword,
        role: UserRole.Admin,
      };

      const user = await User.create(userData);
      expect(user.password).not.toBe(plainPassword);
      expect(user.password.length).toBeGreaterThan(0);
    });

    it('should not rehash password if not modified', async () => {
      const userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        role: UserRole.Admin,
      };

      const user = await User.create(userData);
      const originalHash = user.password;

      user.fullName = 'John Updated';
      await user.save();

      expect(user.password).toBe(originalHash);
    });

    it('should compare password correctly', async () => {
      const plainPassword = 'SecurePass123';
      const userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        password: plainPassword,
        role: UserRole.Admin,
      };

      const user = await User.create(userData);
      const isMatch = await user.comparePassword(plainPassword);
      expect(isMatch).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        role: UserRole.Admin,
      };

      const user = await User.create(userData);
      const isMatch = await user.comparePassword('WrongPassword');
      expect(isMatch).toBe(false);
    });
  });

  describe('Password Security', () => {
    it('should not return password in queries by default', async () => {
      const userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        role: UserRole.Admin,
      };

      await User.create(userData);
      const user = await User.findOne({ email: 'john@example.com' });

      expect(user).toBeDefined();
      expect(user?.password).toBeUndefined();
    });

    it('should allow selecting password explicitly', async () => {
      const userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        role: UserRole.Admin,
      };

      await User.create(userData);
      const user = await User.findOne({ email: 'john@example.com' }).select('+password');

      expect(user).toBeDefined();
      expect(user?.password).toBeDefined();
      expect(user?.password).not.toBe('SecurePass123');
    });
  });
});
