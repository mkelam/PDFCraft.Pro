/**
 * User Management Routes
 * Admin routes for managing users
 */

import { Router } from 'express';
import { UserManagementController } from '../controllers/user-management.controller';
import { authenticateToken } from '../middleware/auth';
import { rateLimitModerate } from '../middleware/rate-limit';

const router = Router();

// All routes require authentication
// TODO: Add admin-only middleware once role system is implemented
router.use(authenticateToken);

// Dashboard statistics
router.get('/stats', UserManagementController.getDashboardStats);

// User CRUD operations
router.get('/users', UserManagementController.getAllUsers);
router.get('/users/:id', UserManagementController.getUserById);
router.put('/users/:id', rateLimitModerate, UserManagementController.updateUser);
router.delete('/users/:id', rateLimitModerate, UserManagementController.deleteUser);

// User management actions
router.post('/users/:id/verify', rateLimitModerate, UserManagementController.verifyUserEmail);
router.post('/users/:id/reset-usage', rateLimitModerate, UserManagementController.resetUserUsage);
router.get('/users/:id/activity', UserManagementController.getUserActivity);

export default router;
