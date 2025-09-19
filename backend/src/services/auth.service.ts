import { hashPassword, comparePassword } from '../utils/password';
import { generateTokenPair } from '../utils/jwt';
import { User, LoginData } from '../types/auth.types';

// Mock database operations - will be replaced with actual database in next story
let mockUsers: User[] = [];
let nextUserId = 1;

export interface CreateUserData {
  email: string;
  password: string;
  plan?: 'free' | 'starter' | 'pro' | 'enterprise';
}

export interface AuthResult {
  user: Omit<User, 'password'>;
  token: string;
  refreshToken?: string;
}

/**
 * Create a new user account
 */
export const createUser = async (userData: CreateUserData): Promise<AuthResult> => {
  const { email, password, plan = 'free' } = userData;

  // Check if user already exists
  const existingUser = mockUsers.find(user => user.email === email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const newUser: User = {
    id: nextUserId++,
    email,
    password: hashedPassword,
    plan,
    conversions_used: 0,
    conversions_limit: plan === 'free' ? 3 : plan === 'starter' ? 100 : -1,
    created_at: new Date(),
    updated_at: new Date(),
  };

  // Save to mock database
  mockUsers.push(newUser);

  // Generate JWT tokens
  const tokens = generateTokenPair(newUser.id, newUser.email);

  // Return user without password
  const { password: _, ...userWithoutPassword } = newUser;

  return {
    user: userWithoutPassword,
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
};

/**
 * Authenticate user login
 */
export const authenticateUser = async (loginData: LoginData): Promise<AuthResult> => {
  const { email, password } = loginData;

  // Find user by email
  const user = mockUsers.find(u => u.email === email);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Generate JWT tokens
  const tokens = generateTokenPair(user.id, user.email);

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
};

/**
 * Find user by email
 */
export const findUserByEmail = async (email: string): Promise<User | null> => {
  const user = mockUsers.find(u => u.email === email);
  return user || null;
};

/**
 * Find user by ID
 */
export const findUserById = async (id: number): Promise<Omit<User, 'password'> | null> => {
  const user = mockUsers.find(u => u.id === id);
  if (!user) return null;

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

// Development utilities
export const _resetMockDatabase = () => {
  mockUsers = [];
  nextUserId = 1;
};

export const _getMockUsers = () => mockUsers;