import { Request } from 'express';

export interface User {
  id: number;
  email: string;
  password: string; // bcrypt hashed
  email_verified: boolean; // Email verification status
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  conversions_used: number;
  conversions_limit: number;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: 'active' | 'canceled' | 'past_due';
  created_at: Date;
  updated_at: Date;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface JWTPayload {
  userId: number;
  email: string;
  type?: 'access' | 'refresh' | 'reset';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: Omit<User, 'password'>;
}