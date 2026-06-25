# Backend

Node.js API server using Fastify, TypeScript, and Prisma.

## Structure

```
src/
├── api/routes/          # REST route handlers
├── config/              # Environment configuration
├── core/
│   ├── transaction/     # Transaction engine
│   ├── routing/         # app_routing resolution
│   ├── notification/
│   ├── scheduler/
│   ├── attachment/
│   └── sla/
├── master/
│   ├── tenant/
│   ├── user/
│   ├── asset/
│   └── organization/
├── integration/
│   ├── google/
│   ├── odoo/
│   ├── isp/
│   └── tunas-iot/
├── lib/                 # Shared utilities (Prisma client, etc.)
└── types/               # Shared TypeScript types
```

## Commands

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Compile TypeScript
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
```

## Database

Schema lives in `prisma/schema.prisma`. All apps share transaction tables — differentiated by `app_code`.
