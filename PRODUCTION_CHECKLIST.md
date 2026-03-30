# Production Checklist

Use this after every live deployment.

## Credentials

- rotate the software owner password in Railway
- rotate any demo school admin, teacher, parent, and student passwords in the live database
- never store live passwords in the repository

## Vercel

- use one primary production domain for the frontend
- avoid testing critical flows from random preview URLs
- if you add a new production domain, update backend `CLIENT_URL` to allow it

## Railway

- confirm the backend service is using the intended MySQL database
- verify `CLIENT_URL` includes the active frontend production domain
- redeploy or restart the backend after changing auth or database variables

## Smoke Test

- software owner login
- school admin login
- teacher login
- parent login
- student login
- schools list
- students list
- attendance and marks reports
- one fee payment flow
- one admission submission flow

## Data Safety

- keep a fresh SQL export before major database imports
- import production data into a separate database first when possible
- switch the app only after verifying row counts and sample records
