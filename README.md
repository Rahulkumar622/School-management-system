# School Management System

Multi-role school ERP with separate portals for software owner, school admin, teacher, parent, and student users.

## Stack

- Frontend: React + Create React App
- Backend: Express + MySQL
- Charts: Chart.js + react-chartjs-2

## Run Locally

1. Install backend packages:

```bash
cd backend
npm install
```

2. Install frontend packages:

```bash
cd ../frontend
npm install
```

3. Seed the known demo accounts and dashboard data:

```bash
cd ../backend
npm run seed:demo
```

4. Start the backend:

```bash
npm run dev
```

5. Start the frontend in a second terminal:

```bash
cd ../frontend
npm start
```

6. Open the app:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

## Demo Credentials

Use the following seeded credentials for a reliable walkthrough.

### Software Owner

- Email: `admin@gmail.com`
- Password: `1234`

### School Admin

- School Code: `DPS001`
- Email: `demo.admin@dps.local`
- Password: `Demo@123`

### Teacher

- School Code: `DPS001`
- Email: `demo.teacher@dps.local`
- Password: `Demo@123`

### Parent

- School Code: `DPS001`
- Email: `demo.parent@dps.local`
- Password: `Demo@123`

### Student

- School Code: `DPS001`
- Email: `demo.student@dps.local`
- Password: `Demo@123`

## Seeded Demo Data

The demo seed currently prepares:

- `Demo Public School (DPS001)` with software billing values
- 1 known-good school admin account
- 1 known-good teacher account
- 1 known-good parent account
- 1 linked student account
- attendance entries
- marks entries
- installment plan and payment history

## Important Note

This repository is using a local MySQL database that may already contain older experimental rows from previous testing. The credentials listed above are the known-good demo accounts created by `npm run seed:demo`.

## Live Deployment

This project now supports a simple production flow:

- build the frontend with `npm run build`
- start the backend with `npm start`
- the backend will serve the React build automatically when `frontend/build` exists
- Docker deploy is also supported with the root `Dockerfile`
- `render.yaml` is included for Render
- Railway is a strong fit because the root `Dockerfile` is auto-detected and Railway has an official MySQL template

Environment templates are available here:

- `backend/.env.example`
- `frontend/.env.example`

Detailed deployment notes:

- `DEPLOYMENT.md`
