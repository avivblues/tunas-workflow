export type AppFormFieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'domain-picker'
  | 'asset-picker'
  | 'datetime';

export interface AppFormField {
  key: string;
  label: string;
  type: AppFormFieldType;
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  domainType?: 'LOCATION' | 'ZONE' | 'DEPARTMENT';
  assetCategory?: 'FIXED_ASSET' | 'SPAREPART' | 'TOOL';
  usageType?: 'AFFECTED' | 'SPAREPART' | 'TOOL';
}

export interface AppUiConfig {
  appCode: string;
  label: string;
  icon: string;
  listPath: string;
  createPath: string;
  dashboardPath: string;
  reportPath?: string;
  mapPath?: string;
  itemLabel: string;
  createTitle: string;
  createSubtitle: string;
  fields: AppFormField[];
  /** Derive domain_code from selected asset's locationCode when not picked manually */
  autoDomainFromAsset?: boolean;
}

export const APP_UI_CONFIG: Record<string, AppUiConfig> = {
  IT_SUPPORT: {
    appCode: 'IT_SUPPORT',
    label: 'IT Support',
    icon: '💻',
    listPath: '/it-support/tickets',
    createPath: '/it-support/create',
    dashboardPath: '/it-support/dashboard',
    reportPath: '/it-support/reports',
    itemLabel: 'Ticket',
    createTitle: 'Create IT Support Ticket',
    createSubtitle: 'Submit incident or service request — select affected asset',
    autoDomainFromAsset: true,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Server HDD failure' },
      {
        key: 'affected_asset',
        label: 'Affected Asset',
        type: 'asset-picker',
        assetCategory: 'FIXED_ASSET',
        usageType: 'AFFECTED',
        required: true,
      },
      {
        key: 'description',
        label: 'Description',
        type: 'textarea',
        required: true,
        placeholder: 'Describe the problem...',
      },
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        options: [
          { value: 'INCIDENT', label: 'Incident' },
          { value: 'SERVICE_REQUEST', label: 'Service Request' },
        ],
      },
    ],
  },
  ENG_WO: {
    appCode: 'ENG_WO',
    label: 'Engineering WO',
    icon: '🔧',
    listPath: '/engineering/work-orders',
    createPath: '/engineering/create',
    dashboardPath: '/engineering/dashboard',
    reportPath: '/engineering/reports',
    itemLabel: 'Work Order',
    createTitle: 'Create Engineering Work Order',
    createSubtitle: 'Corrective or breakdown maintenance — select machine/asset',
    autoDomainFromAsset: true,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Machine breakdown' },
      {
        key: 'affected_asset',
        label: 'Machine / Asset',
        type: 'asset-picker',
        assetCategory: 'FIXED_ASSET',
        usageType: 'AFFECTED',
        required: true,
      },
      {
        key: 'problem',
        label: 'Problem Description',
        type: 'textarea',
        required: true,
        placeholder: 'Describe breakdown...',
      },
      {
        key: 'breakdown_type',
        label: 'Type',
        type: 'select',
        options: [
          { value: 'CORRECTIVE', label: 'Corrective' },
          { value: 'BREAKDOWN', label: 'Breakdown' },
        ],
      },
    ],
  },
  ENG_PM: {
    appCode: 'ENG_PM',
    label: 'Preventive Maintenance',
    icon: '📅',
    listPath: '/engineering/pm',
    createPath: '/engineering/pm-schedules',
    dashboardPath: '/engineering/dashboard',
    reportPath: '/engineering/pm-reports',
    itemLabel: 'PM Task',
    createTitle: 'PM Schedule',
    createSubtitle: 'Scheduled via PM Schedules page',
    autoDomainFromAsset: true,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      {
        key: 'affected_asset',
        label: 'Asset',
        type: 'asset-picker',
        assetCategory: 'FIXED_ASSET',
        usageType: 'AFFECTED',
        required: true,
      },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  ISP_TICKET: {
    appCode: 'ISP_TICKET',
    label: 'ISP Ticketing',
    icon: '📡',
    listPath: '/isp/tickets',
    createPath: '/isp/create',
    dashboardPath: '/isp/dashboard',
    reportPath: '/isp/reports',
    mapPath: '/isp/map',
    itemLabel: 'Ticket',
    createTitle: 'Create ISP Ticket',
    createSubtitle: 'Customer complaint — select area/cluster and device',
    fields: [
      { key: 'title', label: 'Subject', type: 'text', required: true },
      { key: 'customer_name', label: 'Customer Name', type: 'text', required: true },
      { key: 'customer_id', label: 'Customer ID', type: 'text', placeholder: 'CUST-10023' },
      {
        key: 'area',
        label: 'Area / Cluster',
        type: 'domain-picker',
        domainType: 'LOCATION',
        required: true,
      },
      {
        key: 'device',
        label: 'Device (ONT/OLT)',
        type: 'asset-picker',
        assetCategory: 'SPAREPART',
        usageType: 'AFFECTED',
      },
      {
        key: 'complaint',
        label: 'Complaint Detail',
        type: 'textarea',
        required: true,
      },
    ],
  },
  GA_SUPPORT: {
    appCode: 'GA_SUPPORT',
    label: 'GA Support',
    icon: '🏢',
    listPath: '/ga/requests',
    createPath: '/ga/create',
    dashboardPath: '/ga/dashboard',
    reportPath: '/ga/reports',
    itemLabel: 'Request',
    createTitle: 'Create GA Request',
    createSubtitle: 'Facility request — select building/room location',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'AC tidak dingin' },
      {
        key: 'location',
        label: 'Location (Building / Room)',
        type: 'domain-picker',
        domainType: 'ZONE',
        required: true,
      },
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        required: true,
        options: [
          { value: 'FACILITY', label: 'Facility' },
          { value: 'FURNITURE', label: 'Furniture' },
          { value: 'CLEANING', label: 'Cleaning' },
          { value: 'OTHER', label: 'Other' },
        ],
      },
      {
        key: 'affected_asset',
        label: 'Related Equipment (optional)',
        type: 'asset-picker',
        assetCategory: 'FIXED_ASSET',
        usageType: 'AFFECTED',
      },
      {
        key: 'description',
        label: 'Description',
        type: 'textarea',
        required: true,
        placeholder: 'Describe the facility issue...',
      },
    ],
  },
  VEHICLE_BOOKING: {
    appCode: 'VEHICLE_BOOKING',
    label: 'Vehicle Booking',
    icon: '🚗',
    listPath: '/vehicle/bookings',
    createPath: '/vehicle/create',
    dashboardPath: '/vehicle/dashboard',
    reportPath: '/vehicle/reports',
    itemLabel: 'Booking',
    createTitle: 'Book a Vehicle',
    createSubtitle: 'Request company vehicle for business trip — manager approval required',
    fields: [
      {
        key: 'title',
        label: 'Trip Purpose',
        type: 'text',
        required: true,
        placeholder: 'Kunjungan customer Bandung',
      },
      {
        key: 'destination',
        label: 'Destination',
        type: 'text',
        required: true,
        placeholder: 'Bandung',
      },
      {
        key: 'pickup_location',
        label: 'Pickup Location',
        type: 'domain-picker',
        domainType: 'LOCATION',
        required: true,
      },
      {
        key: 'start_datetime',
        label: 'Start Date & Time',
        type: 'datetime',
        required: true,
      },
      {
        key: 'end_datetime',
        label: 'End Date & Time',
        type: 'datetime',
        required: true,
      },
      {
        key: 'passengers',
        label: 'Passengers',
        type: 'select',
        required: true,
        options: [
          { value: '1', label: '1 person' },
          { value: '2', label: '2 people' },
          { value: '3', label: '3 people' },
          { value: '4', label: '4 people' },
          { value: '5', label: '5+ people' },
        ],
      },
      {
        key: 'vehicle',
        label: 'Preferred Vehicle (optional)',
        type: 'asset-picker',
        placeholder: 'Select if you have preference',
      },
      {
        key: 'notes',
        label: 'Additional Notes',
        type: 'textarea',
        placeholder: 'Driver needed, cargo details, etc.',
      },
    ],
  },
  BUILDING_MGMT: {
    appCode: 'BUILDING_MGMT',
    label: 'Building Management',
    icon: '🏗️',
    listPath: '/building/issues',
    createPath: '/building/create',
    dashboardPath: '/building/dashboard',
    reportPath: '/building/reports',
    itemLabel: 'Issue',
    createTitle: 'Report Building Issue',
    createSubtitle: 'Lift, HVAC, electrical, plumbing, and building utilities',
    fields: [
      {
        key: 'title',
        label: 'Issue Title',
        type: 'text',
        required: true,
        placeholder: 'Lift berhenti di lantai 3',
      },
      {
        key: 'issue_type',
        label: 'Issue Type',
        type: 'select',
        required: true,
        options: [
          { value: 'LIFT', label: 'Lift / Elevator' },
          { value: 'HVAC', label: 'HVAC / AC' },
          { value: 'ELECTRICAL', label: 'Electrical' },
          { value: 'PLUMBING', label: 'Plumbing' },
          { value: 'FIRE_SAFETY', label: 'Fire Safety' },
          { value: 'UTILITY', label: 'Utility / Genset' },
          { value: 'OTHER', label: 'Other' },
        ],
      },
      {
        key: 'urgency',
        label: 'Urgency',
        type: 'select',
        required: true,
        options: [
          { value: 'NORMAL', label: 'Normal' },
          { value: 'URGENT', label: 'Urgent' },
          { value: 'EMERGENCY', label: 'Emergency' },
        ],
      },
      {
        key: 'location',
        label: 'Building / Floor / Zone',
        type: 'domain-picker',
        domainType: 'ZONE',
        required: true,
      },
      {
        key: 'affected_asset',
        label: 'Building Asset (optional)',
        type: 'asset-picker',
        assetCategory: 'FIXED_ASSET',
        usageType: 'AFFECTED',
        placeholder: 'Lift, genset, etc.',
      },
      {
        key: 'description',
        label: 'Description',
        type: 'textarea',
        required: true,
        placeholder: 'Detail kondisi dan dampak...',
      },
    ],
  },
};

export const DEMO_APP_CODES = [
  'IT_SUPPORT',
  'ENG_WO',
  'ENG_PM',
  'ISP_TICKET',
  'GA_SUPPORT',
  'VEHICLE_BOOKING',
  'BUILDING_MGMT',
] as const;

export function getAppIcon(appCode: string, icon?: string | null): string {
  const map: Record<string, string> = {
    monitor: '💻',
    wrench: '🔧',
    wifi: '📡',
    building: '🏢',
    IT_SUPPORT: '💻',
    ENG_WO: '🔧',
    ENG_PM: '📅',
    ISP_TICKET: '📡',
    GA_SUPPORT: '🏢',
    VEHICLE_BOOKING: '🚗',
    BUILDING_MGMT: '🏗️',
    car: '🚗',
  };
  return map[icon ?? ''] ?? map[appCode] ?? APP_UI_CONFIG[appCode]?.icon ?? '📋';
}
