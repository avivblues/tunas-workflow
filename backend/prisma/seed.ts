import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedAppConfig, seedSampleTransaction, seedAppMenus } from './seed-helpers.js';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

const APP_CONFIGS = [
  {
    appCode: 'IT_SUPPORT',
    name: 'IT Helpdesk',
    icon: 'monitor',
    dashboard: 'ITDashboard',
    processes: [
      { processCode: 'REQUEST', name: 'Request', sequence: 1 },
      { processCode: 'ASSIGN', name: 'Assign', sequence: 2 },
      { processCode: 'WORKING', name: 'Working', sequence: 3 },
      { processCode: 'DONE', name: 'Done', sequence: 4 },
      { processCode: 'CLOSE', name: 'Close', sequence: 5, isFinal: true },
    ],
    routing: [
      { fromProcess: 'REQUEST', toProcess: 'ASSIGN', roleCode: 'MANAGER' },
      { fromProcess: 'ASSIGN', toProcess: 'WORKING' },
      { fromProcess: 'WORKING', toProcess: 'DONE' },
      { fromProcess: 'DONE', toProcess: 'CLOSE' },
    ],
  },
  {
    appCode: 'ENG_WO',
    name: 'Engineering Work Order',
    icon: 'wrench',
    dashboard: 'EngDashboard',
    processes: [
      { processCode: 'REQUEST', name: 'Request', sequence: 1 },
      { processCode: 'APPROVAL', name: 'Approval', sequence: 2 },
      { processCode: 'SCHEDULE', name: 'Schedule', sequence: 3 },
      { processCode: 'EXECUTE', name: 'Execute', sequence: 4 },
      { processCode: 'VERIFY', name: 'Verify', sequence: 5 },
      { processCode: 'CLOSE', name: 'Close', sequence: 6, isFinal: true },
    ],
    routing: [
      { fromProcess: 'REQUEST', toProcess: 'APPROVAL', roleCode: 'MANAGER' },
      { fromProcess: 'APPROVAL', toProcess: 'SCHEDULE' },
      { fromProcess: 'SCHEDULE', toProcess: 'EXECUTE' },
      { fromProcess: 'EXECUTE', toProcess: 'VERIFY' },
      { fromProcess: 'VERIFY', toProcess: 'CLOSE' },
    ],
  },
  {
    appCode: 'ENG_PM',
    name: 'Preventive Maintenance',
    icon: 'calendar',
    dashboard: 'PmDashboard',
    processes: [
      { processCode: 'SCHEDULED', name: 'Scheduled', sequence: 1 },
      { processCode: 'EXECUTE', name: 'Execute', sequence: 2 },
      { processCode: 'CHECKLIST', name: 'Checklist', sequence: 3 },
      { processCode: 'VERIFY', name: 'Verify', sequence: 4 },
      { processCode: 'CLOSE', name: 'Close', sequence: 5, isFinal: true },
    ],
    routing: [
      { fromProcess: 'SCHEDULED', toProcess: 'EXECUTE' },
      { fromProcess: 'EXECUTE', toProcess: 'CHECKLIST' },
      { fromProcess: 'CHECKLIST', toProcess: 'VERIFY' },
      { fromProcess: 'VERIFY', toProcess: 'CLOSE' },
    ],
  },
  {
    appCode: 'ISP_TICKET',
    name: 'ISP Ticketing',
    icon: 'wifi',
    dashboard: 'ISPDashboard',
    processes: [
      { processCode: 'REQUEST', name: 'Complaint', sequence: 1 },
      { processCode: 'ASSIGN', name: 'Assign', sequence: 2 },
      { processCode: 'DISPATCH', name: 'Dispatch', sequence: 3 },
      { processCode: 'WORKING', name: 'Field Work', sequence: 4 },
      { processCode: 'RESOLVED', name: 'Resolved', sequence: 5 },
      { processCode: 'CLOSE', name: 'Close', sequence: 6, isFinal: true },
    ],
    routing: [
      { fromProcess: 'REQUEST', toProcess: 'ASSIGN', roleCode: 'MANAGER' },
      { fromProcess: 'ASSIGN', toProcess: 'DISPATCH' },
      { fromProcess: 'DISPATCH', toProcess: 'WORKING' },
      { fromProcess: 'WORKING', toProcess: 'RESOLVED' },
      { fromProcess: 'RESOLVED', toProcess: 'CLOSE' },
    ],
  },
  {
    appCode: 'GA_SUPPORT',
    name: 'GA Support',
    icon: 'building',
    dashboard: 'GADashboard',
    processes: [
      { processCode: 'REQUEST', name: 'Request', sequence: 1 },
      { processCode: 'ASSIGN', name: 'Assign', sequence: 2 },
      { processCode: 'WORKING', name: 'Working', sequence: 3 },
      { processCode: 'RESOLVED', name: 'Resolved', sequence: 4 },
      { processCode: 'CLOSE', name: 'Close', sequence: 5, isFinal: true },
    ],
    routing: [
      { fromProcess: 'REQUEST', toProcess: 'ASSIGN', roleCode: 'MANAGER' },
      { fromProcess: 'ASSIGN', toProcess: 'WORKING' },
      { fromProcess: 'WORKING', toProcess: 'RESOLVED' },
      { fromProcess: 'RESOLVED', toProcess: 'CLOSE' },
    ],
  },
  {
    appCode: 'VEHICLE_BOOKING',
    name: 'Vehicle Booking',
    icon: 'car',
    dashboard: 'VehicleDashboard',
    processes: [
      { processCode: 'REQUEST', name: 'Request', sequence: 1 },
      { processCode: 'APPROVAL', name: 'Approval', sequence: 2 },
      { processCode: 'ASSIGN', name: 'Assign Vehicle', sequence: 3 },
      { processCode: 'ACTIVE', name: 'In Use', sequence: 4 },
      { processCode: 'RETURN', name: 'Return', sequence: 5 },
      { processCode: 'CLOSE', name: 'Close', sequence: 6, isFinal: true },
    ],
    routing: [
      { fromProcess: 'REQUEST', toProcess: 'APPROVAL', roleCode: 'MANAGER' },
      { fromProcess: 'APPROVAL', toProcess: 'ASSIGN' },
      { fromProcess: 'ASSIGN', toProcess: 'ACTIVE' },
      { fromProcess: 'ACTIVE', toProcess: 'RETURN' },
      { fromProcess: 'RETURN', toProcess: 'CLOSE' },
    ],
  },
  {
    appCode: 'BUILDING_MGMT',
    name: 'Building Management',
    icon: 'building',
    dashboard: 'BuildingDashboard',
    processes: [
      { processCode: 'REQUEST', name: 'Report Issue', sequence: 1 },
      { processCode: 'TRIAGE', name: 'Triage', sequence: 2 },
      { processCode: 'ASSIGN', name: 'Assign', sequence: 3 },
      { processCode: 'WORKING', name: 'Repair', sequence: 4 },
      { processCode: 'INSPECTION', name: 'Inspection', sequence: 5 },
      { processCode: 'CLOSE', name: 'Close', sequence: 6, isFinal: true },
    ],
    routing: [
      { fromProcess: 'REQUEST', toProcess: 'TRIAGE', roleCode: 'MANAGER' },
      { fromProcess: 'TRIAGE', toProcess: 'ASSIGN' },
      { fromProcess: 'ASSIGN', toProcess: 'WORKING' },
      { fromProcess: 'WORKING', toProcess: 'INSPECTION' },
      { fromProcess: 'INSPECTION', toProcess: 'CLOSE' },
    ],
  },
];

async function main() {
  console.log('Seeding Tunas Workflow demo data...');

  const tenant = await prisma.tenant.upsert({
    where: { code: '01' },
    update: {},
    create: { code: '01', name: 'PT Contoh Industries', active: true },
  });

  const roles = await Promise.all(
    [
      { code: 'TENANT_ADMIN', name: 'Tenant Administrator' },
      { code: 'MANAGER', name: 'Manager' },
      { code: 'TECHNICIAN', name: 'Technician' },
      { code: 'REQUESTER', name: 'Requester' },
    ].map((r) =>
      prisma.role.upsert({
        where: { tenantId_code: { tenantId: tenant.id, code: r.code } },
        update: {},
        create: { tenantId: tenant.id, code: r.code, name: r.name },
      }),
    ),
  );

  const roleMap = Object.fromEntries(roles.map((r) => [r.code, r]));

  const factoryJababeka = await prisma.domainNode.upsert({
    where: { tenantId_domainCode: { tenantId: tenant.id, domainCode: '01.L01' } },
    update: {},
    create: {
      tenantId: tenant.id,
      domainCode: '01.L01',
      name: 'Factory Jababeka',
      type: 'LOCATION',
    },
  });

  await prisma.domainNode.upsert({
    where: { tenantId_domainCode: { tenantId: tenant.id, domainCode: '01.L01.Z01' } },
    update: {},
    create: {
      tenantId: tenant.id,
      parentId: factoryJababeka.id,
      domainCode: '01.L01.Z01',
      name: 'Production Line Alpha',
      type: 'ZONE',
    },
  });

  const officeBuilding = await prisma.domainNode.upsert({
    where: { tenantId_domainCode: { tenantId: tenant.id, domainCode: '01.L02' } },
    update: { name: 'Gedung Kantor Pusat' },
    create: {
      tenantId: tenant.id,
      domainCode: '01.L02',
      name: 'Gedung Kantor Pusat',
      type: 'LOCATION',
    },
  });

  await prisma.domainNode.upsert({
    where: { tenantId_domainCode: { tenantId: tenant.id, domainCode: '01.L02.Z01' } },
    update: {},
    create: {
      tenantId: tenant.id,
      parentId: officeBuilding.id,
      domainCode: '01.L02.Z01',
      name: 'Lantai 1 - Lobby & Reception',
      type: 'ZONE',
    },
  });

  await prisma.domainNode.upsert({
    where: { tenantId_domainCode: { tenantId: tenant.id, domainCode: '01.L02.Z02' } },
    update: {},
    create: {
      tenantId: tenant.id,
      parentId: officeBuilding.id,
      domainCode: '01.L02.Z02',
      name: 'Lantai 2 - Ruang Meeting',
      type: 'ZONE',
    },
  });

  await prisma.domainNode.upsert({
    where: { tenantId_domainCode: { tenantId: tenant.id, domainCode: '01.L02.Z03' } },
    update: {},
    create: {
      tenantId: tenant.id,
      parentId: officeBuilding.id,
      domainCode: '01.L02.Z03',
      name: 'Lantai 3 - HR & GA',
      type: 'ZONE',
    },
  });

  await prisma.domainNode.upsert({
    where: { tenantId_domainCode: { tenantId: tenant.id, domainCode: '01.ISP01' } },
    update: { latitude: -6.2615, longitude: 106.8106 },
    create: {
      tenantId: tenant.id,
      domainCode: '01.ISP01',
      name: 'Cluster Green Residence',
      type: 'LOCATION',
      latitude: -6.2615,
      longitude: 106.8106,
    },
  });

  await prisma.domainNode.upsert({
    where: { tenantId_domainCode: { tenantId: tenant.id, domainCode: '01.ISP02' } },
    update: { latitude: -6.1754, longitude: 106.8272 },
    create: {
      tenantId: tenant.id,
      domainCode: '01.ISP02',
      name: 'Cluster Blue Park',
      type: 'LOCATION',
      latitude: -6.1754,
      longitude: 106.8272,
    },
  });

  await prisma.domainNode.upsert({
    where: { tenantId_domainCode: { tenantId: tenant.id, domainCode: '01.ISP03' } },
    update: { latitude: -6.2941, longitude: 107.1573 },
    create: {
      tenantId: tenant.id,
      domainCode: '01.ISP03',
      name: 'Industrial Zone Cikarang',
      type: 'LOCATION',
      latitude: -6.2941,
      longitude: 107.1573,
    },
  });

  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: 'admin' } },
    update: { password: adminPassword },
    create: {
      tenantId: tenant.id,
      username: 'admin',
      password: adminPassword,
      fullName: 'Administrator',
      email: 'admin@contoh.com',
      roleId: roleMap.TENANT_ADMIN.id,
      active: true,
    },
  });

  await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: 'manager' } },
    update: { password: await hashPassword('manager123') },
    create: {
      tenantId: tenant.id,
      username: 'manager',
      password: await hashPassword('manager123'),
      fullName: 'Budi Manager',
      email: 'manager@contoh.com',
      roleId: roleMap.MANAGER.id,
      active: true,
    },
  });

  await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: 'tech' } },
    update: { password: await hashPassword('tech123') },
    create: {
      tenantId: tenant.id,
      username: 'tech',
      password: await hashPassword('tech123'),
      fullName: 'Anton Teknisi',
      email: 'tech@contoh.com',
      roleId: roleMap.TECHNICIAN.id,
      active: true,
    },
  });

  const techUser = await prisma.user.findUnique({
    where: { tenantId_username: { tenantId: tenant.id, username: 'tech' } },
  });

  for (const config of APP_CONFIGS) {
    await seedAppConfig(prisma, tenant.id, config);
  }

  const demoAssets = [
    {
      assetCode: 'SERVER-01',
      name: 'Production Server 01',
      category: 'FIXED_ASSET',
      locationCode: '01.L01',
    },
    {
      assetCode: 'CNC-ALPHA-01',
      name: 'CNC Machine Alpha',
      category: 'FIXED_ASSET',
      locationCode: '01.L01.Z01',
    },
    {
      assetCode: 'HDD-2TB',
      name: 'HDD 2TB Enterprise',
      category: 'SPAREPART',
      locationCode: '01.L01',
    },
    {
      assetCode: 'ONT-GPON',
      name: 'ONT GPON Unit',
      category: 'SPAREPART',
      locationCode: '01.ISP01',
    },
    {
      assetCode: 'PATHCORE-TOOL',
      name: 'Pathcore Fusion Splicer',
      category: 'TOOL',
      locationCode: '01.ISP01',
    },
    {
      assetCode: 'AC-UNIT-12',
      name: 'AC Split 2PK - Meeting Room',
      category: 'FIXED_ASSET',
      locationCode: '01.L02.Z02',
    },
    {
      assetCode: 'VEH-AVANZA-01',
      name: 'Toyota Avanza — B 1234 ABC',
      category: 'FIXED_ASSET',
      locationCode: '01.L02',
    },
    {
      assetCode: 'VEH-HINO-01',
      name: 'Hino Truck — B 5678 XYZ',
      category: 'FIXED_ASSET',
      locationCode: '01.L02',
    },
    {
      assetCode: 'LIFT-BLDG-A',
      name: 'Passenger Lift Tower A',
      category: 'FIXED_ASSET',
      locationCode: '01.L02',
    },
    {
      assetCode: 'GENSET-01',
      name: 'Genset 500kVA Basement',
      category: 'FIXED_ASSET',
      locationCode: '01.L02',
    },
    {
      assetCode: 'TUNAS-POWER',
      name: 'Tunas Power Monitor — Multi Sensor',
      category: 'FIXED_ASSET',
      locationCode: '01.L01.Z01',
    },
  ];

  for (const a of demoAssets) {
    await prisma.asset.upsert({
      where: { tenantId_assetCode: { tenantId: tenant.id, assetCode: a.assetCode } },
      update: { locationCode: a.locationCode },
      create: {
        tenantId: tenant.id,
        assetCode: a.assetCode,
        name: a.name,
        category: a.category,
        status: 'ACTIVE',
        locationCode: a.locationCode,
      },
    });
  }

  await seedSampleTransaction(
    prisma,
    tenant.id,
    'IT_SUPPORT',
    admin.id,
    'TW-DEMO-IT01',
    {
      title: 'Server HDD Failure',
      description: 'SERVER-01 harddisk error detected, need replacement',
      category: 'INCIDENT',
      affected_asset: 'SERVER-01',
    },
    {
      domainCode: '01.L01',
      assetLinks: [{ assetCode: 'SERVER-01', usageType: 'AFFECTED' }],
    },
  );

  await seedSampleTransaction(
    prisma,
    tenant.id,
    'ENG_WO',
    admin.id,
    'TW-DEMO-ENG01',
    {
      title: 'Machine Breakdown - Line Alpha',
      problem: 'Spindle motor overheating, production stopped',
      breakdown_type: 'CORRECTIVE',
      affected_asset: 'CNC-ALPHA-01',
    },
    {
      domainCode: '01.L01.Z01',
      assetLinks: [{ assetCode: 'CNC-ALPHA-01', usageType: 'AFFECTED' }],
    },
  );

  await seedSampleTransaction(
    prisma,
    tenant.id,
    'ISP_TICKET',
    admin.id,
    'TW-DEMO-ISP01',
    {
      title: 'Internet lambat - Pelanggan A',
      customer_name: 'PT Maju Jaya',
      customer_id: 'CUST-10023',
      area: 'Cluster Green Residence',
      complaint: 'Koneksi putus-nyambung sejak pagi',
      device: 'ONT-GPON',
    },
    {
      priority: 'HIGH',
      domainCode: '01.ISP01',
      assetLinks: [{ assetCode: 'ONT-GPON', usageType: 'AFFECTED' }],
    },
  );

  await seedSampleTransaction(
    prisma,
    tenant.id,
    'ISP_TICKET',
    admin.id,
    'TW-DEMO-ISP02',
    {
      title: 'No signal - Pelanggan B',
      customer_name: 'CV Berkah Net',
      customer_id: 'CUST-20456',
      area: 'Cluster Blue Park',
      complaint: 'ONT LOS merah sejak kemarin malam',
      device: 'ONT-GPON',
    },
    {
      currentProcess: 'ASSIGN',
      priority: 'HIGH',
      domainCode: '01.ISP02',
      assetLinks: [{ assetCode: 'ONT-GPON', usageType: 'AFFECTED' }],
    },
  );

  await seedSampleTransaction(
    prisma,
    tenant.id,
    'GA_SUPPORT',
    admin.id,
    'TW-DEMO-GA01',
    {
      title: 'AC Ruang Meeting tidak dingin',
      category: 'FACILITY',
      description: 'Suhu ruang meeting lt.2 terasa hangat sejak siang',
      location: 'Lantai 2 - Ruang Meeting',
    },
    {
      domainCode: '01.L02.Z02',
      assetLinks: [{ assetCode: 'AC-UNIT-12', usageType: 'AFFECTED' }],
    },
  );

  await seedSampleTransaction(
    prisma,
    tenant.id,
    'VEHICLE_BOOKING',
    admin.id,
    'TW-DEMO-VH01',
    {
      title: 'Kunjungan customer Bekasi',
      destination: 'Bekasi Industrial Estate',
      pickup_location: 'Gedung Kantor Pusat',
      start_datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      end_datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
      passengers: '3',
      vehicle: 'VEH-AVANZA-01',
      notes: 'Perlu driver',
    },
    {
      currentProcess: 'APPROVAL',
      domainCode: '01.L02',
      assetLinks: [{ assetCode: 'VEH-AVANZA-01', usageType: 'AFFECTED' }],
    },
  );

  await seedSampleTransaction(
    prisma,
    tenant.id,
    'BUILDING_MGMT',
    admin.id,
    'TW-DEMO-BM01',
    {
      title: 'Lift Tower A berhenti di lantai 3',
      issue_type: 'LIFT',
      urgency: 'URGENT',
      location: 'Gedung Kantor Pusat - Lobby',
      description: 'Lift passenger tidak bergerak, penumpang terjebak sudah dievakuasi manual',
    },
    {
      currentProcess: 'TRIAGE',
      domainCode: '01.L02',
      priority: 'HIGH',
      assetLinks: [{ assetCode: 'LIFT-BLDG-A', usageType: 'AFFECTED' }],
    },
  );

  const cncAsset = await prisma.asset.findUnique({
    where: { tenantId_assetCode: { tenantId: tenant.id, assetCode: 'CNC-ALPHA-01' } },
  });
  const serverAsset = await prisma.asset.findUnique({
    where: { tenantId_assetCode: { tenantId: tenant.id, assetCode: 'SERVER-01' } },
  });

  const pmSchedules = [
    {
      title: 'PM Monthly - CNC Alpha',
      description: 'Rutin inspeksi CNC Production Line Alpha',
      assetId: cncAsset?.id,
      domainCode: '01.L01.Z01',
      frequency: 'MONTHLY',
      nextRunAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      checklist: [
        'Check spindle lubrication',
        'Inspect coolant level',
        'Clean machine surface',
        'Test emergency stop',
      ],
    },
    {
      title: 'PM Quarterly - Server Room',
      description: 'Quarterly server room inspection',
      assetId: serverAsset?.id,
      domainCode: '01.L01',
      frequency: 'QUARTERLY',
      nextRunAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      checklist: ['Check UPS status', 'Verify temperature & humidity', 'Dust cleaning'],
    },
  ];

  for (const pm of pmSchedules) {
    const existing = await prisma.pmSchedule.findFirst({
      where: { tenantId: tenant.id, title: pm.title },
    });
    if (!existing) {
      await prisma.pmSchedule.create({
        data: {
          tenantId: tenant.id,
          title: pm.title,
          description: pm.description,
          assetId: pm.assetId,
          domainCode: pm.domainCode,
          frequency: pm.frequency,
          nextRunAt: pm.nextRunAt,
          assignTo: techUser?.id,
          checklist: pm.checklist,
          active: true,
        },
      });
    }
  }

  await seedSampleTransaction(
    prisma,
    tenant.id,
    'ENG_PM',
    admin.id,
    'TW-DEMO-PM01',
    {
      title: 'PM Monthly - CNC Alpha',
      description: 'Demo preventive maintenance task',
      affected_asset: 'CNC-ALPHA-01',
      frequency: 'MONTHLY',
    },
    {
      currentProcess: 'SCHEDULED',
      domainCode: '01.L01.Z01',
      assetLinks: [{ assetCode: 'CNC-ALPHA-01', usageType: 'AFFECTED' }],
      extraDetails: {
        checklist: [
          { id: 'item-1', label: 'Check spindle lubrication', done: true },
          { id: 'item-2', label: 'Inspect coolant level', done: false },
          { id: 'item-3', label: 'Clean machine surface', done: false },
          { id: 'item-4', label: 'Test emergency stop', done: false },
        ],
      },
    },
  );

  const demoWebhookSecret = 'tunas-demo-webhook-secret-2024';
  const demoConnectors = [
    {
      name: 'ISP Billing Webhook',
      type: 'ISP',
      config: {
        webhook_secret: demoWebhookSecret,
        enabled_apps: ['ISP_TICKET', 'ENG_PM', 'GA_SUPPORT', 'VEHICLE_BOOKING'],
        callback_events: [
          'TICKET_CREATED',
          'TICKET_STATUS_CHANGED',
          'TICKET_CLOSED',
          'TICKET_LOG_ADDED',
        ],
      },
    },
    {
      name: 'Tunas IoT',
      type: 'IOT',
      config: {
        webhook_secret: demoWebhookSecret,
        tunasiot_base_url: 'https://app.tunasiot.com',
        mqtt_auto_wo_enabled: true,
        min_severity: 'CRITICAL',
        cooldown_minutes: 30,
      },
      mapping: {
        domain_links: [
          {
            domain_code: '01.L01.Z01',
            tunasiot_hierarchy: 'L01/Z01',
            enabled: true,
          },
          {
            domain_code: '01.L02.Z02',
            tunasiot_hierarchy: 'L02/Z02',
            enabled: true,
          },
        ],
        thresholds: [
          {
            id: 'temp-1-high',
            field: 'temperature_1',
            operator: 'gt',
            value: 45,
            severity: 'HIGH',
            title_template: 'High temperature sensor 1 — {asset_code}',
            enabled: false,
          },
          {
            id: 'humidity-1-high',
            field: 'humidity_1',
            operator: 'gt',
            value: 85,
            severity: 'MEDIUM',
            title_template: 'High humidity sensor 1 — {asset_code}',
            enabled: false,
          },
          {
            id: 'voltage-1-low',
            field: 'voltage_1',
            operator: 'lt',
            value: 200,
            severity: 'CRITICAL',
            title_template: 'Low voltage phase 1 — {asset_code}',
            enabled: true,
          },
        ],
      },
    },
  ];

  for (const connector of demoConnectors) {
    const existing = await prisma.connector.findFirst({
      where: { tenantId: tenant.id, type: connector.type },
    });
    if (!existing) {
      await prisma.connector.create({
        data: {
          tenantId: tenant.id,
          name: connector.name,
          type: connector.type,
          config: connector.config,
          mapping: 'mapping' in connector ? connector.mapping : undefined,
          active: true,
        },
      });
    }
  }

  await seedAppMenus(prisma, tenant.id);

  console.log('Seed complete — apps: IT_SUPPORT, ENG_WO, ENG_PM, ISP_TICKET, GA_SUPPORT, VEHICLE_BOOKING, BUILDING_MGMT');
  console.log('');
  console.log('Demo credentials:');
  console.log('  Tenant Code : 01');
  console.log('  Admin       : admin / admin123');
  console.log('  Manager     : manager / manager123');
  console.log('  Technician  : tech / tech123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
