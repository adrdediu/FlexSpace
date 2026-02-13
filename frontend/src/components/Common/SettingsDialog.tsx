import React, { useState } from 'react';
import {
  TabList,
  Tab,
  makeStyles,
  tokens,
  Field,
  Input,
  Switch,
  Select,
  Textarea,
  Button,
  Avatar,
  Text,
} from '@fluentui/react-components';
import {
  Person20Regular,
  Settings20Regular,
  Alert20Regular,
  Shield20Regular,
  Camera20Regular,
} from '@fluentui/react-icons';
import { Modal } from '../Common/Modal';
import { useAuth } from '../../contexts/AuthContext';

const useStyles = makeStyles({
  tabsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    height: '100%',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    paddingTop: tokens.spacingVerticalM,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  sectionTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    margin: 0,
    paddingBottom: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  fieldRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacingHorizontalM,
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
  avatarSection: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalL,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarUploadButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    minWidth: 'auto',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    padding: 0,
  },
  dangerZone: {
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorPaletteRedBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorPaletteRedBorder1}`,
  },
});

type SettingsTab = 'account' | 'preferences' | 'notifications' | 'security';

export interface SettingsDialogProps {
  /**
   * Dialog open state
   */
  open: boolean;
  
  /**
   * Close handler
   */
  onClose: () => void;
  
  /**
   * Initial tab to display
   */
  initialTab?: SettingsTab;
}

/**
 * SettingsDialog - Comprehensive settings modal
 * 
 * Provides tabs for Account, Preferences, Notifications, and Security settings.
 */
export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onClose,
  initialTab = 'account',
}) => {
  const styles = useStyles();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [isSaving, setIsSaving] = useState(false);

  // Form states (in a real app, these would be managed with proper form library)
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [username, setUsername] = useState(user?.username || '');

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Implement actual save logic
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    onClose();
  };

  const renderAccountSettings = () => (
    <div className={styles.tabContent}>
      {/* Profile Picture */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Profile Picture</h3>
        <div className={styles.avatarSection}>
          <div className={styles.avatarContainer}>
            <Avatar
              name={`${firstName} ${lastName}`.trim() || username}
              size={72}
              color="brand"
            />
            <Button
              appearance="primary"
              icon={<Camera20Regular />}
              className={styles.avatarUploadButton}
              aria-label="Upload photo"
            />
          </div>
          <div>
            <Text weight="semibold">Profile Photo</Text>
            <br />
            <Text size={200}>Click the camera icon to upload a new photo</Text>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Personal Information</h3>
        <div className={styles.fieldRow}>
          <Field label="First Name" required>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </Field>
          <Field label="Last Name" required>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Email" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Username">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled
          />
        </Field>
      </div>

      {/* Additional Info */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Additional Information</h3>
        <div className={styles.fieldRow}>
          <Field label="Department">
            <Input placeholder="e.g., Engineering" />
          </Field>
          <Field label="Team">
            <Input placeholder="e.g., Product" />
          </Field>
        </div>
        <Field label="Bio">
          <Textarea placeholder="Tell us about yourself..." />
        </Field>
      </div>

      {/* Danger Zone */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Danger Zone</h3>
        <div className={styles.dangerZone}>
          <Text weight="semibold">Delete Account</Text>
          <br />
          <Text size={200}>
            Once you delete your account, there is no going back. Please be certain.
          </Text>
          <br />
          <br />
          <Button appearance="primary" style={{ backgroundColor: tokens.colorPaletteRedBackground3 }}>
            Delete Account
          </Button>
        </div>
      </div>
    </div>
  );

  const renderPreferencesSettings = () => (
    <div className={styles.tabContent}>
      {/* Appearance */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Appearance</h3>
        <Field label="Theme">
          <Select defaultValue="auto">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto (System)</option>
          </Select>
        </Field>
        <Field label="Language">
          <Select defaultValue="en">
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
          </Select>
        </Field>
      </div>

      {/* Regional Settings */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Regional Settings</h3>
        <Field label="Time Zone">
          <Select defaultValue="utc">
            <option value="utc">UTC</option>
            <option value="est">Eastern Time (US & Canada)</option>
            <option value="pst">Pacific Time (US & Canada)</option>
            <option value="gmt">London</option>
            <option value="cet">Central European Time</option>
          </Select>
        </Field>
        <Field label="Date Format">
          <Select defaultValue="mdy">
            <option value="mdy">MM/DD/YYYY</option>
            <option value="dmy">DD/MM/YYYY</option>
            <option value="ymd">YYYY-MM-DD</option>
          </Select>
        </Field>
        <Field label="Time Format">
          <Select defaultValue="12">
            <option value="12">12-hour (3:30 PM)</option>
            <option value="24">24-hour (15:30)</option>
          </Select>
        </Field>
      </div>

      {/* Booking Defaults */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Booking Defaults</h3>
        <Field label="Default Location">
          <Select defaultValue="">
            <option value="">No default</option>
            <option value="1">San Francisco Office</option>
            <option value="2">London Office</option>
            <option value="3">Tokyo Office</option>
          </Select>
        </Field>
        <Field label="Default Booking Duration">
          <Select defaultValue="8">
            <option value="1">1 hour</option>
            <option value="2">2 hours</option>
            <option value="4">4 hours</option>
            <option value="8">Full day (8 hours)</option>
          </Select>
        </Field>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className={styles.tabContent}>
      {/* Email Notifications */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Email Notifications</h3>
        <Field>
          <Switch label="Booking confirmations" defaultChecked />
        </Field>
        <Field>
          <Switch label="Booking reminders" defaultChecked />
        </Field>
        <Field>
          <Switch label="Cancellation notices" defaultChecked />
        </Field>
        <Field>
          <Switch label="Weekly summary" />
        </Field>
        <Field>
          <Switch label="System announcements" defaultChecked />
        </Field>
      </div>

      {/* Push Notifications */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Push Notifications</h3>
        <Field>
          <Switch label="Enable push notifications" />
        </Field>
        <Field>
          <Switch label="Desktop notifications" />
        </Field>
      </div>

      {/* Reminder Settings */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Reminder Settings</h3>
        <Field label="Remind me before booking">
          <Select defaultValue="60">
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="120">2 hours</option>
            <option value="1440">1 day</option>
          </Select>
        </Field>
        <Field>
          <Switch label="Send day-before reminder" defaultChecked />
        </Field>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className={styles.tabContent}>
      {/* Password */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Password</h3>
        <Field label="Current Password">
          <Input type="password" />
        </Field>
        <Field label="New Password">
          <Input type="password" />
        </Field>
        <Field label="Confirm New Password">
          <Input type="password" />
        </Field>
        <Button appearance="primary">Change Password</Button>
      </div>

      {/* Two-Factor Authentication */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Two-Factor Authentication</h3>
        <Text>Add an extra layer of security to your account</Text>
        <br />
        <Field>
          <Switch label="Enable two-factor authentication" />
        </Field>
      </div>

      {/* Active Sessions */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Active Sessions</h3>
        <Text size={200}>You are currently signed in on these devices:</Text>
        <br />
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM }}>
          <div style={{ 
            padding: tokens.spacingVerticalM, 
            backgroundColor: tokens.colorNeutralBackground3,
            borderRadius: tokens.borderRadiusMedium,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <Text weight="semibold">Chrome on Windows</Text>
              <br />
              <Text size={200}>Current session • Last active: Now</Text>
            </div>
            <Text size={200} style={{ color: tokens.colorBrandForeground1 }}>This device</Text>
          </div>
        </div>
        <Button appearance="secondary">Sign out all other sessions</Button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      subtitle="Manage your account settings and preferences"
      size="medium"
      noPadding
      actions={[
        {
          label: 'Cancel',
          onClick: onClose,
          appearance: 'secondary',
        },
        {
          label: 'Save Changes',
          onClick: handleSave,
          appearance: 'primary',
          loading: isSaving,
        },
      ]}
    >
      <div className={styles.tabsContainer}>
        <TabList
          selectedValue={activeTab}
          onTabSelect={(_, data) => setActiveTab(data.value as SettingsTab)}
        >
          <Tab value="account" icon={<Person20Regular />}>
            Account
          </Tab>
          <Tab value="preferences" icon={<Settings20Regular />}>
            Preferences
          </Tab>
          <Tab value="notifications" icon={<Alert20Regular />}>
            Notifications
          </Tab>
          <Tab value="security" icon={<Shield20Regular />}>
            Security
          </Tab>
        </TabList>

        <div style={{ padding: `0 ${tokens.spacingHorizontalL}` }}>
          {activeTab === 'account' && renderAccountSettings()}
          {activeTab === 'preferences' && renderPreferencesSettings()}
          {activeTab === 'notifications' && renderNotificationSettings()}
          {activeTab === 'security' && renderSecuritySettings()}
        </div>
      </div>
    </Modal>
  );
};

export default SettingsDialog;