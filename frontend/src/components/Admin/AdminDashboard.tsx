import React, { useState } from 'react';
import {
  TabList,
  Tab,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  Building20Regular,
  Door20Regular,
  People20Regular,
  Settings20Regular,
} from '@fluentui/react-icons';
import { FloatingPanelGrid, FloatingPanel } from '../Layout';
import { LocationManagement } from './LocationManagement';
import { RoomManagement } from './RoomManagement';
import { UserGroupManagement } from './UserGroupManagement';

const useStyles = makeStyles({
  tabsContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  tabContent: {
    flex: 1,
    overflow: 'auto',
    paddingTop: tokens.spacingVerticalL,
  },
  placeholder: {
    padding: tokens.spacingVerticalXXL,
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
});

type AdminTab = 'locations' | 'rooms' | 'groups' | 'settings';

export interface AdminDashboardProps {
  /**
   * Optional initial tab
   */
  initialTab?: AdminTab;
}

/**
 * AdminDashboard - Main admin interface
 * 
 * Provides tabbed interface for managing:
 * - Locations and location managers
 * - Rooms and room managers
 * - User groups
 * - System settings
 */
export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  initialTab = 'locations',
}) => {
  const styles = useStyles();
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);

  const renderLocationsTab = () => (
    <LocationManagement />
  );

  const renderRoomsTab = () => (
    <RoomManagement />
  );

  const renderGroupsTab = () => (
    <UserGroupManagement />
  );

  const renderSettingsTab = () => (
    <div className={styles.placeholder}>
      <Settings20Regular style={{ fontSize: '48px', marginBottom: '16px' }} />
      <div>Admin Settings - Coming Soon</div>
    </div>
  );

  return (
    <FloatingPanelGrid>
      <FloatingPanel
        title="Admin Panel"
        position="center"
        size="full"
        opacity="glass"
      >
        <div className={styles.tabsContainer}>
          <TabList
            selectedValue={activeTab}
            onTabSelect={(_, data) => setActiveTab(data.value as AdminTab)}
          >
            <Tab value="locations" icon={<Building20Regular />}>
              Locations
            </Tab>
            <Tab value="rooms" icon={<Door20Regular />}>
              Rooms
            </Tab>
            <Tab value="groups" icon={<People20Regular />}>
              User Groups
            </Tab>
            <Tab value="settings" icon={<Settings20Regular />}>
              Settings
            </Tab>
          </TabList>

          <div className={styles.tabContent}>
            {activeTab === 'locations' && renderLocationsTab()}
            {activeTab === 'rooms' && renderRoomsTab()}
            {activeTab === 'groups' && renderGroupsTab()}
            {activeTab === 'settings' && renderSettingsTab()}
          </div>
        </div>
      </FloatingPanel>
    </FloatingPanelGrid>
  );
};

export default AdminDashboard;