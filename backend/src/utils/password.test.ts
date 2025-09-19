import { hashPassword, comparePassword, validatePasswordStrength } from './password';

describe('Password Utilities', () => {
  const testPassword = 'TestPassword123';
  const weakPassword = '123';

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const hashedPassword = await hashPassword(testPassword);

      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword.length).toBeGreaterThan(0);
      expect(hashedPassword).not.toBe(testPassword);
    });

    it('should generate different hashes for same password', async () => {
      const hash1 = await hashPassword(testPassword);
      const hash2 = await hashPassword(testPassword);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate hash starting with $2b$ (bcrypt format)', async () => {
      const hashedPassword = await hashPassword(testPassword);

      expect(hashedPassword).toMatch(/^\$2b\$/);
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const hashedPassword = await hashPassword(testPassword);
      const isValid = await comparePassword(testPassword, hashedPassword);

      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const hashedPassword = await hashPassword(testPassword);
      const isValid = await comparePassword('WrongPassword', hashedPassword);

      expect(isValid).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hashedPassword = await hashPassword(testPassword);
      const isValid = await comparePassword('', hashedPassword);

      expect(isValid).toBe(false);
    });

    it('should handle special characters in password', async () => {
      const specialPassword = 'Test!@#$%^&*()_+{}|:"<>?[]\\;\',./@Password123';
      const hashedPassword = await hashPassword(specialPassword);
      const isValid = await comparePassword(specialPassword, hashedPassword);

      expect(isValid).toBe(true);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const result = validatePasswordStrength('StrongPassword123');

      expect(result.isValid).toBe(true);
      expect(result.message).toBe('Password meets strength requirements');
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Test123');

      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePasswordStrength('testpassword123');

      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePasswordStrength('TESTPASSWORD123');

      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('TestPassword');

      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Password must contain at least one number');
    });

    it('should accept password with special characters', () => {
      const result = validatePasswordStrength('TestPassword123!@#');

      expect(result.isValid).toBe(true);
      expect(result.message).toBe('Password meets strength requirements');
    });

    it('should accept exactly 8 character password meeting all requirements', () => {
      const result = validatePasswordStrength('Test123A');

      expect(result.isValid).toBe(true);
      expect(result.message).toBe('Password meets strength requirements');
    });
  });
});