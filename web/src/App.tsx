import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/templates/AppLayout';
import { AppDashboardPage } from './components/organisms/AppDashboardPage';
import { AppReportPage } from './components/organisms/AppReportPage';
import { TransactionDetailPage } from './components/organisms/TransactionDetailPage';
import { APP_UI_CONFIG } from './config/apps';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/admin/UsersPage';
import { RolesPage } from './pages/admin/RolesPage';
import { DomainsPage } from './pages/admin/DomainsPage';
import { AppConfigPage } from './pages/admin/AppConfigPage';
import { IntegrationMarketplacePage } from './pages/admin/IntegrationMarketplacePage';
import { MenuConfigPage } from './pages/admin/MenuConfigPage';
import { CreateTicketPage } from './pages/ITSupport/CreateTicketPage';
import { TicketListPage } from './pages/ITSupport/TicketListPage';
import { ApprovalPage } from './pages/ITSupport/ApprovalPage';
import { WorkOrderListPage } from './pages/Engineering/WorkOrderListPage';
import { CreateWorkOrderPage } from './pages/Engineering/CreateWorkOrderPage';
import { PmTaskListPage } from './pages/Engineering/PmTaskListPage';
import { PmScheduleListPage } from './pages/Engineering/PmScheduleListPage';
import { PmCalendarPage } from './pages/Engineering/PmCalendarPage';
import { ISPTicketListPage } from './pages/ISP/ISPTicketListPage';
import { CreateISPTicketPage } from './pages/ISP/CreateISPTicketPage';
import { ISPMapViewPage } from './pages/ISP/ISPMapViewPage';
import { GARequestListPage } from './pages/GA/GARequestListPage';
import { CreateGARequestPage } from './pages/GA/CreateGARequestPage';
import { VehicleBookingListPage } from './pages/Vehicle/VehicleBookingListPage';
import { CreateVehicleBookingPage } from './pages/Vehicle/CreateVehicleBookingPage';
import { VehicleCalendarPage } from './pages/Vehicle/VehicleCalendarPage';
import { BuildingIssueListPage } from './pages/Building/BuildingIssueListPage';
import { CreateBuildingIssuePage } from './pages/Building/CreateBuildingIssuePage';
import { AIAssistantPage } from './pages/AI/AIAssistantPage';
import { CrossAppAnalyticsPage } from './pages/Analytics/CrossAppAnalyticsPage';
import { AiLlmSettingsPage } from './pages/AI/AiLlmSettingsPage';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="transactions/:id" element={<TransactionDetailPage />} />
        <Route path="it-support/tickets" element={<TicketListPage />} />
        <Route path="it-support/create" element={<CreateTicketPage />} />
        <Route
          path="it-support/dashboard"
          element={<AppDashboardPage config={APP_UI_CONFIG.IT_SUPPORT} />}
        />
        <Route
          path="it-support/reports"
          element={<AppReportPage config={APP_UI_CONFIG.IT_SUPPORT} />}
        />
        <Route path="engineering/work-orders" element={<WorkOrderListPage />} />
        <Route path="engineering/create" element={<CreateWorkOrderPage />} />
        <Route
          path="engineering/dashboard"
          element={<AppDashboardPage config={APP_UI_CONFIG.ENG_WO} />}
        />
        <Route
          path="engineering/reports"
          element={<AppReportPage config={APP_UI_CONFIG.ENG_WO} />}
        />
        <Route path="engineering/pm" element={<PmTaskListPage />} />
        <Route path="engineering/pm-schedules" element={<PmScheduleListPage />} />
        <Route path="engineering/pm-calendar" element={<PmCalendarPage />} />
        <Route
          path="engineering/pm-reports"
          element={<AppReportPage config={APP_UI_CONFIG.ENG_PM} />}
        />
        <Route path="isp/tickets" element={<ISPTicketListPage />} />
        <Route path="isp/create" element={<CreateISPTicketPage />} />
        <Route
          path="isp/dashboard"
          element={<AppDashboardPage config={APP_UI_CONFIG.ISP_TICKET} />}
        />
        <Route
          path="isp/reports"
          element={<AppReportPage config={APP_UI_CONFIG.ISP_TICKET} />}
        />
        <Route path="isp/map" element={<ISPMapViewPage />} />
        <Route path="ga/requests" element={<GARequestListPage />} />
        <Route path="ga/create" element={<CreateGARequestPage />} />
        <Route
          path="ga/dashboard"
          element={<AppDashboardPage config={APP_UI_CONFIG.GA_SUPPORT} />}
        />
        <Route
          path="ga/reports"
          element={<AppReportPage config={APP_UI_CONFIG.GA_SUPPORT} />}
        />
        <Route path="vehicle/bookings" element={<VehicleBookingListPage />} />
        <Route path="vehicle/create" element={<CreateVehicleBookingPage />} />
        <Route path="vehicle/calendar" element={<VehicleCalendarPage />} />
        <Route
          path="vehicle/dashboard"
          element={<AppDashboardPage config={APP_UI_CONFIG.VEHICLE_BOOKING} />}
        />
        <Route
          path="vehicle/reports"
          element={<AppReportPage config={APP_UI_CONFIG.VEHICLE_BOOKING} />}
        />
        <Route path="building/issues" element={<BuildingIssueListPage />} />
        <Route path="building/create" element={<CreateBuildingIssuePage />} />
        <Route
          path="building/dashboard"
          element={<AppDashboardPage config={APP_UI_CONFIG.BUILDING_MGMT} />}
        />
        <Route
          path="building/reports"
          element={<AppReportPage config={APP_UI_CONFIG.BUILDING_MGMT} />}
        />
        <Route path="approvals" element={<ApprovalPage />} />
        <Route path="ai-assistant" element={<AIAssistantPage />} />
        <Route path="analytics" element={<CrossAppAnalyticsPage />} />
        <Route path="ai-settings" element={<AiLlmSettingsPage />} />
        <Route path="admin/users" element={<UsersPage />} />
        <Route path="admin/roles" element={<RolesPage />} />
        <Route path="admin/domains" element={<DomainsPage />} />
        <Route path="admin/apps" element={<AppConfigPage />} />
        <Route path="admin/menu" element={<MenuConfigPage />} />
        <Route path="admin/integrations" element={<IntegrationMarketplacePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
