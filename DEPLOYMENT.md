# Deployment Guide

This repo is best deployed as one service:

- React builds from `frontend/`
- Express serves the built frontend
- API and frontend stay on the same domain

For this stack, Railway is the easier option because Railway can auto-detect the root `Dockerfile` and also provides a MySQL template. Render works too, but you must bring your own MySQL service or external MySQL database.

## Vercel deployment note

Vercel should not be used as a single combined deployment for this repo's frontend and backend together.

- the root `vercel.json` is configured to deploy the React frontend build from `frontend/build`
- the Express backend should be deployed separately on Railway, Render, or as a separate Vercel backend project rooted at `backend/`
- if you deploy the frontend on Vercel, set `REACT_APP_API_URL` to your live backend URL during the frontend build
- if you do not set `REACT_APP_API_URL`, the frontend will try the current site origin in production, which only works when frontend and backend are hosted on the same domain

Why this matters:

- Vercel serves the frontend as a static app
- this repo's backend currently expects a Node server plus MySQL
- the backend's `express.static()` behavior is not the right way to serve the frontend inside a Vercel frontend deployment

## Required environment variables

Use these values on any platform:

```env
PORT=5000
DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=your-mysql-user
DB_PASSWORD=your-mysql-password
DB_NAME=your-mysql-database
DB_SSL=false
DB_CONNECTION_LIMIT=10
CLIENT_URL=https://your-live-domain.com
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=1234
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMS_PROVIDER_URL=
SMS_PROVIDER_KEY=
```

Notes:

- `CLIENT_URL` can contain one or more comma-separated frontend URLs.
- Keep `DB_SSL=true` when your MySQL provider requires SSL.
- If frontend and backend are deployed together on the same domain, `REACT_APP_API_URL` is not required.
- The backend also supports `MYSQL_URL` or `DATABASE_URL` if your platform gives a full MySQL connection string.
- Email and SMS endpoints currently support config detection plus simulated mode. Add real provider wiring before using them for production delivery.

## Railway deployment

Railway can deploy this app directly from the root `Dockerfile`.

### 1. Push the repo to GitHub

Railway works cleanly when the repo, `Dockerfile`, and app code are all in the same root directory.

### 2. Create a Railway project

- In Railway, create a new project.
- Add a service from your GitHub repo.
- Railway should automatically detect the root `Dockerfile`.

### 3. Add MySQL

- In the same Railway project, add the official MySQL template.
- Copy these values from the MySQL service into your app service variables:
  - `MYSQLHOST` -> `DB_HOST`
  - `MYSQLPORT` -> `DB_PORT`
  - `MYSQLUSER` -> `DB_USER`
  - `MYSQLPASSWORD` -> `DB_PASSWORD`
  - `MYSQLDATABASE` -> `DB_NAME`

### 4. Set app variables

In the web service variables, set:

```env
MYSQL_URL=copy-from-your-railway-mysql-service-if-available
DB_SSL=false
DB_CONNECTION_LIMIT=10
CLIENT_URL=https://your-app.up.railway.app
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=your-strong-password
```

If you do not want to use `MYSQL_URL`, set these instead by copying from the Railway MySQL service:

```env
DB_HOST=MYSQLHOST
DB_PORT=MYSQLPORT
DB_USER=MYSQLUSER
DB_PASSWORD=MYSQLPASSWORD
DB_NAME=MYSQLDATABASE
```

Also configure a health check path:

```txt
/api/health
```

### 5. Generate the public domain

- Open the deployed app service.
- Go to `Settings -> Networking -> Public Networking`.
- Click `Generate Domain`.

### 6. Optional demo data

If you want seeded demo accounts in the Railway database, open a Railway shell or run a one-off command for:

```bash
npm run seed:demo
```

## Render deployment

Render can deploy this repo from Docker, and this repo now includes a root `render.yaml`.

### 1. Prepare MySQL first

Choose one:

- use an external managed MySQL database
- deploy a MySQL private service on Render separately

Keep the final DB host, port, user, password, and database name ready.

### 2. Push the repo to GitHub

The `render.yaml` file should stay at the repo root.

### 3. Create the web service

- In Render, create a new Blueprint or Web Service from this repo.
- If using the Blueprint path, Render will read `render.yaml`.
- If using the dashboard manually, choose `Docker` as the runtime.

### 4. Set environment variables

If you deploy with `render.yaml`, Render will prompt for the `sync: false` variables.

Use:

```env
DB_HOST=your-mysql-host
DB_USER=your-mysql-user
DB_PASSWORD=your-mysql-password
DB_NAME=your-mysql-database
CLIENT_URL=https://your-service.onrender.com
ADMIN_PASSWORD=your-strong-password
```

The fixed values are already defined in `render.yaml`:

- `PORT=10000`
- `DB_PORT=3306`
- `DB_SSL=false`
- `DB_CONNECTION_LIMIT=10`
- `ADMIN_EMAIL=admin@gmail.com`

### 5. Verify the health check

Render should use:

```txt
/api/health
```

### 6. Optional demo data

After the first deploy, run:

```bash
npm run seed:demo
```

## Generic Docker deployment

If you want VPS or any Docker host:

```bash
docker build -t school-management-system .
docker run -p 5000:5000 -e PORT=5000 -e DB_HOST=your-mysql-host -e DB_PORT=3306 -e DB_USER=your-mysql-user -e DB_PASSWORD=your-mysql-password -e DB_NAME=your-mysql-database -e DB_SSL=false -e CLIENT_URL=https://your-live-domain.com -e ADMIN_EMAIL=admin@gmail.com -e ADMIN_PASSWORD=1234 school-management-system
```
