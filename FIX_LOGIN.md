# LOGIN FIX - FOLLOW THESE STEPS

## Problem
Login nahi ho raha because Railway pe purana code hai.

## Step 1: Terminal mein ye commands run karo

```bash
cd "c:\Users\rahul\OneDrive\Desktop\school management system"
git add .
git commit -m "Fix CORS and add debug endpoints"
git push origin main
```

(Agar `main` nahi hai toh `master` try karo)

## Step 2: Railway Redeploy

Railway automatically redeploy karega push ke baad. 2-3 minute wait karo.

## Step 3: Debug Check

Browser mein ye URL open karo:
```
https://school-management-system-production-708f.up.railway.app/debug-config
```

Ye show karega:
- `adminEmail` - kya email set hai
- `adminPasswordLength` - password kitne characters ka hai

## Step 4: Vercel Redeploy

1. Vercel Dashboard open karo
2. Project select karo
3. Deployments tab
4. "Redeploy" button click karo
5. 2-3 minute wait karo

## Step 5: Test Login

1. https://www.rahulschool.me/admin-login
2. Dropdown: "Software Owner"
3. Email aur Password wahi dalo jo `/debug-config` ne show kiya
4. Login click karo

## Important Notes

- Railway pe `ADMIN_EMAIL` aur `ADMIN_PASSWORD` environment variables set hain
- Jo bhi values wahan set hain, wohi login mein use karo
- Default values: email=admin@gmail.com, password=1234
- Agar Railway pe different values set hain, toh wo override karenge

## Quick Railway Fix (if needed)

Railway dashboard mein:
1. Variables tab kholol
2. `ADMIN_EMAIL` = `admin@gmail.com`
3. `ADMIN_PASSWORD` = `1234`
4. Save karo
5. Redeploy hoga automatically
