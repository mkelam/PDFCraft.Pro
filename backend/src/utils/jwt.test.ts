import { generateToken, verifyToken, decodeToken } from './jwt';

// Mock environment variable
process.env.JWT_SECRET = 'test-secret-key';

describe('JWT Utilities', () => {
  const testUserId = 123;
  const testEmail = 'test@example.com';

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(testUserId, testEmail);

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);

      // Token should have 3 parts separated by dots
      const tokenParts = token.split('.');
      expect(tokenParts).toHaveLength(3);
    });

    it('should include userId and email in token payload', () => {
      const token = generateToken(testUserId, testEmail);
      const decoded = decodeToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded!.userId).toBe(testUserId);
      expect(decoded!.email).toBe(testEmail);
    });

    it('should include expiration time in token', () => {
      const token = generateToken(testUserId, testEmail);
      const decoded = decodeToken(token);

      expect(decoded!.exp).toBeTruthy();
      expect(decoded!.iat).toBeTruthy();

      // Expiration should be about 15 minutes from now
      const now = Math.floor(Date.now() / 1000);
      const expectedExp = now + (15 * 60); // 15 minutes

      // Allow 5 second tolerance
      expect(decoded!.exp!).toBeGreaterThan(now);
      expect(decoded!.exp!).toBeLessThanOrEqual(expectedExp + 5);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken(testUserId, testEmail);
      const payload = verifyToken(token);

      expect(payload).toBeTruthy();
      expect(payload!.userId).toBe(testUserId);
      expect(payload!.email).toBe(testEmail);
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      const payload = verifyToken(invalidToken);

      expect(payload).toBeNull();
    });

    it('should return null for malformed token', () => {
      const malformedToken = 'not-a-token';
      const payload = verifyToken(malformedToken);

      expect(payload).toBeNull();
    });

    it('should return null for empty token', () => {
      const payload = verifyToken('');

      expect(payload).toBeNull();
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = generateToken(testUserId, testEmail);
      const decoded = decodeToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded!.userId).toBe(testUserId);
      expect(decoded!.email).toBe(testEmail);
    });

    it('should return null for invalid token format', () => {
      const invalidToken = 'invalid-token';
      const decoded = decodeToken(invalidToken);

      expect(decoded).toBeNull();
    });
  });

  describe('Token generation consistency', () => {
    it('should generate different tokens for different users', () => {
      const token1 = generateToken(testUserId, testEmail);
      const token2 = generateToken(456, 'other@example.com');

      expect(token1).not.toBe(token2);
    });

    it('should include consistent structure for same user', () => {
      const token1 = generateToken(testUserId, testEmail);
      const token2 = generateToken(testUserId, testEmail);

      // Both tokens should be valid (different due to timestamp)
      const payload1 = verifyToken(token1);
      const payload2 = verifyToken(token2);

      expect(payload1?.userId).toBe(payload2?.userId);
      expect(payload1?.email).toBe(payload2?.email);
    });
  });
});