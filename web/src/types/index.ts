/**
 * Shared TypeScript types for the web application.
 */

export type AppCode =
  | 'IT_SUPPORT'
  | 'ISP_TICKET'
  | 'ENG_WO'
  | 'ENG_PM'
  | 'GA_SUPPORT'
  | 'BUILDING_MGMT'
  | 'VEHICLE_BOOKING';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  errorCode: string;
  message: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
