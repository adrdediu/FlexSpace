/**
 * Admin Components
 * 
 * Components for administrative functions including location management,
 * room management, user groups, and system settings.
 */

export { AdminDashboard } from './AdminDashboard';
export type { AdminDashboardProps } from './AdminDashboard';

export { LocationManagement } from './LocationManagement';
export type { LocationManagementProps } from './LocationManagement';

export { UserGroupManagement } from './UserGroupManagement';

// Export modals
export { AddLocationModal } from './Modals/AddLocationModal';
export type { AddLocationModalProps } from './Modals/AddLocationModal';

export { ManageLocationModal } from './Modals/ManageLocationModal';
export type { ManageLocationModalProps } from './Modals/ManageLocationModal';

export { ManageLocationManagersModal } from './Modals/ManageLocationManagersModal';
export type { ManageLocationManagersModalProps } from './Modals/ManageLocationManagersModal';