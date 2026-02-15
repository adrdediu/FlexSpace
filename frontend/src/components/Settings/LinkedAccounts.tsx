import React, { useState, useEffect } from 'react';
import {
  Button,
  Text,
  makeStyles,
  tokens,
  Spinner,
  Field,
  Input,
} from '@fluentui/react-components';
import {
  Link20Regular,
  Dismiss20Regular,
  Shield20Regular,
} from '@fluentui/react-icons';
import { useAuth } from '../../contexts/AuthContext';
import { GoogleLoginButton } from '../GoogleLoginButton';

const useStyles = makeStyles({
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  sectionTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    paddingBottom: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  accountCard: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  accountIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
  },
  accountInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: '4px 8px',
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorPaletteGreenBackground2,
    color: tokens.colorPaletteGreenForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  warningBox: {
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorPaletteYellowBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorPaletteYellowBorder1}`,
  },
  loadingState: {
    display: 'flex',
    justifyContent: 'center',
    padding: tokens.spacingVerticalXL,
  },
  passwordSection: {
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
});

interface LinkedAccount {
  id: number;
  provider: string;
  email: string;
  picture_url: string;
  created_at: string;
  last_login: string;
}

export const LinkedAccounts: React.FC = () => {
  const styles = useStyles();
  const { authenticatedFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [hasPassword, setHasPassword] = useState(false);
  const [canUnlink, setCanUnlink] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  
  // Password setting state
  const [settingPassword, setSettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchLinkedAccounts();
  }, []);

  const fetchLinkedAccounts = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('/auth/linked-accounts/');
      const data = await response.json();
      
      console.log('DEBUG LinkedAccounts:', {
        accounts: data.linked_accounts,
        hasPassword: data.has_password,
        canUnlink: data.can_unlink,
        accountsLength: data.linked_accounts?.length
      });
      
      setAccounts(data.linked_accounts || []);
      setHasPassword(data.has_password);
      setCanUnlink(data.can_unlink);
    } catch (error) {
      console.error('Error fetching linked accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (provider: string) => {
    // Check if this is the only way to log in
    if (!hasPassword && accounts.length === 1) {
      alert('Cannot disconnect your only login method. Please set a password first before disconnecting your Google account.');
      return;
    }

    if (!confirm(`Are you sure you want to disconnect your ${provider} account?`)) {
      return;
    }

    try {
      setUnlinking(true);
      const response = await authenticatedFetch(
        `/auth/disconnect/${provider}/`,
        { method: 'POST' }
      );

      if (response.ok) {
        await fetchLinkedAccounts();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to disconnect account');
      }
    } catch (error) {
      console.error('Error disconnecting account:', error);
      alert('Failed to disconnect account');
    } finally {
      setUnlinking(false);
    }
  };

  const handleSetPassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    try {
      setSettingPassword(true);
      const response = await authenticatedFetch('/auth/set-password/', {
        method: 'POST',
        body: JSON.stringify({ password: newPassword }),
      });

      if (response.ok) {
        alert('Password set successfully');
        setNewPassword('');
        setConfirmPassword('');
        await fetchLinkedAccounts();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to set password');
      }
    } catch (error) {
      console.error('Error setting password:', error);
      alert('Failed to set password');
    } finally {
      setSettingPassword(false);
    }
  };

  const getProviderLogo = (provider: string) => {
    // Return a data URI for a simple colored circle with provider initial
    const colors: Record<string, string> = {
      google: '#4285F4',
      microsoft: '#00A4EF',
      github: '#24292E',
    };
    
    const color = colors[provider] || '#666666';
    const letter = provider.charAt(0).toUpperCase();
    
    // Create SVG data URI
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
        <circle cx="24" cy="24" r="24" fill="${color}"/>
        <text x="24" y="32" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">${letter}</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Spinner label="Loading linked accounts..." />
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>Linked Accounts</div>

      {/* Linked Accounts List */}
      {accounts.length > 0 ? (
        <>
          {accounts.map((account) => (
            <div key={account.id} className={styles.accountCard}>
              {account.picture_url ? (
                <img
                  src={account.picture_url}
                  alt={account.provider}
                  className={styles.accountIcon}
                  crossOrigin="anonymous"
                  onError={(e) => {
                    // Fallback if image fails to load
                    e.currentTarget.src = getProviderLogo(account.provider);
                  }}
                />
              ) : (
                <img
                  src={getProviderLogo(account.provider)}
                  alt={account.provider}
                  className={styles.accountIcon}
                />
              )}
              <div className={styles.accountInfo}>
                <Text weight="semibold">
                  {account.provider.charAt(0).toUpperCase() + account.provider.slice(1)}
                </Text>
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                  {account.email}
                </Text>
                <div className={styles.badge}>
                  <Link20Regular />
                  <Text size={100}>Connected</Text>
                </div>
              </div>
              <Button
                appearance="subtle"
                icon={<Dismiss20Regular />}
                onClick={() => handleDisconnect(account.provider)}
                disabled={!hasPassword && accounts.length === 1}
                title={
                  !hasPassword && accounts.length === 1
                    ? 'Cannot disconnect - this is your only login method. Set a password first.'
                    : 'Disconnect this account'
                }
              >
                Disconnect
              </Button>
            </div>
          ))}
        </>
      ) : (
        <Text style={{ color: tokens.colorNeutralForeground3 }}>
          No accounts linked yet
        </Text>
      )}

      {/* Warning if can't unlink */}
      {!hasPassword && accounts.length === 1 && (
        <div className={styles.warningBox}>
          <Text weight="semibold">⚠️ Cannot Disconnect</Text>
          <br />
          <Text size={200}>
            This is your only way to sign in. Set a password below before disconnecting your Google account.
          </Text>
        </div>
      )}

      {/* Set Password Section */}
      {!hasPassword && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Set Password</div>
          <div className={styles.passwordSection}>
            <Field label="New Password">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </Field>
            <Field label="Confirm Password" style={{ marginTop: '12px' }}>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
              />
            </Field>
            <Button
              appearance="primary"
              onClick={handleSetPassword}
              disabled={settingPassword || !newPassword || !confirmPassword}
              style={{ marginTop: '12px' }}
            >
              {settingPassword ? 'Setting...' : 'Set Password'}
            </Button>
          </div>
        </div>
      )}

      {/* Link New Account */}
      {!accounts.some(acc => acc.provider === 'google') && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Link Google Account</div>
          <Text size={200} style={{ marginBottom: '12px', color: tokens.colorNeutralForeground3 }}>
            Add Google as an additional sign-in method
          </Text>
          <GoogleLoginButton
            onSuccess={fetchLinkedAccounts}
            onError={() => alert('Failed to link Google account')}
          />
        </div>
      )}
    </div>
  );
};