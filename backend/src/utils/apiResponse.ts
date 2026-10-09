export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: any;
  };
  timestamp: string;
}

export const successResponse = <T>(data: T, statusCode = 200): ApiResponse<T> => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

export const errorResponse = (
  message: string,
  statusCode = 500,
  details?: any
): ApiResponse => ({
  success: false,
  error: {
    message,
    details,
  },
  timestamp: new Date().toISOString(),
});
