import React, { useState, useEffect, useRef } from 'react';
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
  makeStyles,
  tokens,
  Spinner,
  Avatar,
  Badge,
  Divider,
} from '@fluentui/react-components';
import {
  PersonTag20Regular,
  Search20Regular,
  Dismiss20Regular,
  PersonDelete20Regular,
} from '@fluentui/react-icons';
import { type Desk } from '../../../services/roomApi';
import { useAuth } from '../../../contexts/AuthContext';

const useStyles = makeStyles({
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  currentAssignee: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  assigneeInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  searchContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  searchInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    maxHeight: '220px',
    overflowY: 'auto',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingVerticalXS,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusSmall,
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  resultItemSelected: {
    backgroundColor: tokens.colorBrandBackground2,
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
  },
  userInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  emptySearch: {
    padding: tokens.spacingVerticalL,
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
  deskInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalXS,
  },
});

interface UserSearchResult {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
}

interface AssignPermanentModalProps {
  open: boolean;
  onClose: () => void;
  desk: Desk | null;
  onAssign: (deskId: number, userId: number) => Promise<void>;
  onClear: (deskId: number) => Promise<void>;
}

export const AssignPermanentModal: React.FC<AssignPermanentModalProps> = ({
  open,
  onClose,
  desk,
  onAssign,
  onClear,
}) => {
  const styles = useStyles();
  const { authenticatedFetch } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSelectedUser(null);
    }
  }, [open]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const response = await authenticatedFetch(
          `${API_BASE_URL}/users/?search=${encodeURIComponent(query)}`
        );
        if (response.ok) {
          const data = await response.json();
          setResults(data.results ?? data);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query]);

  const handleAssign = async () => {
    if (!desk || !selectedUser) return;
    try {
      setSaving(true);
      await onAssign(desk.id, selectedUser.id);
      onClose();
    } catch (err) {
      console.error('Failed to assign:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!desk) return;
    try {
      setClearing(true);
      await onClear(desk.id);
      onClose();
    } catch (err) {
      console.error('Failed to clear:', err);
    } finally {
      setClearing(false);
    }
  };

  const currentAssigneeName = desk?.permanent_assignee_full_name || desk?.permanent_assignee_username;

  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && onClose()}>
      <DialogSurface style={{ maxWidth: '500px' }}>
        <DialogBody>
          <DialogTitle>Permanent Desk Assignment</DialogTitle>

          <DialogContent>
            <div className={styles.content}>
              {/* Desk Info */}
              <div className={styles.deskInfo}>
                <PersonTag20Regular style={{ color: tokens.colorBrandForeground1 }} />
                <Text size={300} weight="semibold">{desk?.name}</Text>
                {desk?.is_permanent && (
                  <Badge appearance="filled" color="brand" size="small">Currently Permanent</Badge>
                )}
              </div>

              {/* Current Assignee */}
              {desk?.is_permanent && currentAssigneeName && (
                <>
                  <div className={styles.currentAssignee}>
                    <Avatar
                      name={currentAssigneeName}
                      color="brand"
                      size={36}
                    />
                    <div className={styles.assigneeInfo}>
                      <Text size={300} weight="semibold">{currentAssigneeName}</Text>
                      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                        @{desk.permanent_assignee_username}
                      </Text>
                    </div>
                    <Button
                      appearance="subtle"
                      icon={<PersonDelete20Regular />}
                      onClick={handleClear}
                      disabled={clearing}
                      size="small"
                    >
                      {clearing ? 'Clearing...' : 'Remove'}
                    </Button>
                  </div>
                  <Divider>or reassign to</Divider>
                </>
              )}

              {/* User Search */}
              <div className={styles.searchContainer}>
                <Text size={200} weight="semibold">
                  {desk?.is_permanent ? 'Reassign to another user' : 'Search for a user to assign'}
                </Text>
                <div className={styles.searchInputWrapper}>
                  <Input
                    value={query}
                    onChange={(_, d) => {
                      setQuery(d.value);
                      setSelectedUser(null);
                    }}
                    placeholder="Search by name or username…"
                    contentBefore={<Search20Regular />}
                    contentAfter={
                      query ? (
                        <Button
                          appearance="transparent"
                          size="small"
                          icon={<Dismiss20Regular />}
                          onClick={() => { setQuery(''); setResults([]); setSelectedUser(null); }}
                        />
                      ) : undefined
                    }
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Results */}
                {(searching || results.length > 0 || (query.length >= 2 && !searching)) && (
                  <div className={styles.resultsList}>
                    {searching ? (
                      <div className={styles.emptySearch}>
                        <Spinner size="tiny" label="Searching…" />
                      </div>
                    ) : results.length === 0 ? (
                      <div className={styles.emptySearch}>
                        <Text size={200}>No users found for "{query}"</Text>
                      </div>
                    ) : (
                      results.map((user) => (
                        <div
                          key={user.id}
                          className={`${styles.resultItem} ${selectedUser?.id === user.id ? styles.resultItemSelected : ''}`}
                          onClick={() => setSelectedUser(user)}
                        >
                          <Avatar name={user.full_name || user.username} size={28} />
                          <div className={styles.userInfo}>
                            <Text size={300} weight="semibold">
                              {user.full_name || user.username}
                            </Text>
                            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                              @{user.username}
                            </Text>
                          </div>
                          {selectedUser?.id === user.id && (
                            <Badge appearance="filled" color="brand" size="small">Selected</Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>

          <DialogActions>
            <Button appearance="secondary" onClick={onClose} disabled={saving || clearing}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              icon={<PersonTag20Regular />}
              onClick={handleAssign}
              disabled={!selectedUser || saving}
            >
              {saving ? 'Assigning…' : `Assign${selectedUser ? ` to ${selectedUser.full_name || selectedUser.username}` : ''}`}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};