import { apiRequest } from './api-client';

export interface DashboardSummary {
  total: number;
  open: number;
  closed: number;
  rejected: number;
  slaBreachOpen: number;
  slaAtRisk: number;
  slaBreachedClosed: number;
  avgResolutionHours: number;
  mttrHours: number;
}

export type AppMetrics =
  | {
      type: 'IT_SUPPORT';
      metrics: {
        criticalOpen: number;
        topProblems: { label: string; count: number }[];
        assetFailures: { label: string; count: number }[];
        avgAgeOpenDays: number;
      };
    }
  | {
      type: 'ENGINEERING';
      metrics: {
        openBreakdowns: number;
        downtimeHours: number;
        mtbfHours: number;
        sparepartUsage: { label: string; count: number }[];
        pmCompliance: {
          complianceRate: number;
          overdueSchedules: number;
          pmOpen: number;
          pmCompletedThisMonth: number;
        };
      };
    }
  | {
      type: 'ISP_TICKET';
      metrics: {
        customerDown: number;
        complaintsThisMonth: number;
        complaintsLast7Days: number;
        slaBreachOpen: number;
        byArea: { label: string; count: number }[];
        byEvent: { label: string; count: number }[];
        openByProcess: { label: string; count: number }[];
        repeatedComplaints: { customer: string; count: number }[];
        avgResolutionHours: number;
      };
    }
  | {
      type: 'GA_SUPPORT';
      metrics: {
        byCategory: { label: string; count: number }[];
        avgResponseHours: number;
        openRequests: number;
      };
    }
  | {
      type: 'VEHICLE_BOOKING';
      metrics: {
        bookingsThisMonth: number;
        upcomingBookings: number;
        utilizationRate: number;
        byDestination: { label: string; count: number }[];
      };
    }
  | {
      type: 'BUILDING_MGMT';
      metrics: {
        byIssueType: { label: string; count: number }[];
        emergencyOpen: number;
        openIssues: number;
      };
    };

export interface AppDashboard {
  appCode: string;
  appName: string;
  summary: DashboardSummary;
  byProcess: { process: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  technicianKpi: {
    userId: string;
    fullName: string;
    completed: number;
    avgResolutionHours: number;
  }[];
  recentBreaches: {
    id: string;
    trxNo: string;
    priority: string | null;
    status: string;
    currentProcess: string;
    createdAt: string;
  }[];
  appMetrics: AppMetrics | null;
}

export function getAppDashboard(appCode: string) {
  return apiRequest<AppDashboard>(`/dashboard/${appCode}`);
}
