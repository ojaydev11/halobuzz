// Re-export API client and related exports for backward compatibility
export { apiClient as default, apiClient, api, healthCheck, simpleHealthCheck, NetworkError } from '@/lib/api';
export type { ApiError } from '@/lib/api';