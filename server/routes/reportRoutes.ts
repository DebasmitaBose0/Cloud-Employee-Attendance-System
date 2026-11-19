import { Router } from 'express';
import {
  getDashboardStats,
  getDepartmentReport,
  getEmployeeReport,
  getMonthlyReport,
} from '../controllers/reportController.ts';
import { authorizeRoles, protect } from '../middleware/authMiddleware.ts';

const router = Router();

router.use(protect);

router.get('/dashboard/stats', getDashboardStats);
router.get('/reports/monthly', authorizeRoles('admin'), getMonthlyReport);
router.get('/reports/department', authorizeRoles('admin'), getDepartmentReport);
router.get('/reports/employee/:employeeId', getEmployeeReport);

export default router;
