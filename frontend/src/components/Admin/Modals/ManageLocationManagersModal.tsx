import React, { useState } from 'react';
import {
  makeStyles,
  tokens,
  Avatar,
  Button,
  Text,
  Input,
  Field,
  Spinner,
} from '@fluentui/react-components';
import {
  Dismiss20Regular,
  PersonAdd20Regular,
  Search20Regular,
} from '@fluentui/react-icons';
import { Modal } from '../../Common/Modal';
import { type Location, type LocationManager } from '../../../services/locationApi';
import { createUserSearchApi, type User } from '../../../services/userSearchApi';
import { useAuth } from '../../../contexts/AuthContext';

const useStyles = makeStyles({
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
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
    paddingBottom: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  managerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  managerItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
  },
  managerInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  searchSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  searchResults: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    maxHeight: '200px',
    overflowY: 'auto',
  },
  searchResultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
  },
  emptyState: {
    textAlign: 'center',
    display: 'flex',
    flexDirection:'column',
    justifyContent:'center',
    alignItems:'center',
    padding: tokens.spacingVerticalXL,
    color: tokens.colorNeutralForeground3,
  },
  loadingState: {
    display: 'flex',
    justifyContent: 'center',
    padding: tokens.spacingVerticalL,
  },
});

export interface ManageLocationManagersModalProps {
  open: boolean;
  onClose: () => void;
  location: Location | null;
  onAddManagers: (locationId: number, userIds: number[]) => Promise<void>;
  onRemoveManager: (locationId: number, userIds: number[]) => Promise<void>;
}

export const ManageLocationManagersModal: React.FC<ManageLocationManagersModalProps> = ({
  open,
  onClose,
  location,
  onAddManagers,
  onRemoveManager,
}) => {
  const styles = useStyles();
  const { authenticatedFetch } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const userSearchApi = createUserSearchApi(authenticatedFetch);

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await userSearchApi.searchUsers(searchQuery);
      // Filter out users who are already managers
      const filtered = results.filter(
        user => !location?.location_managers.some(m => m.id === user.id)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddManager = async (user: User) => {
    if (!location) return;

    setSubmitting(true);
    try {
      await onAddManagers(location.id, [user.id]);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error adding manager:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveManager = async (managerId: number) => {
    if (!location) return;

    if (!confirm('Are you sure you want to remove this manager?')) {
      return;
    }

    setSubmitting(true);
    try {
      await onRemoveManager(location.id, [managerId]);
    } catch (error) {
      console.error('Error removing manager:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Search as user types (debounced)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!location) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage Location Managers"
      subtitle={location.name}
      size="medium"
      actions={[
        {
          label: 'Done',
          onClick: onClose,
          appearance: 'primary',
        },
      ]}
    >
      <div className={styles.content}>
        {/* Current Managers */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            Current Managers ({location.location_managers.length})
          </div>
          
          {location.location_managers.length === 0 ? (
            <div className={styles.emptyState}>
              <PersonAdd20Regular style={{ fontSize: '32px', marginBottom: '8px' }} />
              <Text size={300}>No managers assigned</Text>
            </div>
          ) : (
            <div className={styles.managerList}>
              {location.location_managers.map((manager) => (
                <div key={manager.id} className={styles.managerItem}>
                  <Avatar
                    name={manager.full_name}
                    initials={`${manager.first_name?.[0] || ''}${manager.last_name?.[0] || ''}`}
                    size={40}
                  />
                  <div className={styles.managerInfo}>
                    <Text weight="semibold">{manager.full_name}</Text>
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                      {manager.email}
                    </Text>
                  </div>
                  <Button
                    appearance="subtle"
                    icon={<Dismiss20Regular />}
                    onClick={() => handleRemoveManager(manager.id)}
                    disabled={submitting}
                    aria-label="Remove manager"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search and Add Manager */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Add Manager</div>
          
          <div className={styles.searchSection}>
            <Field label="Search for users">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or username..."
                contentBefore={<Search20Regular />}
                disabled={submitting}
              />
            </Field>

            {searching && (
              <div className={styles.loadingState}>
                <Spinner size="small" label="Searching..." />
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <div className={styles.searchResults}>
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className={styles.searchResultItem}
                    onClick={() => handleAddManager(user)}
                  >
                    <Avatar
                      name={user.full_name}
                      initials={`${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`}
                      size={32}
                    />
                    <div style={{ flex: 1 }}>
                      <Text weight="semibold">{user.full_name}</Text>
                      <br />
                      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                        {user.email}
                      </Text>
                    </div>
                    <Button
                      appearance="primary"
                      size="small"
                      icon={<PersonAdd20Regular />}
                      disabled={submitting}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                No users found matching "{searchQuery}"
              </Text>
            )}
          </div>
          
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Search for users by name, email, or username. Location managers can create rooms, 
            manage user groups, and assign room managers.
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default ManageLocationManagersModal;