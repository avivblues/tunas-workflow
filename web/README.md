# Web

React web application using TypeScript, Vite, and Atomic Design.

## Structure

```
src/
├── components/
│   ├── atoms/       # Button, Input, Badge, Status
│   ├── molecules/   # TicketCard, AssetSelector, SLAIndicator
│   ├── organisms/   # WorkOrderTable, TechnicianPanel
│   └── templates/   # DashboardLayout, WorkOrderLayout
├── pages/
│   ├── ITSupport/
│   ├── Engineering/
│   ├── ISP/
│   ├── GA/
│   └── Vehicle/
├── services/        # transaction.service.ts, asset.service.ts
└── types/
```

## Rules

- **Components** must be reusable across all apps
- **Pages** can be application-specific
- All pages consume the Transaction API with `app_code`
- Do not duplicate components — check `atoms/` and `molecules/` first

## Commands

```bash
npm run dev        # Start Vite dev server (port 5173)
npm run build      # Production build
npm run preview    # Preview production build
```

## Environment

Set `VITE_API_BASE_URL` in `.env` (see root `.env.example`).
