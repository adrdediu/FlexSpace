import React, { useState } from 'react';
import {
  Button,
  Card,
  Text,
  Badge,
  makeStyles,
  tokens,
  Avatar,
  AvatarGroup,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Select,
} from '@fluentui/react-components';
import {
  Add20Regular,
  MoreHorizontal20Regular,
  People20Regular,
  Delete20Regular,
  PersonAdd20Regular,
  Edit20Regular,
} from '@fluentui/react-icons';
import { ContentGrid, Section } from '../Layout';

const useStyles = makeStyles({
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
  },
  groupName: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    margin: 0,
    marginBottom: tokens.spacingVerticalXXS,
  },
  groupDescription: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginTop: '2px',
  },
  groupLocation: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    marginTop: '4px',
  },
  membersSection: {
    marginTop: tokens.spacingVerticalM,
    paddingTop: tokens.spacingVerticalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  membersHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacingVerticalS,
  },
  memberCount: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorBrandForeground1,
  },
  filterSection: {
    marginBottom: tokens.spacingVerticalL,
  },
  emptyState: {
    textAlign: 'center',
    padding: tokens.spacingVerticalXXL,
    color: tokens.colorNeutralForeground3,
  },
});

// Mock data
const mockGroups = [
  {
    id: 1,
    name: 'Engineering Team',
    description: 'Software engineers and developers',
    location: 'San Francisco Office',
    locationId: 1,
    memberCount: 24,
    members: [
      { id: 1, name: 'John Doe', initials: 'JD' },
      { id: 2, name: 'Jane Smith', initials: 'JS' },
      { id: 3, name: 'Bob Johnson', initials: 'BJ' },
    ],
  },
  {
    id: 2,
    name: 'Marketing Team',
    description: 'Marketing and communications',
    location: 'San Francisco Office',
    locationId: 1,
    memberCount: 12,
    members: [
      { id: 4, name: 'Alice Brown', initials: 'AB' },
      { id: 5, name: 'Charlie Davis', initials: 'CD' },
    ],
  },
  {
    id: 3,
    name: 'Design Team',
    description: 'UX/UI designers',
    location: 'London Office',
    locationId: 2,
    memberCount: 8,
    members: [
      { id: 6, name: 'Eve Wilson', initials: 'EW' },
    ],
  },
];

const mockLocations = [
  { id: 0, name: 'All Locations' },
  { id: 1, name: 'San Francisco Office' },
  { id: 2, name: 'London Office' },
  { id: 3, name: 'Tokyo Office' },
];

export const UserGroupManagement: React.FC = () => {
  const styles = useStyles();
  const [groups] = useState(mockGroups);
  const [selectedLocation, setSelectedLocation] = useState<number>(0);

  const filteredGroups = selectedLocation === 0
    ? groups
    : groups.filter(g => g.locationId === selectedLocation);

  const handleCreateGroup = () => {
    console.log('Create group');
    // TODO: Open modal to create new group
  };

  const handleEditGroup = (groupId: number) => {
    console.log('Edit group:', groupId);
    // TODO: Open modal to edit group
  };

  const handleAddMembers = (groupId: number) => {
    console.log('Add members to group:', groupId);
    // TODO: Open modal to add members
  };

  const handleDeleteGroup = (groupId: number) => {
    console.log('Delete group:', groupId);
    // TODO: Show confirmation and delete
  };

  return (
    <>
      <Section
        title="User Groups"
        description="Organize users into groups for access control"
        actions={
          <Button
            appearance="primary"
            icon={<Add20Regular />}
            onClick={handleCreateGroup}
          >
            Create Group
          </Button>
        }
      >
        <div className={styles.filterSection}>
          <Select
            value={String(selectedLocation)}
            onChange={(e) => setSelectedLocation(Number(e.target.value))}
          >
            {mockLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </Select>
        </div>

        {filteredGroups.length === 0 ? (
          <div className={styles.emptyState}>
            <People20Regular style={{ fontSize: '48px', marginBottom: '16px' }} />
            <Text size={400}>No groups found</Text>
            <br />
            <Text size={200}>
              {selectedLocation === 0
                ? 'Create your first user group to get started'
                : 'No groups in this location'}
            </Text>
          </div>
        ) : (
          <ContentGrid columns="2" gap="l">
            {filteredGroups.map((group) => (
              <Card key={group.id} className={styles.groupCard}>
                <div className={styles.groupHeader}>
                  <div className={styles.groupInfo}>
                    <h3 className={styles.groupName}>{group.name}</h3>
                    {group.description && (
                      <div className={styles.groupDescription}>{group.description}</div>
                    )}
                    <div className={styles.groupLocation}>
                      <Badge appearance="outline" size="small">
                        {group.location}
                      </Badge>
                    </div>
                  </div>
                  <Menu>
                    <MenuTrigger disableButtonEnhancement>
                      <Button
                        appearance="subtle"
                        icon={<MoreHorizontal20Regular />}
                        aria-label="More options"
                      />
                    </MenuTrigger>
                    <MenuPopover>
                      <MenuList>
                        <MenuItem
                          icon={<Edit20Regular />}
                          onClick={() => handleEditGroup(group.id)}
                        >
                          Edit Group
                        </MenuItem>
                        <MenuItem
                          icon={<PersonAdd20Regular />}
                          onClick={() => handleAddMembers(group.id)}
                        >
                          Add Members
                        </MenuItem>
                        <MenuItem
                          icon={<Delete20Regular />}
                          onClick={() => handleDeleteGroup(group.id)}
                        >
                          Delete Group
                        </MenuItem>
                      </MenuList>
                    </MenuPopover>
                  </Menu>
                </div>

                <div className={styles.membersSection}>
                  <div className={styles.membersHeader}>
                    <Text size={200} weight="semibold">Members</Text>
                    <div className={styles.memberCount}>{group.memberCount}</div>
                  </div>
                  <AvatarGroup layout="stack" size={32}>
                    {group.members.map((member) => (
                      <Avatar
                        key={member.id}
                        name={member.name}
                        initials={member.initials}
                      />
                    ))}
                    {group.memberCount > group.members.length && (
                      <Avatar
                        name={`+${group.memberCount - group.members.length} more`}
                        initials={`+${group.memberCount - group.members.length}`}
                      />
                    )}
                  </AvatarGroup>
                </div>
              </Card>
            ))}
          </ContentGrid>
        )}
      </Section>
    </>
  );
};

export default UserGroupManagement;