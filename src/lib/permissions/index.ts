/**
 * ============================================================
 * PERMISSIONS - Export Central
 * ============================================================
 * 
 * Facilita imports do sistema de permissões
 * 
 * USO:
 * import { checkUserPermission, getUserPermissionsMap } from '@/lib/permissions'
 * ============================================================
 */

export {
  checkUserPermission,
  getUserPermissionsMap,
  hasPermissionSync,
  getUserWithPermissions
} from './PermissionChecker'

export {
  unifiedPermissionMiddleware,
  clearRouteCache
} from '../middleware/UnifiedPermissionMiddleware'

export type {
  PermissionLevel,
  DatabasePermissionAction,
  UserPermissionsMap,
  RoutePermissionConfig,
  UserWithPermissions,
  PermissionCheckResult
} from './PermissionTypes'



