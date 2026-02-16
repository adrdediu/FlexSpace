import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Text,
  Input,
  Field,
  makeStyles,
  tokens,
  Spinner,
} from '@fluentui/react-components';
import { Delete20Regular } from '@fluentui/react-icons';
import { type RoomWithDesks } from '../../../services/roomApi';
import { createUserSearchApi, type User } from '../../../services/userSearchApi';
import { useAuth } from '../../../contexts/AuthContext';

const useStyles = makeStyles({
  managersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    marginTop: tokens.spacingVerticalM,
  },
  managerItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacingVerticalS,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  managerInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  addSection: {
    marginTop: tokens.spacingVerticalL,
    paddingTop: tokens.spacingVerticalL,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  searchResults: {
    maxHeight: '200px',
    overflowY: 'auto',
    marginTop: tokens.spacingVerticalS,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  searchResultItem: {
    padding: tokens.spacingVerticalS,
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  emptyMessage: {
    padding: tokens.spacingVerticalM,
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
});

interface ManageRoomManagersModalProps {
  open: boolean;
  onClose: () => void;
  room: RoomWithDesks | null;
  onAddManagers: (roomId: number, userIds: number[]) => Promise<void>;
  onRemoveManager: (roomId: number, userIds: number[]) => Promise<void>;
}

/**
 * ManageRoomManagersModal - Manage room managers
 * 
 * Features:
 * - View current room managers
 * - Search for users to add as managers
 * - Remove managers
 * - Prevents duplicate assignments
 */
export const ManageRoomManagersModal: React.FC<ManageRoomManagersModalProps> = ({
  open,
  onClose,
  room,
  onAddManagers,
  onRemoveManager,
}) => {
  const styles = useStyles();
  const { authenticatedFetch } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);

  const userSearchApi = createUserSearchApi(authenticatedFetch);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    try {
      setSearching(true);
      const results = await userSearchApi.searchUsers(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error('Failed to search users:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddManager = async (user: User) => {
    if (!room) return;

    try {
      setLoading(true);
      await onAddManagers(room.id, [user.id]);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Failed to add manager:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveManager = async (managerId: number) => {
    if (!room) return;

    if (!confirm('Are you sure you want to remove this manager?')) {
      return;
    }

    try {
      setLoading(true);
      await onRemoveManager(room.id, [managerId]);
    } catch (err) {
      console.error('Failed to remove manager:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && handleClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Manage Room Managers - {room?.name}</DialogTitle>
          <DialogContent>
            <Text size={300} weight="semibold">Current Managers</Text>
            {room?.room_managers.length === 0 ? (
              <Text size={200} style={{ marginTop: tokens.spacingVerticalS, display: 'block' }}>
                No managers assigned yet
              </Text>
            ) : (
              <div className={styles.managersList}>
                {room?.room_managers.map((manager) => (
                  <div key={manager.id} className={styles.managerItem}>
                    <div className={styles.managerInfo}>
                      <Text weight="semibold">{manager.full_name}</Text>
                      <Text size={200}>{manager.email}</Text>
                    </div>
                    <Button
                      appearance="subtle"
                      icon={<Delete20Regular />}
                      onClick={() => handleRemoveManager(manager.id)}
                      disabled={loading}
                      aria-label="Remove manager"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className={styles.addSection}>
              <Text size={300} weight="semibold">Add Manager</Text>
              <Field style={{ marginTop: tokens.spacingVerticalS }}>
                <Input
                  value={searchQuery}
                  onChange={(_, data) => setSearchQuery(data.value)}
                  placeholder="Search by name or email..."
                />
              </Field>

              {searching && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: tokens.spacingVerticalS }}>
                  <Spinner size="small" label="Searching..." />
                </div>
              )}

              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className={styles.emptyMessage}>
                  <Text size={200}>No users found</Text>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className={styles.searchResults}>
                  {searchResults.map((user) => {
                    const isAlreadyManager = room?.room_managers.some(m => m.id === user.id);
                    return (
                      <div
                        key={user.id}
                        className={styles.searchResultItem}
                        onClick={() => !isAlreadyManager && handleAddManager(user)}
                        style={{
                          opacity: isAlreadyManager ? 0.5 : 1,
                          cursor: isAlreadyManager ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <Text weight="semibold">{user.full_name}</Text>
                        <Text size={200}>{user.email}</Text>
                        {isAlreadyManager && <Text size={200}>(Already a manager)</Text>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={handleClose}>
              Done
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};