import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Text,
  Badge,
  makeStyles,
  tokens,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Spinner,
  Dropdown,
  Option,
  Field,
} from '@fluentui/react-components';
import {
  Add20Regular,
  MoreHorizontal20Regular,
  People20Regular,
  Door20Regular,
  Settings20Regular,
  Delete20Regular,
  Image20Regular,
  Desk20Regular,
} from '@fluentui/react-icons';
import { ContentGrid, Section } from '../Layout';
import { createRoomApi, type RoomListItem, type RoomWithDesks } from '../../services/roomApi';
import { useAuth } from '../../contexts/AuthContext';
import { 
  AddRoomModal, 
  ManageRoomModal, 
  ManageRoomManagersModal,
  ManageAllowedGroupsModal,
  UploadRoomMapModal,
  ManageDesksModal
} from './Modals/index';

const useStyles = makeStyles({
  roomCard: {
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: tokens.shadow8,
    },
  },
  filterContainer: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalL,
    alignItems: 'flex-end',
  },
  filterField: {
    minWidth: '200px',
  },
  roomHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalM,
  },
  roomIcon: {
    width: '48px',
    height: '48px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundInverted,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    margin: 0,
  },
  roomLocation: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginTop: '2px',
  },
  roomDescription: {
    marginTop: tokens.spacingVerticalS,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  statsRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalL,
    marginTop: tokens.spacingVerticalM,
    paddingTop: tokens.spacingVerticalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  statValue: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorBrandForeground1,
  },
  statLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  managerBadge: {
    marginTop: tokens.spacingVerticalM,
  },
  emptyState: {
    textAlign: 'center',
    padding: tokens.spacingVerticalXXL,
    color: tokens.colorNeutralForeground3,
  },
  loadingState: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacingVerticalXXL,
  },
  errorState: {
    textAlign: 'center',
    padding: tokens.spacingVerticalXXL,
    color: tokens.colorPaletteRedForeground1,
  },
});

export interface RoomManagementProps {
  /**
   * Optional floor ID to filter rooms
   */
  floorId?: number;
  /**
   * Callback when a room is selected
   */
  onRoomClick?: (roomId: number) => void;
}

/**
 * RoomManagement - Manage rooms and room managers
 * 
 * Features:
 * - View all managed rooms in a card grid
 * - Create new rooms (location managers only)
 * - Edit room details
 * - Manage room managers
 * - Control user group access
 * - Upload/delete room maps
 * - Delete rooms (location managers only)
 */
export const RoomManagement: React.FC<RoomManagementProps> = ({
  floorId,
  onRoomClick,
}) => {
  const styles = useStyles();
  const { authenticatedFetch, user } = useAuth();
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [locations, setLocations] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>(undefined);
  const [selectedFloorId, setSelectedFloorId] = useState<number | undefined>(floorId);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingFloors, setLoadingFloors] = useState(false);
  
  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [managersModalOpen, setManagersModalOpen] = useState(false);
  const [groupsModalOpen, setGroupsModalOpen] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [desksModalOpen, setDesksModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomWithDesks | null>(null);

  // Create API instance with authenticatedFetch
  const roomApi = createRoomApi(authenticatedFetch);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all rooms - backend returns only managed rooms based on user permissions
      const allRooms = await roomApi.getRooms();
      
      // Only apply client-side filtering for superusers and staff
      if (user?.is_superuser || user?.is_staff) {
        let filteredRooms = allRooms;
        
        if (selectedFloorId) {
          // Filter by specific floor
          filteredRooms = allRooms.filter(room => room.floor === selectedFloorId);
        } else if (selectedLocationId) {
          // Filter by location (match location_name since we don't have location_id in RoomListItem)
          const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
          if (selectedLocation) {
            filteredRooms = allRooms.filter(room => room.location_name === selectedLocation.name);
          }
        }
        
        setRooms(filteredRooms);
      } else {
        // For location managers and room managers, show all their managed rooms without filtering
        setRooms(allRooms);
      }
    } catch (err: any) {
      console.error('Error fetching rooms:', err);
      setError(err.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomDetails = async (id: number) => {
    try {
      const details = await roomApi.getRoom(id);
      setSelectedRoom(details);
    } catch (err: any) {
      console.error('Error fetching room details:', err);
      alert(err.message || 'Failed to load room details');
    }
  };

  useEffect(() => {
    // Only fetch locations for superusers and staff
    if (user?.is_superuser || user?.is_staff) {
      fetchLocations();
    } else {
      // For location managers and room managers, fetch rooms directly
      // The backend will return only their managed rooms
      fetchRooms();
    }
  }, [user]);

  useEffect(() => {
    if (selectedLocationId) {
      fetchFloorsForLocation(selectedLocationId);
    } else {
      setFloors([]);
      setSelectedFloorId(undefined);
    }
  }, [selectedLocationId]);

  useEffect(() => {
    // Fetch rooms when filters change or when locations are loaded (for superusers/staff)
    if (user?.is_superuser || user?.is_staff) {
      if (locations.length > 0) {
        fetchRooms();
      }
    }
  }, [selectedFloorId, selectedLocationId, locations, user]);

  const fetchLocations = async () => {
    try {
      setLoadingLocations(true);
      const response = await authenticatedFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/admin/locations/`);
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      const data = await response.json();
      setLocations(data);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchFloorsForLocation = async (locationId: number) => {
    try {
      setLoadingFloors(true);
      const response = await authenticatedFetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/floors/?location=${locationId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch floors');
      }
      const data = await response.json();
      setFloors(data);
    } catch (err) {
      console.error('Failed to fetch floors:', err);
      setFloors([]);
    } finally {
      setLoadingFloors(false);
    }
  };

  const handleAddRoom = () => {
    setAddModalOpen(true);
  };

  const handleCreateRoom = async (data: any) => {
    try {
      await roomApi.createRoom(data);
      await fetchRooms();
    } catch (err: any) {
      alert(err.message || 'Failed to create room');
      throw err;
    }
  };

  const handleManageRoom = async (roomId: number) => {
    await fetchRoomDetails(roomId);
    setManageModalOpen(true);
  };

  const handleUpdateRoom = async (id: number, data: Partial<RoomWithDesks>) => {
    try {
      await roomApi.updateRoom(id, data);
      await fetchRooms();
    } catch (err: any) {
      alert(err.message || 'Failed to update room');
      throw err;
    }
  };

  const handleManageManagers = async (roomId: number) => {
    await fetchRoomDetails(roomId);
    setManagersModalOpen(true);
  };

  const handleAddManagers = async (roomId: number, userIds: number[]) => {
    try {
      await roomApi.addManagers(roomId, userIds);
      await fetchRoomDetails(roomId);
      await fetchRooms();
    } catch (err: any) {
      alert(err.message || 'Failed to add managers');
      throw err;
    }
  };

  const handleRemoveManager = async (roomId: number, userIds: number[]) => {
    try {
      await roomApi.removeManagers(roomId, userIds);
      await fetchRoomDetails(roomId);
      await fetchRooms();
    } catch (err: any) {
      alert(err.message || 'Failed to remove manager');
      throw err;
    }
  };

  const handleManageGroups = async (roomId: number) => {
    await fetchRoomDetails(roomId);
    setGroupsModalOpen(true);
  };

  const handleSetAllowedGroups = async (roomId: number, groupIds: number[]) => {
    try {
      await roomApi.setAllowedGroups(roomId, groupIds);
      await fetchRoomDetails(roomId);
      await fetchRooms();
    } catch (err: any) {
      alert(err.message || 'Failed to update allowed groups');
      throw err;
    }
  };

  const handleManageMap = async (roomId: number) => {
    await fetchRoomDetails(roomId);
    setMapModalOpen(true);
  };

  const handleManageDesks = async (roomId: number) => {
    await fetchRoomDetails(roomId);
    setDesksModalOpen(true);
  };

  const handleUploadMap = async (roomId: number, file: File) => {
    try {
      await roomApi.uploadMap(roomId, file);
      await fetchRoomDetails(roomId);
      await fetchRooms();
    } catch (err: any) {
      alert(err.message || 'Failed to upload map');
      throw err;
    }
  };

  const handleDeleteMap = async (roomId: number) => {
    try {
      await roomApi.deleteMap(roomId);
      await fetchRoomDetails(roomId);
      await fetchRooms();
    } catch (err: any) {
      alert(err.message || 'Failed to delete map');
      throw err;
    }
  };

  const handleDeleteRoom = async (roomId: number) => {
    if (!confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
      return;
    }

    try {
      await roomApi.deleteRoom(roomId);
      await fetchRooms();
    } catch (err: any) {
      console.error('Error deleting room:', err);
      alert(err.message || 'Failed to delete room');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Spinner size="large" label="Loading rooms..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <Text size={400}>{error}</Text>
        <br />
        <Button appearance="primary" onClick={fetchRooms} style={{ marginTop: '16px' }}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <Section
        title="Managed Rooms"
        description="Rooms where you have management access"
        actions={
          user?.is_location_manager ? (
            <Button
              appearance="primary"
              icon={<Add20Regular />}
              onClick={handleAddRoom}
            >
              Add Room
            </Button>
          ) : undefined
        }
      >
        {/* Filter Controls - Only show for superusers and staff */}
        {(user?.is_superuser || user?.is_staff) && (
          <div className={styles.filterContainer}>
            <Field label="Filter by Location" className={styles.filterField}>
              <Dropdown
                placeholder="All Locations"
                value={locations.find(l => l.id === selectedLocationId)?.name || ''}
                selectedOptions={selectedLocationId ? [selectedLocationId.toString()] : []}
                onOptionSelect={(_, data) => {
                  if (data.optionValue === 'all') {
                    setSelectedLocationId(undefined);
                  } else {
                    setSelectedLocationId(Number(data.optionValue));
                  }
                }}
                disabled={loadingLocations}
              >
                <Option value="all">All Locations</Option>
                {locations.map((location) => (
                  <Option key={location.id} value={location.id.toString()}>
                    {location.name}
                  </Option>
                ))}
              </Dropdown>
            </Field>

            <Field label="Filter by Floor" className={styles.filterField}>
              <Dropdown
                placeholder={
                  !selectedLocationId 
                    ? 'Select a location first' 
                    : loadingFloors 
                    ? 'Loading floors...' 
                    : 'All Floors'
                }
                value={floors.find(f => f.id === selectedFloorId)?.name || ''}
                selectedOptions={selectedFloorId ? [selectedFloorId.toString()] : []}
                onOptionSelect={(_, data) => {
                  if (data.optionValue === 'all') {
                    setSelectedFloorId(undefined);
                  } else {
                    setSelectedFloorId(Number(data.optionValue));
                  }
                }}
                disabled={!selectedLocationId || loadingFloors}
              >
                <Option value="all">All Floors</Option>
                {floors.map((floor) => (
                  <Option key={floor.id} value={floor.id.toString()}>
                    {floor.name}
                  </Option>
                ))}
              </Dropdown>
            </Field>

            {(selectedLocationId || selectedFloorId) && (
              <Button
                appearance="subtle"
                onClick={() => {
                  setSelectedLocationId(undefined);
                  setSelectedFloorId(undefined);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {rooms.length === 0 ? (
          <div className={styles.emptyState}>
            <Door20Regular style={{ fontSize: '48px', marginBottom: '16px' }} />
            <Text size={400}>No rooms found</Text>
            <br />
            <Text size={200}>
              {user?.is_location_manager 
                ? 'Create your first room to get started' 
                : 'You have no rooms assigned yet'}
            </Text>
          </div>
        ) : (
          <ContentGrid columns="2" gap="l">
            {rooms.map((room) => (
              <Card
                key={room.id}
                className={styles.roomCard}
                onClick={() => onRoomClick?.(room.id)}
              >
                <div className={styles.roomHeader}>
                  <div className={styles.roomIcon}>
                    <Door20Regular />
                  </div>
                  <div className={styles.roomInfo}>
                    <h3 className={styles.roomName}>{room.name}</h3>
                    <div className={styles.roomLocation}>
                      {room.floor_name} • {room.location_name}
                    </div>
                  </div>
                  <Menu>
                    <MenuTrigger disableButtonEnhancement>
                      <Button
                        appearance="subtle"
                        icon={<MoreHorizontal20Regular />}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="More options"
                      />
                    </MenuTrigger>
                    <MenuPopover>
                      <MenuList>
                        <MenuItem
                          icon={<Settings20Regular />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManageRoom(room.id);
                          }}
                        >
                          Manage Room
                        </MenuItem>
                        <MenuItem
                          icon={<People20Regular />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManageManagers(room.id);
                          }}
                        >
                          Manage Managers
                        </MenuItem>
                        <MenuItem
                          icon={<People20Regular />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManageGroups(room.id);
                          }}
                        >
                          Allowed Groups
                        </MenuItem>
                        <MenuItem
                          icon={<Image20Regular />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManageMap(room.id);
                          }}
                        >
                          Room Map
                        </MenuItem>
                        <MenuItem
                          icon={<Desk20Regular />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManageDesks(room.id);
                          }}
                        >
                          Manage Desks
                        </MenuItem>
                        {user?.is_location_manager && (
                          <MenuItem
                            icon={<Delete20Regular />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRoom(room.id);
                            }}
                          >
                            Delete Room
                          </MenuItem>
                        )}
                      </MenuList>
                    </MenuPopover>
                  </Menu>
                </div>

                {room.description && (
                  <div className={styles.roomDescription}>
                    <Text size={200}>{room.description}</Text>
                  </div>
                )}

                <div className={styles.statsRow}>
                  <div className={styles.stat}>
                    <div className={styles.statValue}>{room.desk_count}</div>
                    <div className={styles.statLabel}>Total Desks</div>
                  </div>
                  <div className={styles.stat}>
                    <div className={styles.statValue}>{room.available_desk_count}</div>
                    <div className={styles.statLabel}>Available</div>
                  </div>
                </div>

                {room.is_manager && (
                  <div className={styles.managerBadge}>
                    <Badge appearance="filled" color="brand" size="small">
                      You are a Manager
                    </Badge>
                  </div>
                )}
              </Card>
            ))}
          </ContentGrid>
        )}
      </Section>

      {/* Modals */}
      <AddRoomModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleCreateRoom}
        floorId={selectedFloorId}
      />

      <ManageRoomModal
        open={manageModalOpen}
        onClose={() => {
          setManageModalOpen(false);
          setSelectedRoom(null);
        }}
        room={selectedRoom}
        onUpdate={handleUpdateRoom}
      />

      <ManageRoomManagersModal
        open={managersModalOpen}
        onClose={() => {
          setManagersModalOpen(false);
          setSelectedRoom(null);
        }}
        room={selectedRoom}
        onAddManagers={handleAddManagers}
        onRemoveManager={handleRemoveManager}
      />

      <ManageAllowedGroupsModal
        open={groupsModalOpen}
        onClose={() => {
          setGroupsModalOpen(false);
          setSelectedRoom(null);
        }}
        room={selectedRoom}
        onSetGroups={handleSetAllowedGroups}
      />

      <UploadRoomMapModal
        open={mapModalOpen}
        onClose={() => {
          setMapModalOpen(false);
          setSelectedRoom(null);
        }}
        room={selectedRoom}
        onUploadMap={handleUploadMap}
        onDeleteMap={handleDeleteMap}
      />

      <ManageDesksModal
        open={desksModalOpen}
        onClose={() => {
          setDesksModalOpen(false);
          setSelectedRoom(null);
        }}
        room={selectedRoom}
        onRefresh={async () => {
          if (selectedRoom) {
            await fetchRoomDetails(selectedRoom.id);
          }
          await fetchRooms();
        }}
      />
    </>
  );
};

export default RoomManagement;