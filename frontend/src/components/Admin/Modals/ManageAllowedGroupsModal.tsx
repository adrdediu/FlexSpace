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
  Checkbox,
  makeStyles,
  tokens,
  Spinner,
} from '@fluentui/react-components';
import { type RoomWithDesks } from '../../../services/roomApi';
import { createLocationApi } from '../../../services/locationApi';
import { useAuth } from '../../../contexts/AuthContext';

interface UserGroup {
  id: number;
  name: string;
  description: string;
  member_count: number;
}

const useStyles = makeStyles({
  groupsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    marginTop: tokens.spacingVerticalM,
    maxHeight: '400px',
    overflowY: 'auto',
  },
  groupItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalS,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  groupInfo: {
    flex: 1,
  },
  infoText: {
    marginTop: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  emptyState: {
    textAlign: 'center',
    padding: tokens.spacingVerticalXL,
    color: tokens.colorNeutralForeground3,
  },
});

interface ManageAllowedGroupsModalProps {
  open: boolean;
  onClose: () => void;
  room: RoomWithDesks | null;
  onSetGroups: (roomId: number, groupIds: number[]) => Promise<void>;
}

/**
 * ManageAllowedGroupsModal - Control which user groups can book in a room
 * 
 * Features:
 * - View all available groups for the location
 * - Select/deselect groups with checkboxes
 * - Empty selection = allow all users
 * - Shows member count for each group
 */
export const ManageAllowedGroupsModal: React.FC<ManageAllowedGroupsModalProps> = ({
  open,
  onClose,
  room,
  onSetGroups,
}) => {
  const styles = useStyles();
  const { authenticatedFetch } = useAuth();
  const [availableGroups, setAvailableGroups] = useState<UserGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const locationApi = createLocationApi(authenticatedFetch);

  useEffect(() => {
    if (open && room) {
      fetchGroups();
      setSelectedGroupIds(room.allowed_groups.map(g => g.id));
    }
  }, [open, room]);

  const fetchGroups = async () => {
    if (!room) return;

    try {
      setLoadingGroups(true);
      const locationId = room.floor.location_id;
      const groups = await locationApi.getUserGroups(locationId);
      setAvailableGroups(groups);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleToggleGroup = (groupId: number) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSave = async () => {
    if (!room) return;

    try {
      setLoading(true);
      await onSetGroups(room.id, selectedGroupIds);
      onClose();
    } catch (err) {
      console.error('Failed to update allowed groups:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Manage Allowed Groups - {room?.name}</DialogTitle>
          <DialogContent>
            <div className={styles.infoText}>
              <Text size={200}>
                Select which user groups can book desks in this room. If no groups are selected,
                all users will be able to book.
              </Text>
            </div>

            {loadingGroups ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: tokens.spacingVerticalXL }}>
                <Spinner size="large" label="Loading groups..." />
              </div>
            ) : availableGroups.length === 0 ? (
              <div className={styles.emptyState}>
                <Text size={300}>No user groups available</Text>
                <Text size={200} style={{ marginTop: tokens.spacingVerticalS, display: 'block' }}>
                  Create user groups in this location first
                </Text>
              </div>
            ) : (
              <div className={styles.groupsList}>
                {availableGroups.map((group) => (
                  <div key={group.id} className={styles.groupItem}>
                    <Checkbox
                      checked={selectedGroupIds.includes(group.id)}
                      onChange={() => handleToggleGroup(group.id)}
                    />
                    <div className={styles.groupInfo}>
                      <Text weight="semibold">{group.name}</Text>
                      {group.description && (
                        <Text size={200} style={{ display: 'block' }}>{group.description}</Text>
                      )}
                      <Text size={200} style={{ display: 'block' }}>
                        {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};