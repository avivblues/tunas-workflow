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
  createTitle: string;
  createSubtitle: string;
  fields: AppFormField[];
  autoDomainFromAsset?: boolean;
}

export const APP_UI_CONFIG: Record<string, AppUiConfig> = {
  IT_SUPPORT: {
    appCode: 'IT_SUPPORT',
    label: 'IT Support',
    createTitle: 'Create IT Ticket',
    createSubtitle: 'Submit incident or service request',
    autoDomainFromAsset: true,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      {
        key: 'affected_asset',
        label: 'Affected Asset',
        type: 'asset-picker',
        assetCategory: 'FIXED_ASSET',
        usageType: 'AFFECTED',
        required: true,
      },
      { key: 'description', label: 'Description', type: 'textarea', required: true },
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
    createTitle: 'Create Work Order',
    createSubtitle: 'Breakdown or corrective maintenance',
    autoDomainFromAsset: true,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      {
        key: 'affected_asset',
        label: 'Machine / Asset',
        type: 'asset-picker',
        assetCategory: 'FIXED_ASSET',
        usageType: 'AFFECTED',
        required: true,
      },
      { key: 'problem', label: 'Problem', type: 'textarea', required: true },
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
  ISP_TICKET: {
    appCode: 'ISP_TICKET',
    label: 'ISP Ticket',
    createTitle: 'Create ISP Ticket',
    createSubtitle: 'Customer complaint',
    fields: [
      { key: 'title', label: 'Subject', type: 'text', required: true },
      { key: 'customer_name', label: 'Customer Name', type: 'text', required: true },
      { key: 'customer_id', label: 'Customer ID', type: 'text' },
      {
        key: 'area',
        label: 'Area / Cluster',
        type: 'domain-picker',
        domainType: 'LOCATION',
        required: true,
      },
      {
        key: 'device',
        label: 'Device',
        type: 'asset-picker',
        assetCategory: 'SPAREPART',
        usageType: 'AFFECTED',
      },
      { key: 'complaint', label: 'Complaint', type: 'textarea', required: true },
    ],
  },
  GA_SUPPORT: {
    appCode: 'GA_SUPPORT',
    label: 'GA Request',
    createTitle: 'Create GA Request',
    createSubtitle: 'Facility support request',
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      {
        key: 'location',
        label: 'Location',
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
      { key: 'description', label: 'Description', type: 'textarea', required: true },
    ],
  },
  VEHICLE_BOOKING: {
    appCode: 'VEHICLE_BOOKING',
    label: 'Vehicle Booking',
    createTitle: 'Book a Vehicle',
    createSubtitle: 'Request company vehicle',
    fields: [
      { key: 'title', label: 'Trip Purpose', type: 'text', required: true },
      { key: 'destination', label: 'Destination', type: 'text', required: true },
      {
        key: 'pickup_location',
        label: 'Pickup Location',
        type: 'domain-picker',
        domainType: 'LOCATION',
        required: true,
      },
      { key: 'start_datetime', label: 'Start (ISO)', type: 'datetime', required: true },
      { key: 'end_datetime', label: 'End (ISO)', type: 'datetime', required: true },
      {
        key: 'passengers',
        label: 'Passengers',
        type: 'select',
        required: true,
        options: [
          { value: '1', label: '1' },
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4', label: '4' },
          { value: '5', label: '5+' },
        ],
      },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  BUILDING_MGMT: {
    appCode: 'BUILDING_MGMT',
    label: 'Building Issue',
    createTitle: 'Report Building Issue',
    createSubtitle: 'Lift, HVAC, electrical, plumbing',
    fields: [
      { key: 'title', label: 'Issue Title', type: 'text', required: true },
      {
        key: 'issue_type',
        label: 'Issue Type',
        type: 'select',
        required: true,
        options: [
          { value: 'LIFT', label: 'Lift' },
          { value: 'HVAC', label: 'HVAC' },
          { value: 'ELECTRICAL', label: 'Electrical' },
          { value: 'PLUMBING', label: 'Plumbing' },
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
        label: 'Building / Zone',
        type: 'domain-picker',
        domainType: 'ZONE',
        required: true,
      },
      { key: 'description', label: 'Description', type: 'textarea', required: true },
    ],
  },
};

export function getAppConfig(appCode: string): AppUiConfig | undefined {
  return APP_UI_CONFIG[appCode];
}
