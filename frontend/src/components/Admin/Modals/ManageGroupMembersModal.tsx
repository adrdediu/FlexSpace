import React, { useState, useEffect } from 'react';
import {
  makeStyles,
  tokens,
  Avatar,
  Button,
  Text,
  Input,
  Field,
  Spinner,
  Badge,
} from '@fluentui/react-components';
import {
  Dismiss20Regular,
  PersonAdd20Regular,
  Search20Regular,
  People20Regular,
} from '@fluentui/react-icons';
import { Modal } from '../../Common/Modal';
import { type UserGroupDetail, type GroupMember } from '../../../services/userGroupApi';
import { createUserSearchApi, type User } from '../../../services/userSearchApi';
import { useAuth } from '../../../contexts/AuthContext';

const useStyles = makeStyles({
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  sectionTitle: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    paddingBottom: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  memberList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    maxHeight: '220px',
    overflowY: 'auto',
  },
  memberItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  memberInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  searchSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  searchResults: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    maxHeight: '200px',
    overflowY: 'auto',
  },
  searchResultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
  },
  emptyState: {
    textAlign: 'center',
    padding: tokens.spacingVerticalL,
    color: tokens.colorNeutralForeground3,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalS,
  },
  loadingState: {
    display: 'flex',
    justifyContent: 'center',
    padding: tokens.spacingVerticalM,
  },
});

interface ManageGroupMembersModalProps {
  open: boolean;
  onClose: () => void;
  group: UserGroupDetail | null;
  onAddMembers: (groupId: number, userIds: number[]) => Promise<void>;
  onRemoveMember: (groupId: number, userId: number) => Promise<void>;
}

export const ManageGroupMembersModal: React.FC<ManageGroupMembersModalProps> = ({
  open,
  onClose,
  group,
  onAddMembers,
  onRemoveMember,
}) => {
  const styles = useStyles();
  const { authenticatedFetch } = useAuth();
  const userSearchApi = createUserSearchApi(authenticatedFetch);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset search on open/close
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await userSearchApi.searchUsers(searchQuery);
        // Filter out users already in the group
        const currentIds = new Set(group?.members.map(m => m.id) ?? []);
        setSearchResults(results.filter(u => !currentIds.has(u.id)));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, group?.members]);

  const handleAdd = async (user: User) => {
    if (!group) return;
    setSubmitting(true);
    try {
      await onAddMembers(group.id, [user.id]);
      // Remove from search results immediately
      setSearchResults(prev => prev.filter(u => u.id !== user.id));
    } catch (err: any) {
      alert(err.message || 'Failed to add member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (member: GroupMember) => {
    if (!group) return;
    if (!confirm(`Remove ${member.full_name} from this group?`)) return;
    setSubmitting(true);
    try {
      await onRemoveMember(group.id, member.id);
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    } finally {
      setSubmitting(false);
    }
  };

  if (!group) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage Members"
      subtitle={`${group.name} · ${group.location_name}`}
      size="medium"
      actions={[{ label: 'Done', onClick: onClose, appearance: 'primary' }]}
    >
      <div className={styles.content}>

        {/* Current Members */}
        <div>
          <div className={styles.sectionTitle}>
            Current Members
            <Badge appearance="filled" color="brand" size="small">
              {group.members.length}
            </Badge>
          </div>

          {group.members.length === 0 ? (
            <div className={styles.emptyState}>
              <People20Regular style={{ fontSize: '32px' }} />
              <Text size={200}>No members yet. Add some below.</Text>
            </div>
          ) : (
            <div className={styles.memberList}>
              {group.members.map(member => (
                <div key={member.id} className={styles.memberItem}>
                  <Avatar
                    name={member.full_name}
                    initials={`${member.first_name?.[0] ?? ''}${member.last_name?.[0] ?? ''}`}
                    size={32}
                  />
                  <div className={styles.memberInfo}>
                    <Text weight="semibold" size={300}>{member.full_name}</Text>
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                      {member.email || member.username}
                    </Text>
                  </div>
                  <Button
                    appearance="subtle"
                    icon={<Dismiss20Regular />}
                    size="small"
                    disabled={submitting}
                    onClick={() => handleRemove(member)}
                    aria-label={`Remove ${member.full_name}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Members */}
        <div>
          <div className={styles.sectionTitle}>Add Members</div>

          <div className={styles.searchSection}>
            <Field label="Search users">
              <Input
                value={searchQuery}
                onChange={(_, d) => setSearchQuery(d.value)}
                placeholder="Search by name, email, or username…"
                contentBefore={<Search20Regular />}
                disabled={submitting}
              />
            </Field>

            {searching && (
              <div className={styles.loadingState}>
                <Spinner size="tiny" label="Searching…" />
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <div className={styles.searchResults}>
                {searchResults.map(user => (
                  <div
                    key={user.id}
                    className={styles.searchResultItem}
                    onClick={() => !submitting && handleAdd(user)}
                  >
                    <Avatar
                      name={user.full_name}
                      initials={`${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`}
                      size={32}
                    />
                    <div style={{ flex: 1 }}>
                      <Text weight="semibold" size={300}>{user.full_name}</Text>
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
                      onClick={e => { e.stopPropagation(); handleAdd(user); }}
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
        </div>

      </div>
    </Modal>
  );
};

export default ManageGroupMembersModal;
