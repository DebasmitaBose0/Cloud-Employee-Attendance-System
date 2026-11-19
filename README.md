# AttendCloud — Cloud-Based Employee Attendance Management System

A full-stack HR and employee attendance management platform built with React, Vite, Tailwind CSS, Express.js, and MongoDB (Mongoose). Designed for local development and production deployment on Ubuntu 22.04 (Oracle VirtualBox) and Amazon EC2 behind Nginx and PM2.

## Key Features

- **Role-Based Access Control (`admin` & `employee`)**:
  - **Admin / HR**: Full workforce directory CRUD, daily attendance sheet marking, duplicate-safe record updates, historical filtering, dashboard analytics, and monthly reporting with CSV export and print-ready layouts.
  - **Employee**: Restricted personal portal displaying today's status, monthly present/absent summary, attendance percentage, 6-month chart, personal attendance history, profile, and password management.
- **Database & Attendance Rules**:
  - Compound unique MongoDB index on `{ employee, date }` prevents duplicate attendance entries for the same employee on the same date.
  - Timezone-consistent `YYYY-MM-DD` calendar normalization.
  - Monthly attendance formula: `(Present Days / Total Recorded Working Days) × 100`.
  - Excludes configured weekends and public holidays; unmarked dates are flagged as incomplete data rather than counted as absent.
- **Security**:
  - `bcryptjs` password hashing (`select: false` on password field).
  - Stateless JWT Bearer authentication.
  - Centralized Mongoose validation and duplicate-key error handling.
  - Environment-driven configuration with no hardcoded secrets.

## Architecture & Folder Structure

```
├── server.ts                       # Unified Express + Vite/dist entry point
├── server/
│   ├── app.ts                      # Express app, CORS, /api/health, routes, error handler
│   ├── config/                     # Environment & MongoDB connection (MONGO_URI / dev fallback)
│   ├── controllers/                # MVC controllers (auth, employee, attendance, report)
│   ├── middleware/                 # JWT protection, role authorization, error handling
│   ├── models/                     # Mongoose schemas (User, Employee, Attendance)
│   ├── routes/                     # REST API route definitions
│   ├── scripts/seed.ts             # Standalone CLI database seeder
│   └── utils/                      # JWT helpers, working-day calendar utils, seed data
├── src/
│   ├── components/                 # Reusable UI dialogs, modals, drawers, cards, skeletons
│   ├── context/                    # AuthContext (JWT session & role state)
│   ├── layouts/                    # Responsive collapsible DashboardLayout
│   ├── pages/                      # Login, Admin/Employee Dashboards, Employees, Attendance, History, Reports, Profile, Settings
│   ├── services/api.ts             # Axios instance with Bearer token interceptor
│   ├── types/                      # Shared TypeScript interfaces
│   └── utils/                      # Date formatters & CSV export utility
└── deploy/
    ├── nginx.conf                  # Production Nginx reverse proxy configuration
    └── ecosystem.config.cjs        # PM2 process configuration
```

## Local Setup (Windows / macOS / Linux)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env` and update values:
   ```bash
   cp .env.example .env
   ```
   Set `MONGO_URI="mongodb://127.0.0.1:27017/attendance_system"` if MongoDB Community Edition is running locally, and set a strong `JWT_SECRET`.

3. **Seed initial Admin & sample dataset**:
   ```bash
   npm run seed
   ```
   *(Use `npm run seed -- --reset` to wipe and re-seed.)*

4. **Start development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

### Initial Local Setup Credentials
- **Admin / HR**: `admin@attendcloud.local` / `Admin@ChangeMe2026` *(change password after first login in Settings)*
- **Sample Employee**: `maya.patel@attendcloud.local` / `Employee@2026`

## API Endpoints

- `GET /api/health` — Service & MongoDB health check
- `POST /api/auth/login` | `POST /api/auth/logout` | `GET /api/auth/me` | `POST /api/auth/change-password`
- `GET /api/employees` | `GET /api/employees/next-id` | `GET /api/employees/:id` | `POST /api/employees` | `PUT /api/employees/:id` | `DELETE /api/employees/:id`
- `GET /api/attendance` | `GET /api/attendance/daily` | `GET /api/attendance/:id` | `GET /api/attendance/employee/:employeeId` | `POST /api/attendance` | `PUT /api/attendance/:id`
- `GET /api/dashboard/stats` | `GET /api/reports/monthly` | `GET /api/reports/department` | `GET /api/reports/employee/:employeeId`

## Deployment Guide: Ubuntu 22.04 (Oracle VirtualBox) & Amazon EC2

1. **Provision Node.js 22 & MongoDB 7.0 on Ubuntu 22.04**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt install -y nodejs nginx git
   sudo npm install -g pm2
   ```
   Install MongoDB Community Edition following the official Ubuntu 22.04 repository, enable `mongod`:
   ```bash
   sudo systemctl enable --now mongod
   ```
   Verify `/etc/mongod.conf` binds only to `127.0.0.1` (never expose port `27017` in EC2 Security Groups!).

2. **Deploy Application Code**:
   ```bash
   sudo mkdir -p /var/www/attendcloud
   sudo chown -R $USER:$USER /var/www/attendcloud
   cd /var/www/attendcloud
   # Clone or copy repository files here
   npm ci
   cp .env.example .env
   # Edit .env with production MONGO_URI, strong JWT_SECRET, and ADMIN_PASSWORD
   npm run build
   npm run seed
   ```

3. **Start with PM2**:
   ```bash
   pm2 start deploy/ecosystem.config.cjs
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx Reverse Proxy**:
   ```bash
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/attendcloud
   sudo ln -s /etc/nginx/sites-available/attendcloud /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. **Amazon EC2 Security Group & SSL**:
   - Allow inbound **HTTP (80)**, **HTTPS (443)**, and **SSH (22)** restricted to your IP.
   - Do **NOT** open port `3000` or `27017` publicly.
   - Optionally attach a domain and enable HTTPS via Certbot (`sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx`).
