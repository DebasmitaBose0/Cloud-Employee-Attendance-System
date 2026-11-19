import dotenv from 'dotenv';

dotenv.config();

const parseCsvList = (value: string | undefined, fallback: string[]): string[] => {
  if (!value || !value.trim()) return fallback;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI?.trim() || '',
  jwtSecret:
    process.env.JWT_SECRET?.trim() ||
    'attendcloud-dev-fallback-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || '7d',
  clientUrls: parseCsvList(process.env.CLIENT_URL, ['http://localhost:3000']),
  adminName: process.env.ADMIN_NAME?.trim() || 'Claire Vance',
  adminEmail: (process.env.ADMIN_EMAIL?.trim() || 'admin@attendcloud.local').toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD?.trim() || 'Admin@ChangeMe2026',
  defaultEmployeePassword:
    process.env.DEFAULT_EMPLOYEE_PASSWORD?.trim() || 'Employee@2026',
  weekendDays: parseCsvList(process.env.WEEKEND_DAYS, ['0', '6']).map((d) => Number(d)),
  publicHolidays: parseCsvList(process.env.PUBLIC_HOLIDAYS, [
    '2026-01-01',
    '2026-01-26',
    '2026-05-01',
    '2026-07-04',
    '2026-08-15',
    '2026-10-02',
    '2026-11-26',
    '2026-12-25',
  ]),
};
