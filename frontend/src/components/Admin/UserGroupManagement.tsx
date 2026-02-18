import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  Text,
  makeStyles,
  tokens,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Select,
  Spinner,
  Input,
} from '@fluentui/react-components';
import {
  Add20Regular,
  MoreHorizontal20Regular,
  People20Regular,
  Delete20Regular,
  PersonAdd20Regular,
  Edit20Regular,
  Search20Regular,
  BuildingRegular,
} from '@fluentui/react-icons';
import { ContentGrid, Section } from '../Layout';
import { createUserGroupApi, type UserGroupList, type UserGroupDetail } from '../../services/userGroupApi';
import { createLocationApi, type LocationListItem } from '../../services/locationApi';
import { useAuth } from '../../contexts/AuthContext';
import { CreateEditGroupModal } from './Modals/CreateEditGroupModal';
import { ManageGroupMembersModal } from './Modals/ManageGroupMembersModal';

const useStyles = makeStyles({
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalL,
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1,
    minWidth: '180px',
    maxWidth: '280px',
  },
  groupCard: {
    transition: 'box-shadow 0.2s ease',
    ':hover': {
      boxShadow: tokens.shadow8,
    },
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: tokens.spacingVerticalM,
  },
  groupInfo: {
    flex: 1,
    minWidth: 0,
  },
  groupName: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    margin: 0,
    marginBottom: '2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  groupDescription: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginTop: '2px',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    marginTop: tokens.spacingVerticalXS,
  },
  membersSection: {
    marginTop: tokens.spacingVerticalM,
    paddingTop: tokens.spacingVerticalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberCount: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorBrandForeground1,
    lineHeight: '1',
  },
  memberLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  emptyState: {
    textAlign: 'center',
    padding: tokens.spacingVerticalXXL,
    color: tokens.colorNeutralForeground3,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalM,
  },
  loadingState: {
    display: 'flex',
    justifyContent: 'center',
    padding: tokens.spacingVerticalXXL,
  },
  overlay: {
    position: 'fixed',
    inset: '0',
    zIndex: '9999',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});

export const UserGroupManagement: React.FC = () => {
  const styles = useStyles();
  const { authenticatedFetch } = useAuth();

  const groupApi   = createUserGroupApi(authenticatedFetch);
  const locationApi = createLocationApi(authenticatedFetch);

  const [groups, setGroups]               = useState<UserGroupList[]>([]);
  const [locations, setLocations]         = useState<LocationListItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const [selectedLocationId, setSelectedLocationId] = useState<number>(0);
  const [searchQuery, setSearchQuery]               = useState('');

  const [createEditOpen, setCreateEditOpen] = useState(false);
  const [editingGroup, setEditingGroup]     = useState<UserGroupList | null>(null);

  const [membersModalOpen, setMembersModalOpen]   = useState(false);
  const [membersModalGroup, setMembersModalGroup] = useState<UserGroupDetail | null>(null);
  const [loadingDetail, setLoadingDetail]         = useState(false);

  // Load locations once
  useEffect(() => {
    setLoadingLocations(true);
    locationApi.getLocations()
      .then(setLocations)
      .catch(err => console.error('Failed to load locations:', err))
      .finally(() => setLoadingLocations(false));
  }, []);

  // Load groups whenever location filter changes
  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const data = selectedLocationId
        ? await groupApi.getGroupsByLocation(selectedLocationId)
        : await groupApi.getGroups();
      setGroups(data);
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoadingGroups(false);
    }
  }, [selectedLocationId]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  // Client-side search filter
  const filteredGroups = groups.filter(g =>
    !searchQuery.trim() ||
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Create / Edit ──
  const handleOpenCreate = () => { setEditingGroup(null); setCreateEditOpen(true); };
  const handleOpenEdit   = (g: UserGroupList) => { setEditingGroup(g); setCreateEditOpen(true); };

  const handleSaveGroup = async (data: { name: string; description: string; location: number }) => {
    if (editingGroup) {
      const updated = await groupApi.updateGroup(editingGroup.id, {
        name: data.name,
        description: data.description,
      });
      setGroups(prev =>
        prev.map(g => g.id === updated.id ? { ...g, name: updated.name, description: updated.description } : g)
      );
    } else {
      await groupApi.createGroup(data);
      await loadGroups();
    }
  };

  // ── Delete ──
  const handleDeleteGroup = async (group: UserGroupList) => {
    if (!confirm(`Delete "${group.name}"? This cannot be undone.`)) return;
    try {
      await groupApi.deleteGroup(group.id);
      setGroups(prev => prev.filter(g => g.id !== group.id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete group');
    }
  };

  // ── Members ──
  const handleOpenMembers = async (group: UserGroupList) => {
    setLoadingDetail(true);
    setMembersModalOpen(true);
    try {
      const detail = await groupApi.getGroup(group.id);
      setMembersModalGroup(detail);
    } catch (err) {
      console.error('Failed to load group detail:', err);
      setMembersModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAddMembers = async (groupId: number, userIds: number[]) => {
    const updated = await groupApi.addMembers(groupId, userIds);
    setMembersModalGroup(updated);
    setGroups(prev =>
      prev.map(g => g.id === groupId ? { ...g, member_count: updated.members.length } : g)
    );
  };

  const handleRemoveMember = async (groupId: number, userId: number) => {
    const updated = await groupApi.removeMembers(groupId, [userId]);
    setMembersModalGroup(updated);
    setGroups(prev =>
      prev.map(g => g.id === groupId ? { ...g, member_count: updated.members.length } : g)
    );
  };

  return (
    <>
      <Section
        title="User Groups"
        description="Organize users into groups for room access control"
        actions={
          <Button appearance="primary" icon={<Add20Regular />} onClick={handleOpenCreate}>
            Create Group
          </Button>
        }
      >
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <Input
            className={styles.searchInput}
            value={searchQuery}
            onChange={(_, d) => setSearchQuery(d.value)}
            placeholder="Search groups…"
            contentBefore={<Search20Regular />}
          />
          <Select
            value={String(selectedLocationId)}
            onChange={(_, d) => setSelectedLocationId(Number(d.value))}
            disabled={loadingLocations}
          >
            <option value={0}>All Locations</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </Select>
        </div>

        {/* Body */}
        {loadingGroups ? (
          <div className={styles.loadingState}>
            <Spinner size="medium" label="Loading groups…" />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className={styles.emptyState}>
            <People20Regular style={{ fontSize: '48px' }} />
            <Text size={400} weight="semibold">No groups found</Text>
            <Text size={200}>
              {searchQuery
                ? `No groups match "${searchQuery}"`
                : selectedLocationId
                ? 'No groups in this location yet'
                : 'Create your first user group to get started'}
            </Text>
            {!searchQuery && (
              <Button appearance="primary" icon={<Add20Regular />} onClick={handleOpenCreate}>
                Create Group
              </Button>
            )}
          </div>
        ) : (
          <ContentGrid columns="2" gap="l">
            {filteredGroups.map(group => (
              <Card key={group.id} className={styles.groupCard}>
                <div className={styles.groupHeader}>
                  <div className={styles.groupInfo}>
                    <h3 className={styles.groupName} title={group.name}>{group.name}</h3>
                    {group.description && (
                      <div className={styles.groupDescription}>{group.description}</div>
                    )}
                    <div className={styles.metaRow}>
                      <BuildingRegular style={{ fontSize: '12px', color: tokens.colorNeutralForeground3 }} />
                      <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                        {group.location_name}
                      </Text>
                    </div>
                  </div>

                  <Menu>
                    <MenuTrigger disableButtonEnhancement>
                      <Button
                        appearance="subtle"
                        icon={<MoreHorizontal20Regular />}
                        size="small"
                        aria-label="Group options"
                      />
                    </MenuTrigger>
                    <MenuPopover>
                      <MenuList>
                        <MenuItem icon={<Edit20Regular />} onClick={() => handleOpenEdit(group)}>
                          Edit Group
                        </MenuItem>
                        <MenuItem icon={<PersonAdd20Regular />} onClick={() => handleOpenMembers(group)}>
                          Manage Members
                        </MenuItem>
                        <MenuItem icon={<Delete20Regular />} onClick={() => handleDeleteGroup(group)}>
                          Delete Group
                        </MenuItem>
                      </MenuList>
                    </MenuPopover>
                  </Menu>
                </div>

                <div className={styles.membersSection}>
                  <div>
                    <div className={styles.memberCount}>{group.member_count}</div>
                    <div className={styles.memberLabel}>
                      {group.member_count === 1 ? 'member' : 'members'}
                    </div>
                  </div>
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<PersonAdd20Regular />}
                    onClick={() => handleOpenMembers(group)}
                  >
                    Manage
                  </Button>
                </div>
              </Card>
            ))}
          </ContentGrid>
        )}
      </Section>

      {/* Detail loading overlay */}
      {loadingDetail && (
        <div className={styles.overlay}>
          <Spinner size="large" label="Loading group…" />
        </div>
      )}

      {/* Create / Edit modal */}
      <CreateEditGroupModal
        open={createEditOpen}
        onClose={() => setCreateEditOpen(false)}
        group={editingGroup}
        locations={locations}
        defaultLocationId={selectedLocationId || locations[0]?.id}
        onSave={handleSaveGroup}
      />

      {/* Manage members modal */}
      <ManageGroupMembersModal
        open={membersModalOpen && !loadingDetail}
        onClose={() => { setMembersModalOpen(false); setMembersModalGroup(null); }}
        group={membersModalGroup}
        onAddMembers={handleAddMembers}
        onRemoveMember={handleRemoveMember}
      />
    </>
  );
};

export default UserGroupManagement;
