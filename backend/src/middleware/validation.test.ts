import request from 'supertest';
import express from 'express';
import { validate, registerSchema, loginSchema, validateFileUpload } from './validation';

// Create test app for validation middleware
const createValidationTestApp = () => {
  const app = express();
  app.use(express.json());

  // Test routes for validation
  app.post('/test/register', validate(registerSchema), (req, res) => {
    res.json({ success: true, data: req.body });
  });

  app.post('/test/login', validate(loginSchema), (req, res) => {
    res.json({ success: true, data: req.body });
  });

  return app;
};

describe('Validation Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createValidationTestApp();
  });

  describe('registerSchema validation', () => {
    it('should accept valid registration data', async () => {
      const validData = {
        email: 'test@example.com',
        password: 'TestPassword123',
        confirmPassword: 'TestPassword123',
      };

      const response = await request(app)
        .post('/test/register')
        .send(validData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(validData);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/test/register')
        .send({
          email: 'invalid-email',
          password: 'TestPassword123',
          confirmPassword: 'TestPassword123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details[0].message).toContain('valid email');
    });

    it('should reject password shorter than 8 characters', async () => {
      const response = await request(app)
        .post('/test/register')
        .send({
          email: 'test@example.com',
          password: 'Short1',
          confirmPassword: 'Short1',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.details[0].message).toContain('at least 8 characters');
    });

    it('should reject password without uppercase letter', async () => {
      const response = await request(app)
        .post('/test/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.details[0].message).toContain('uppercase letter');
    });

    it('should reject password without lowercase letter', async () => {
      const response = await request(app)
        .post('/test/register')
        .send({
          email: 'test@example.com',
          password: 'PASSWORD123',
          confirmPassword: 'PASSWORD123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.details[0].message).toContain('lowercase letter');
    });

    it('should reject password without number', async () => {
      const response = await request(app)
        .post('/test/register')
        .send({
          email: 'test@example.com',
          password: 'TestPassword',
          confirmPassword: 'TestPassword',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.details[0].message).toContain('number');
    });

    it('should reject mismatched passwords', async () => {
      const response = await request(app)
        .post('/test/register')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123',
          confirmPassword: 'DifferentPassword123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.details[0].message).toContain('must match');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/test/register')
        .send({
          email: 'test@example.com',
          // Missing password and confirmPassword
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.length).toBeGreaterThan(0);
    });

    it('should strip unknown fields', async () => {
      const inputData = {
        email: 'test@example.com',
        password: 'TestPassword123',
        confirmPassword: 'TestPassword123',
        unknownField: 'should be removed',
      };

      const response = await request(app)
        .post('/test/register')
        .send(inputData)
        .expect(200);

      expect(response.body.data).not.toHaveProperty('unknownField');
      expect(response.body.data).toEqual({
        email: inputData.email,
        password: inputData.password,
        confirmPassword: inputData.confirmPassword,
      });
    });
  });

  describe('loginSchema validation', () => {
    it('should accept valid login data', async () => {
      const validData = {
        email: 'test@example.com',
        password: 'any-password',
      };

      const response = await request(app)
        .post('/test/login')
        .send(validData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(validData);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/test/login')
        .send({
          email: 'invalid-email',
          password: 'any-password',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing email', async () => {
      const response = await request(app)
        .post('/test/login')
        .send({
          password: 'any-password',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.details[0].message).toContain('Email is required');
    });

    it('should reject missing password', async () => {
      const response = await request(app)
        .post('/test/login')
        .send({
          email: 'test@example.com',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.details[0].message).toContain('Password is required');
    });
  });

  describe('Error response format', () => {
    it('should return all validation errors', async () => {
      const response = await request(app)
        .post('/test/register')
        .send({
          email: 'invalid-email',
          password: 'weak',
          // Missing confirmPassword
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeInstanceOf(Array);
      expect(response.body.error.details.length).toBeGreaterThan(1);

      // Check that each error has field and message
      response.body.error.details.forEach((error: any) => {
        expect(error).toHaveProperty('field');
        expect(error).toHaveProperty('message');
      });
    });

    it('should provide clear field mapping in errors', async () => {
      const response = await request(app)
        .post('/test/register')
        .send({
          email: 'invalid-email',
          password: 'TestPassword123',
          confirmPassword: 'DifferentPassword123',
        })
        .expect(400);

      const emailError = response.body.error.details.find((e: any) => e.field === 'email');
      const passwordError = response.body.error.details.find((e: any) => e.field === 'confirmPassword');

      expect(emailError).toBeTruthy();
      expect(passwordError).toBeTruthy();
    });
  });
});