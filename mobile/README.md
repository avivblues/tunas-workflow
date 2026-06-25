# Tunas Workflow — Mobile Shell

React Native (Expo) shell app with dynamic menu from `GET /api/apps`.

## Features

- Login with tenant code + JWT
- Dynamic app menu from backend
- Common transaction list & detail screens
- ISP Ticket Map (react-native-maps) — lazy-loaded when opening ISP_TICKET

## Quick Start

```bash
cd mobile
npm install
npm start
```

Set API URL (optional, defaults to production demo):

```bash
export EXPO_PUBLIC_API_BASE_URL=http://103.94.238.207:3050/api
```

## Demo Credentials

- Tenant: `01`
- Admin: `admin` / `admin123`

## Screens

| Screen | Path |
|--------|------|
| Login | `src/screens/Common/LoginScreen.tsx` |
| App Menu | `src/screens/Common/AppMenuScreen.tsx` |
| Transaction List | `src/screens/Common/TransactionListScreen.tsx` |
| Transaction Detail | `src/screens/Common/TransactionDetailScreen.tsx` |
| ISP Map | `src/screens/ISP/MapScreen.tsx` |

## API Endpoints

```
POST /api/auth/login
GET  /api/apps
GET  /api/transaction?app_code=...
GET  /api/transaction/:id
GET  /api/domain?type=LOCATION
```
