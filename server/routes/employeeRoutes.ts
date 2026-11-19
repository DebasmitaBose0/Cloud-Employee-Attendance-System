import { Router } from 'express';
import {
  createEmployee,
  deleteEmployee,
  getEmployeeById,
  getEmployees,
  getNextEmployeeId,
  updateEmployee,
} from '../controllers/employeeController.ts';
import { authorizeRoles, protect } from '../middleware/authMiddleware.ts';

const router = Router();

router.use(protect);

router.get('/', authorizeRoles('admin'), getEmployees);
router.get('/next-id', authorizeRoles('admin'), getNextEmployeeId);
router.get('/:id', getEmployeeById);
router.post('/', authorizeRoles('admin'), createEmployee);
router.put('/:id', authorizeRoles('admin'), updateEmployee);
router.delete('/:id', authorizeRoles('admin'), deleteEmployee);

export default router;
