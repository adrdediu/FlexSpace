import React, { useState } from 'react';
import {
  makeStyles,
  tokens,
  Button,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuDivider,
  Avatar,
  Tooltip,
  Badge,
  Spinner,
} from '@fluentui/react-components';
import {
  Home24Regular,
  CalendarLtr24Regular,
  Settings24Regular,
  PersonCircle24Regular,
  SignOut24Regular,
  Shield24Regular,
  Person24Regular,
  BuildingMultiple24Regular,
} from '@fluentui/react-icons';
import { useAuth } from '../contexts/AuthContext';
import { type NavSection } from '../types/common';

const useStyles = makeStyles({
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '64px',
    paddingLeft: tokens.spacingHorizontalXXL,
    paddingRight: tokens.spacingHorizontalXXL,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    position: 'relative',
    zIndex: 100,
    pointerEvents: 'auto',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXL,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    cursor: 'pointer',
    userSelect: 'none',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colorBrandBackground,
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForegroundInverted,
    fontSize: '24px',
    fontWeight: tokens.fontWeightBold,
  },
  logoText: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    letterSpacing: '-0.5px',
  },
  logoSubtext: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginLeft: tokens.spacingHorizontalXS,
  },
  navigation: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  navButton: {
    minWidth: '100px',
    fontWeight: tokens.fontWeightSemibold,
  },
  navButtonActive: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
    color: tokens.colorBrandForeground1,
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  userName: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginRight: tokens.spacingHorizontalXS,
  },
  userNameText: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: '1.2',
  },
  userRole: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    lineHeight: '1.2',
  },
  menuItem: {
    minWidth: '200px',
  },
  adminBadge: {
    marginLeft: tokens.spacingHorizontalXS,
  },
});

interface TopBarProps {
  activeSection: NavSection;
  onSectionChange: (section: NavSection) => void;
  loading?: boolean;
  onLogout: () => void;
  onSettingsClick?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  onSectionChange,
  loading = false,
  onLogout,
  onSettingsClick,
}) => {
  const styles = useStyles();
  const { user } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const getDisplayName = () => {
    if (!user) return 'User';
    if (user.first_name || user.last_name) {
      return `${user.first_name} ${user.last_name}`.trim();
    }
    return user.username;
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.username.substring(0, 2).toUpperCase();
  };

  const getUserRole = () => {
    if (!user) return '';
    if (user.is_superuser) return 'Super Admin';
    if (user.is_staff) return 'Staff';
    if (user.role) return user.role;
    return 'User';
  };

  const isAdmin = user?.is_staff || user?.is_superuser;

  const handleNavClick = (section: NavSection) => {
    if (!loading) {
      onSectionChange(section);
    }
  };

  const handleSettingsClick = () => {
    if (onSettingsClick) {
      onSettingsClick();
    } else {
      // Default behavior - could open a settings modal
      console.log('Settings clicked');
    }
  };

  return (
    <div className={styles.topBar}>
      {/* Left Section - Logo and Navigation */}
      <div className={styles.leftSection}>
        {/* Logo */}
        <div className={styles.logo} onClick={() => handleNavClick('dashboard')}>
          <div className={styles.logoIcon}>
            <BuildingMultiple24Regular />
          </div>
          <div>
            <span className={styles.logoText}>FlexSpace</span>
            <span className={styles.logoSubtext}>Desk Booking</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className={styles.navigation}>
          <Tooltip content="View Dashboard" relationship="description">
            <Button
              appearance={activeSection === 'dashboard' ? 'primary' : 'subtle'}
              icon={<Home24Regular />}
              onClick={() => handleNavClick('dashboard')}
              disabled={loading}
              className={`${styles.navButton} ${
                activeSection === 'dashboard' ? styles.navButtonActive : ''
              }`}
            >
              Dashboard
            </Button>
          </Tooltip>

          <Tooltip content="View Your Bookings" relationship="description">
            <Button
              appearance={activeSection === 'bookings' ? 'primary' : 'subtle'}
              icon={<CalendarLtr24Regular />}
              onClick={() => handleNavClick('bookings')}
              disabled={loading}
              className={`${styles.navButton} ${
                activeSection === 'bookings' ? styles.navButtonActive : ''
              }`}
            >
              My Bookings
            </Button>
          </Tooltip>

          {isAdmin && (
            <Tooltip content="Admin Panel" relationship="description">
              <Button
                appearance={activeSection === 'admin' ? 'primary' : 'subtle'}
                icon={<Shield24Regular />}
                onClick={() => handleNavClick('admin')}
                disabled={loading}
                className={`${styles.navButton} ${
                  activeSection === 'admin' ? styles.navButtonActive : ''
                }`}
              >
                Admin
                {user?.is_superuser && (
                  <Badge
                    appearance="filled"
                    color="danger"
                    size="small"
                    className={styles.adminBadge}
                  />
                )}
              </Button>
            </Tooltip>
          )}
        </nav>
      </div>

      {/* Right Section - User and Settings */}
      <div className={styles.rightSection}>
        {/* Loading Indicator */}
        {loading && <Spinner size="small" />}

        {/* Settings Button */}
        <Tooltip content="Settings" relationship="description">
          <Button
            appearance="subtle"
            icon={<Settings24Regular />}
            onClick={handleSettingsClick}
            disabled={loading}
            aria-label="Settings"
          />
        </Tooltip>

        {/* User Menu */}
        <Menu
          open={userMenuOpen}
          onOpenChange={(e, data) => setUserMenuOpen(data.open)}
        >
          <MenuTrigger disableButtonEnhancement>
            <div className={styles.userSection}>
              <div className={styles.userName}>
                <span className={styles.userNameText}>{getDisplayName()}</span>
                <span className={styles.userRole}>{getUserRole()}</span>
              </div>
              <Avatar
                name={getDisplayName()}
                initials={getUserInitials()}
                color="brand"
                badge={{
                  status: 'available',
                }}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </MenuTrigger>

          <MenuPopover>
            <MenuList>
              {/* User Info Header */}
              <MenuItem disabled className={styles.menuItem}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '8px 0',
                  }}
                >
                  <span
                    style={{
                      fontSize: tokens.fontSizeBase400,
                      fontWeight: tokens.fontWeightSemibold,
                      color: tokens.colorNeutralForeground1,
                    }}
                  >
                    {getDisplayName()}
                  </span>
                  <span
                    style={{
                      fontSize: tokens.fontSizeBase200,
                      color: tokens.colorNeutralForeground3,
                    }}
                  >
                    {user?.email}
                  </span>
                  {user?.role && (
                    <span
                      style={{
                        fontSize: tokens.fontSizeBase200,
                        color: tokens.colorBrandForeground1,
                      }}
                    >
                      {getUserRole()}
                    </span>
                  )}
                </div>
              </MenuItem>

              <MenuDivider />

              {/* Profile */}
              <MenuItem
                icon={<Person24Regular />}
                className={styles.menuItem}
                onClick={() => console.log('Profile clicked')}
              >
                View Profile
              </MenuItem>

              {/* Account Settings */}
              <MenuItem
                icon={<PersonCircle24Regular />}
                className={styles.menuItem}
                onClick={handleSettingsClick}
              >
                Account Settings
              </MenuItem>

              <MenuDivider />

              {/* Logout */}
              <MenuItem
                icon={<SignOut24Regular />}
                className={styles.menuItem}
                onClick={onLogout}
              >
                Sign Out
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>
    </div>
  );
};

export default TopBar;