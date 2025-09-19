import { User } from './auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: Omit<User, 'password'>;
      rateLimit?: {
        resetTime?: number;
        [key: string]: any;
      };
    }
  }
}

export {};