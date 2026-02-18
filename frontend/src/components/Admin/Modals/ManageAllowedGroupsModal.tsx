import React, { useState, useEffect } from 'react';
import {
  Button,
  Text,
  Checkbox,
  makeStyles,
  tokens,
  Spinner,
  Badge,
  SearchBox,
} from '@fluentui/react-components';
import {
  People20Regular,
  LockClosed20Regular,
  LockOpen20Regular,
} from '@fluentui/react-icons';
import { Modal } from '../../Common/Modal';
import { type RoomWithDesks } from '../../../services/roomApi';
import { createUserGroupApi, type UserGroupList } from '../../../services/userGroupApi';
import { useAuth } from '../../../contexts/AuthContext';

const useStyles = makeStyles({
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  infoBar: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalS,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  infoIcon: {
    flexShrink: 0,
    marginTop: '1px',
    color: tokens.colorNeutralForeground3,
  },
  accessBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  accessOpen: {
    backgroundColor: tokens.colorPaletteGreenBackground1,
    color: tokens.colorPaletteGreenForeground1,
    border: `1px solid ${tokens.colorPaletteGreenBorder1}`,
  },
  accessRestricted: {
    backgroundColor: tokens.colorPaletteMarigoldBackground1,
    color: tokens.colorPaletteMarigoldForeground1,
    border: `1px solid ${tokens.colorPaletteMarigoldBorder1}`,
  },
  groupsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    maxHeight: '340px',
    overflowY: 'auto',
  },
  groupItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease, border-color 0.15s ease',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  groupItemSelected: {
    backgroundColor: tokens.colorBrandBackground2,
    borderColor: tokens.colorBrandStroke1,
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
  },
  groupInfo: {
    flex: 1,
    minWidth: 0,
  },
  groupName: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
  },
  groupMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    marginTop: '2px',
  },
  emptyState: {
    textAlign: 'center',
    padding: tokens.spacingVerticalXL,
    color: tokens.colorNeutralForeground3,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalS,
  },
  sectionLabel: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: tokens.spacingVerticalXS,
  },
  selectActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },
});

interface ManageAllowedGroupsModalProps {
  open: boolean;
  onClose: () => void;
  room: RoomWithDesks | null;
  onSetGroups: (roomId: number, groupIds: number[]) => Promise<void>;
}

export const ManageAllowedGroupsModal: React.FC<ManageAllowedGroupsModalProps> = ({
  open,
  onClose,
  room,
  onSetGroups,
}) => {
  const styles = useStyles();
  const { authenticatedFetch } = useAuth();
  const groupApi = createUserGroupApi(authenticatedFetch);

  const [availableGroups, setAvailableGroups] = useState<UserGroupList[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set());
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!open || !room) return;
    // Seed selection from the room's current allowed_groups
    setSelectedGroupIds(new Set(room.allowed_groups.map(g => g.id)));
    setSearchQuery('');
    fetchGroups();
  }, [open, room?.id]);

  const fetchGroups = async () => {
    if (!room) return;
    setLoadingGroups(true);
    try {
      const locationId = room.floor.location_id;
      const groups = await groupApi.getGroupsByLocation(locationId);
      setAvailableGroups(groups);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleToggle = (groupId: number) => {
    setSelectedGroupIds(prev => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedGroupIds(new Set(filtered.map(g => g.id)));
  };

  const handleClearAll = () => {
    setSelectedGroupIds(new Set());
  };

  const handleSave = async () => {
    if (!room) return;
    setSaving(true);
    try {
      await onSetGroups(room.id, Array.from(selectedGroupIds));
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to update allowed groups');
    } finally {
      setSaving(false);
    }
  };

  const filtered = availableGroups.filter(g =>
    !searchQuery.trim() ||
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isOpen   = selectedGroupIds.size === 0;
  const selectedCount = selectedGroupIds.size;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage Allowed Groups"
      subtitle={room?.name}
      size="medium"
      actions={[
        { label: 'Cancel', onClick: onClose, appearance: 'secondary', disabled: saving },
        {
          label: saving ? 'Saving…' : 'Save Changes',
          onClick: handleSave,
          appearance: 'primary',
          disabled: saving,
        },
      ]}
    >
      <div className={styles.content}>

        {/* Access status banner */}
        <div className={`${styles.accessBanner} ${isOpen ? styles.accessOpen : styles.accessRestricted}`}>
          {isOpen
            ? <><LockOpen20Regular /><span>Open access — all users can book this room</span></>
            : <><LockClosed20Regular /><span>Restricted — only {selectedCount} {selectedCount === 1 ? 'group' : 'groups'} can book this room</span></>
          }
        </div>

        {/* Info */}
        <div className={styles.infoBar}>
          <People20Regular className={styles.infoIcon} />
          <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
            Check the groups that should have access. Unchecking all groups opens the room to everyone.
          </Text>
        </div>

        {loadingGroups ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: tokens.spacingVerticalXL }}>
            <Spinner size="medium" label="Loading groups…" />
          </div>
        ) : availableGroups.length === 0 ? (
          <div className={styles.emptyState}>
            <People20Regular style={{ fontSize: '40px' }} />
            <Text size={300} weight="semibold">No groups in this location</Text>
            <Text size={200}>Create user groups in the User Groups tab first.</Text>
          </div>
        ) : (
          <>
            {/* Search + bulk actions */}
            <div style={{ display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <SearchBox
                  placeholder="Filter groups…"
                  value={searchQuery}
                  onChange={(_, d) => setSearchQuery(d?.value ?? '')}
                  size="small"
                />
              </div>
              <div className={styles.selectActions}>
                <Button
                  appearance="subtle"
                  size="small"
                  onClick={handleSelectAll}
                  disabled={filtered.every(g => selectedGroupIds.has(g.id))}
                >
                  Select all
                </Button>
                <Button
                  appearance="subtle"
                  size="small"
                  onClick={handleClearAll}
                  disabled={selectedGroupIds.size === 0}
                >
                  Clear all
                </Button>
              </div>
            </div>

            {/* Groups list */}
            <div>
              <div className={styles.sectionLabel}>
                {filtered.length} {filtered.length === 1 ? 'group' : 'groups'}
                {searchQuery ? ` matching "${searchQuery}"` : ` in ${room?.floor?.location_name ?? 'this location'}`}
              </div>
              <div className={styles.groupsList}>
                {filtered.length === 0 ? (
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3, padding: tokens.spacingVerticalM }}>
                    No groups match "{searchQuery}"
                  </Text>
                ) : filtered.map(group => {
                  const isSelected = selectedGroupIds.has(group.id);
                  return (
                    <div
                      key={group.id}
                      className={`${styles.groupItem} ${isSelected ? styles.groupItemSelected : ''}`}
                      onClick={() => handleToggle(group.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleToggle(group.id)}
                        onClick={e => e.stopPropagation()}
                      />
                      <div className={styles.groupInfo}>
                        <div className={styles.groupName}>{group.name}</div>
                        {group.description && (
                          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                            {group.description}
                          </Text>
                        )}
                        <div className={styles.groupMeta}>
                          <Badge appearance="outline" size="small">
                            {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
