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
  Drawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
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
  Navigation24Regular,
  Dismiss24Regular,
} from '@fluentui/react-icons';
import { useAuth } from '../contexts/AuthContext';
import { type NavSection } from '../types/common';

const useStyles = makeStyles({
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '64px',
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    position: 'relative',
    zIndex: 100,
    pointerEvents: 'auto',
    '@media (min-width: 768px)': {
      paddingLeft: tokens.spacingHorizontalXXL,
      paddingRight: tokens.spacingHorizontalXXL,
    },
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalL,
    '@media (min-width: 768px)': {
      gap: tokens.spacingHorizontalXXL,
    },
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    cursor: 'pointer',
    userSelect: 'none',
    '@media (min-width: 768px)': {
      gap: tokens.spacingHorizontalM,
    },
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colorBrandBackground,
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForegroundInverted,
    fontSize: '20px',
    fontWeight: tokens.fontWeightBold,
    '@media (min-width: 768px)': {
      width: '40px',
      height: '40px',
      fontSize: '24px',
    },
  },
  logoText: {
    display: 'none',
    '@media (min-width: 640px)': {
      display: 'flex',
      alignItems: 'center',
      fontSize: tokens.fontSizeBase400,
    },
    '@media (min-width: 768px)': {
      fontSize: tokens.fontSizeBase500,
    },
  },
  logoTextContent: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    letterSpacing: '-0.5px',
  },
  logoSubtext: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginLeft: tokens.spacingHorizontalXS,
    display: 'none',
    '@media (min-width: 768px)': {
      display: 'inline',
    },
  },
  navigation: {
    display: 'none',
    '@media (min-width: 1024px)': {
      display: 'flex',
      alignItems: 'center',
      gap: tokens.spacingHorizontalS,
    },
  },
  navButton: {
    minWidth: '100px',
    fontWeight: tokens.fontWeightSemibold,
  },
  navButtonActive: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
    color: tokens.colorBrandForeground1,
  },
  mobileMenuButton: {
    display: 'flex',
    '@media (min-width: 1024px)': {
      display: 'none',
    },
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    '@media (min-width: 768px)': {
      gap: tokens.spacingHorizontalM,
    },
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    cursor: 'pointer',
  },
  userName: {
    display: 'none',
    '@media (min-width: 768px)': {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      marginRight: tokens.spacingHorizontalXS,
    },
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
  drawerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalL,
  },
  drawerNavButton: {
    width: '100%',
    justifyContent: 'flex-start',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
    height: '48px',
  },
  drawerUserInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalM,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  drawerUserDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  drawerUserName: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  drawerUserEmail: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  settingsButtonMobile: {
    display: 'flex',
    '@media (min-width: 768px)': {
      display: 'none',
    },
  },
  settingsButtonDesktop: {
    display: 'none',
    '@media (min-width: 768px)': {
      display: 'flex',
    },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      setMobileMenuOpen(false);
    }
  };

  const handleSettingsClick = () => {
    if (onSettingsClick) {
      onSettingsClick();
    } else {
      console.log('Settings clicked');
    }
    setMobileMenuOpen(false);
  };

  const handleLogoutClick = () => {
    onLogout();
    setMobileMenuOpen(false);
  };

  return (
    <>
      <div className={styles.topBar}>
        {/* Left Section - Logo and Desktop Navigation */}
        <div className={styles.leftSection}>
          {/* Hamburger Menu Button (Mobile) */}
          <Button
            appearance="subtle"
            icon={<Navigation24Regular />}
            onClick={() => setMobileMenuOpen(true)}
            disabled={loading}
            className={styles.mobileMenuButton}
            aria-label="Open menu"
          />

          {/* Logo */}
          <div className={styles.logo} onClick={() => handleNavClick('dashboard')}>
            <div className={styles.logoIcon}>
              <BuildingMultiple24Regular />
            </div>
            <div className={styles.logoText}>
              <span className={styles.logoTextContent}>FlexSpace</span>
              <span className={styles.logoSubtext}>Desk Booking</span>
            </div>
          </div>

          {/* Desktop Navigation */}
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

          {/* Settings Button (Desktop only) */}
          <Tooltip content="Settings" relationship="description">
            <Button
              appearance="subtle"
              icon={<Settings24Regular />}
              onClick={handleSettingsClick}
              disabled={loading}
              aria-label="Settings"
              className={styles.settingsButtonDesktop}
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

      {/* Mobile Drawer Menu */}
      <Drawer
        type="overlay"
        separator
        open={mobileMenuOpen}
        onOpenChange={(_, { open }) => setMobileMenuOpen(open)}
        position="start"
      >
        <DrawerHeader>
          <DrawerHeaderTitle
            action={
              <Button
                appearance="subtle"
                aria-label="Close"
                icon={<Dismiss24Regular />}
                onClick={() => setMobileMenuOpen(false)}
              />
            }
          >
            Menu
          </DrawerHeaderTitle>
        </DrawerHeader>

        <DrawerBody>
          <div className={styles.drawerContent}>
            {/* User Info in Drawer */}
            <div className={styles.drawerUserInfo}>
              <Avatar
                name={getDisplayName()}
                initials={getUserInitials()}
                color="brand"
                size={48}
                badge={{
                  status: 'available',
                }}
              />
              <div className={styles.drawerUserDetails}>
                <span className={styles.drawerUserName}>{getDisplayName()}</span>
                <span className={styles.drawerUserEmail}>{user?.email}</span>
                {getUserRole() && (
                  <span
                    style={{
                      fontSize: tokens.fontSizeBase200,
                      color: tokens.colorBrandForeground1,
                      marginTop: '2px',
                    }}
                  >
                    {getUserRole()}
                  </span>
                )}
              </div>
            </div>

            {/* Navigation Buttons */}
            <Button
              appearance={activeSection === 'dashboard' ? 'primary' : 'subtle'}
              icon={<Home24Regular />}
              onClick={() => handleNavClick('dashboard')}
              disabled={loading}
              className={styles.drawerNavButton}
            >
              Dashboard
            </Button>

            <Button
              appearance={activeSection === 'bookings' ? 'primary' : 'subtle'}
              icon={<CalendarLtr24Regular />}
              onClick={() => handleNavClick('bookings')}
              disabled={loading}
              className={styles.drawerNavButton}
            >
              My Bookings
            </Button>

            {isAdmin && (
              <Button
                appearance={activeSection === 'admin' ? 'primary' : 'subtle'}
                icon={<Shield24Regular />}
                onClick={() => handleNavClick('admin')}
                disabled={loading}
                className={styles.drawerNavButton}
              >
                Admin
                {user?.is_superuser && (
                  <Badge
                    appearance="filled"
                    color="danger"
                    size="small"
                    style={{ marginLeft: tokens.spacingHorizontalXS }}
                  />
                )}
              </Button>
            )}

            <MenuDivider />

            {/* Settings & Profile */}
            <Button
              appearance="subtle"
              icon={<Settings24Regular />}
              onClick={handleSettingsClick}
              disabled={loading}
              className={styles.drawerNavButton}
            >
              Settings
            </Button>

            <Button
              appearance="subtle"
              icon={<Person24Regular />}
              onClick={() => {
                console.log('Profile clicked');
                setMobileMenuOpen(false);
              }}
              className={styles.drawerNavButton}
            >
              View Profile
            </Button>

            <MenuDivider />

            {/* Logout */}
            <Button
              appearance="subtle"
              icon={<SignOut24Regular />}
              onClick={handleLogoutClick}
              className={styles.drawerNavButton}
              style={{ color: tokens.colorPaletteRedForeground1 }}
            >
              Sign Out
            </Button>
          </div>
        </DrawerBody>
      </Drawer>
    </>
  );
};

export default TopBar;