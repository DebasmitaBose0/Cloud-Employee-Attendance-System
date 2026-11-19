import { Router } from 'express';
import {
  biometricCheckIn,
  biometricCheckOut,
  getAttendance,
  getAttendanceById,
  getDailyAttendance,
  getEmployeeAttendance,
  markAttendance,
  markCutoffAbsent,
  updateAttendance,
} from '../controllers/attendanceController.ts';
import { authorizeRoles, protect } from '../middleware/authMiddleware.ts';

const router = Router();

router.use(protect);

router.get('/', getAttendance);
router.get('/daily', authorizeRoles('admin'), getDailyAttendance);
router.post('/biometric/check-in', biometricCheckIn);
router.post('/biometric/check-out', biometricCheckOut);
router.post('/cutoff-absent', authorizeRoles('admin'), markCutoffAbsent);
router.get('/employee/:employeeId', getEmployeeAttendance);
router.get('/:id', getAttendanceById);
router.post('/', authorizeRoles('admin'), markAttendance);
router.put('/:id', authorizeRoles('admin'), updateAttendance);

export default router;
