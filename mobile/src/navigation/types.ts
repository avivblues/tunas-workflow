export type RootStackParamList = {
  Login: undefined;
  Menu: undefined;
  AppSubMenu: {
    appCode: string;
    appName: string;
    items: {
      id: string;
      menuCode: string;
      label: string;
      path: string;
      icon: string | null;
    }[];
  };
  TransactionList: { appCode: string; title: string };
  TransactionDetail: { id: string };
  CreateTransaction: { appCode: string; title: string };
  WorkExecution: { id: string };
  Approvals: undefined;
  AIAssistant: undefined;
  AppDashboard: { appCode: string; title: string };
  VehicleCalendar: undefined;
  ISPMap: undefined;
};
