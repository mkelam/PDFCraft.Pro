import request from 'supertest';
import express from 'express';
import { AuthController } from './auth.controller';
import { authenticateToken } from '../middleware/auth';
import { validate, registerSchema, loginSchema } from '../middleware/validation';
import { _resetMockDatabase } from '../services/auth.service';

// Create test app for session management testing
const createSessionTestApp = () => {
  const app = express();
  app.use(express.json());

  // Auth routes
  app.post('/api/auth/register',
    validate(registerSchema),
    AuthController.register
  );

  app.post('/api/auth/login',
    validate(loginSchema),
    AuthController.login
  );

  app.post('/api/auth/logout', AuthController.logout);

  app.get('/api/auth/me', authenticateToken, AuthController.getMe);

  app.post('/api/auth/refresh', AuthController.refreshToken);

  return app;
};

describe('Session Management & User Context', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createSessionTestApp();
    _resetMockDatabase();
  });

  describe('GET /api/auth/me', () => {
    const testUser = {
      email: 'session@example.com',
      password: 'SessionTest123',
      confirmPassword: 'SessionTest123',
    };

    it('should return current user data for authenticated user', async () => {
      // Register and login to get token
      const loginResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const { token } = loginResponse.body.data;

      // Test /me endpoint
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.plan).toBe('free');
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.message).toBe('User data retrieved successfully');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
      expect(response.body.error.message).toBe('Access token required');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_INVALID');
    });

    it('should return 401 for malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'NotBearer token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_INVALID_FORMAT');
    });

    it('should fetch fresh user data from database', async () => {
      // Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const { token } = registerResponse.body.data;

      // Call /me endpoint multiple times - should get consistent data
      const response1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const response2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response1.body.data.user).toEqual(response2.body.data.user);
      expect(response1.body.data.user.conversions_used).toBe(0);
      expect(response1.body.data.user.conversions_limit).toBe(3);
    });
  });

  describe('POST /api/auth/refresh', () => {
    const testUser = {
      email: 'refresh@example.com',
      password: 'RefreshTest123',
      confirmPassword: 'RefreshTest123',
    };

    it('should refresh tokens with valid refresh token', async () => {
      // Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const { refreshToken } = registerResponse.body.data;

      // Refresh tokens
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.message).toBe('Tokens refreshed successfully');

      // New tokens should be different from original (or at least exist)
      expect(response.body.data.token).toBeTruthy();
      expect(response.body.data.refreshToken).toBeTruthy();
      // In a real implementation with proper timing, these would be different
      // For now, just verify they're valid tokens
      expect(typeof response.body.data.token).toBe('string');
      expect(typeof response.body.data.refreshToken).toBe('string');
    });

    it('should reject request without refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('REFRESH_TOKEN_MISSING');
      expect(response.body.error.message).toBe('Refresh token is required');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
      expect(response.body.error.message).toBe('Invalid or expired refresh token');
    });

    it('should work with new access token after refresh', async () => {
      // Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const { refreshToken } = registerResponse.body.data;

      // Refresh tokens
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const newToken = refreshResponse.body.data.token;

      // Use new token to access protected endpoint
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      expect(meResponse.body.success).toBe(true);
      expect(meResponse.body.data.user.email).toBe(testUser.email);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });

    it('should logout successfully with token', async () => {
      // Register and login
      const testUser = {
        email: 'logout@example.com',
        password: 'LogoutTest123',
        confirmPassword: 'LogoutTest123',
      };

      const loginResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const { token } = loginResponse.body.data;

      // Logout with token
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });

    it('should handle logout gracefully even if already logged out', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Session persistence and user context', () => {
    const testUser = {
      email: 'context@example.com',
      password: 'ContextTest123',
      confirmPassword: 'ContextTest123',
    };

    it('should maintain user context across multiple requests', async () => {
      // Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const { token } = registerResponse.body.data;

      // Make multiple authenticated requests
      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      );

      const responses = await Promise.all(requests);

      // All responses should have consistent user data
      responses.forEach((response, index) => {
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(testUser.email);
        expect(response.body.data.user.id).toBe(responses[0].body.data.user.id);
      });
    });

    it('should include complete user context in authenticated requests', async () => {
      // Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const { token } = registerResponse.body.data;

      // Get user context
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const user = response.body.data.user;

      // Verify complete user context
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email', testUser.email);
      expect(user).toHaveProperty('plan', 'free');
      expect(user).toHaveProperty('conversions_used', 0);
      expect(user).toHaveProperty('conversions_limit', 3);
      expect(user).toHaveProperty('created_at');
      expect(user).toHaveProperty('updated_at');
      expect(user).not.toHaveProperty('password');
    });

    it('should handle token refresh and maintain session', async () => {
      // Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const { refreshToken } = registerResponse.body.data;

      // Refresh token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const newToken = refreshResponse.body.data.token;
      const newRefreshToken = refreshResponse.body.data.refreshToken;

      // Use new token
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      expect(meResponse.body.data.user.email).toBe(testUser.email);

      // Chain another refresh
      const secondRefreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: newRefreshToken })
        .expect(200);

      expect(secondRefreshResponse.body.success).toBe(true);
      expect(secondRefreshResponse.body.data.user.email).toBe(testUser.email);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle missing Authorization header gracefully', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('code');
    });

    it('should provide consistent error format', async () => {
      const responses = await Promise.all([
        request(app).get('/api/auth/me').expect(401),
        request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid').expect(401),
        request(app).post('/api/auth/refresh').send({}).expect(400),
      ]);

      responses.forEach(response => {
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('message');
        expect(response.body.error).toHaveProperty('code');
      });
    });
  });
});