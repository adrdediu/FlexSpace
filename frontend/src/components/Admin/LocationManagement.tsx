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
} from '@fluentui/react-components';
import {
  Add20Regular,
  MoreHorizontal20Regular,
  People20Regular,
  Building20Regular,
  Settings20Regular,
  Delete20Regular,
  LockClosed20Regular,
} from '@fluentui/react-icons';
import { ContentGrid, Section } from '../Layout';
import { createLocationApi, type LocationListItem, type Location } from '../../services/locationApi';
import { useAuth } from '../../contexts/AuthContext';
import { 
  AddLocationModal, 
  ManageLocationModal, 
  ManageLocationManagersModal 
} from './Modals/index';
import { ManageLocationAllowedGroupsModal } from './Modals/ManageLocationAllowedGroupsModal';

const useStyles = makeStyles({
  locationCard: {
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: tokens.shadow8,
    },
  },
  locationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalM,
  },
  locationIcon: {
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
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    margin: 0,
  },
  locationCountry: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginTop: '2px',
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

export interface LocationManagementProps {
  /**
   * Callback when a location is selected
   */
  onLocationClick?: (locationId: number) => void;
}

/**
 * LocationManagement - Manage locations and location managers
 */
export const LocationManagement: React.FC<LocationManagementProps> = ({
  onLocationClick,
}) => {
  const styles = useStyles();
  const { authenticatedFetch, user } = useAuth();
  const [locations, setLocations] = useState<LocationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [managersModalOpen, setManagersModalOpen] = useState(false);
  const [groupsModalOpen, setGroupsModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  // Create API instance with authenticatedFetch
  const locationApi = createLocationApi(authenticatedFetch);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await locationApi.getLocations();
      setLocations(data);
    } catch (err: any) {
      console.error('Error fetching locations:', err);
      setError(err.message || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationDetails = async (id: number) => {
    try {
      const details = await locationApi.getLocation(id);
      setSelectedLocation(details);
    } catch (err: any) {
      console.error('Error fetching location details:', err);
      alert(err.message || 'Failed to load location details');
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleAddLocation = () => {
    setAddModalOpen(true);
  };

  const handleCreateLocation = async (data: any) => {
    try {
      await locationApi.createLocation(data);
      await fetchLocations();
    } catch (err: any) {
      alert(err.message || 'Failed to create location');
      throw err;
    }
  };

  const handleManageLocation = async (locationId: number) => {
    await fetchLocationDetails(locationId);
    setManageModalOpen(true);
  };

  const handleUpdateLocation = async (id: number, data: Partial<Location>) => {
    try {
      await locationApi.updateLocation(id, data);
      await fetchLocations();
    } catch (err: any) {
      alert(err.message || 'Failed to update location');
      throw err;
    }
  };

  const handleTogglePermissions = async (id: number, allow: boolean) => {
    try {
      await locationApi.toggleRoomManagerPermissions(id, allow);
      await fetchLocations();
    } catch (err: any) {
      alert(err.message || 'Failed to update permissions');
      throw err;
    }
  };

  const handleManageGroups = async (locationId: number) => {
    await fetchLocationDetails(locationId);
    setGroupsModalOpen(true);
  };

  const handleSetAllowedGroups = async (locationId: number, groupIds: number[]) => {
    try {
      const updated = await locationApi.setAllowedGroups(locationId, groupIds);
      setSelectedLocation(updated);
      await fetchLocations();
    } catch (err: any) {
      alert(err.message || 'Failed to update allowed groups');
      throw err;
    }
  };

  const handleManageManagers = async (locationId: number) => {
    await fetchLocationDetails(locationId);
    setManagersModalOpen(true);
  };

  const handleAddManagers = async (locationId: number, userIds: number[]) => {
    try {
      await locationApi.addManagers(locationId, userIds);
      await fetchLocationDetails(locationId);
      await fetchLocations();
    } catch (err: any) {
      alert(err.message || 'Failed to add managers');
      throw err;
    }
  };

  const handleRemoveManager = async (locationId: number, userIds: number[]) => {
    try {
      await locationApi.removeManagers(locationId, userIds);
      await fetchLocationDetails(locationId);
      await fetchLocations();
    } catch (err: any) {
      alert(err.message || 'Failed to remove manager');
      throw err;
    }
  };

  const handleDeleteLocation = async (locationId: number) => {
    if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      return;
    }

    try {
      await locationApi.deleteLocation(locationId);
      await fetchLocations();
    } catch (err: any) {
      console.error('Error deleting location:', err);
      alert(err.message || 'Failed to delete location');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Spinner size="large" label="Loading locations..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <Text size={400}>{error}</Text>
        <br />
        <Button appearance="primary" onClick={fetchLocations} style={{ marginTop: '16px' }}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <Section
        title="Managed Locations"
        description="Locations where you have management access"
        actions={
          user?.is_superuser ? (
            <Button
              appearance="primary"
              icon={<Add20Regular />}
              onClick={handleAddLocation}
            >
              Add Location
            </Button>
          ) : undefined
        }
      >
        {locations.length === 0 ? (
          <div className={styles.emptyState}>
            <Building20Regular style={{ fontSize: '48px', marginBottom: '16px' }} />
            <Text size={400}>No locations found</Text>
            <br />
            <Text size={200}>Create your first location to get started</Text>
          </div>
        ) : (
          <ContentGrid columns="2" gap="l">
            {locations.map((location) => (
              <Card
                key={location.id}
                className={styles.locationCard}
                onClick={() => onLocationClick?.(location.id)}
              >
                <div className={styles.locationHeader}>
                  <div className={styles.locationIcon}>
                    <Building20Regular />
                  </div>
                  <div className={styles.locationInfo}>
                    <h3 className={styles.locationName}>{location.name}</h3>
                    <div className={styles.locationCountry}>{location.country_name}</div>
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
                            handleManageLocation(location.id);
                          }}
                        >
                          Manage Location
                        </MenuItem>
                        <MenuItem
                          icon={<People20Regular />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManageManagers(location.id);
                          }}
                        >
                          Manage Managers
                        </MenuItem>
                        <MenuItem
                          icon={<LockClosed20Regular />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManageGroups(location.id);
                          }}
                        >
                          Allowed Groups
                        </MenuItem>
                        {user?.is_superuser && (
                          <MenuItem
                            icon={<Delete20Regular />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLocation(location.id);
                            }}
                          >
                            Delete Location
                          </MenuItem>
                        )}
                      </MenuList>
                    </MenuPopover>
                  </Menu>
                </div>

                <div className={styles.statsRow}>
                  <div className={styles.stat}>
                    <div className={styles.statValue}>{location.floor_count}</div>
                    <div className={styles.statLabel}>Floors</div>
                  </div>
                  <div className={styles.stat}>
                    <div className={styles.statValue}>{location.room_count}</div>
                    <div className={styles.statLabel}>Rooms</div>
                  </div>
                </div>

                {location.is_manager && (
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
      <AddLocationModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleCreateLocation}
      />

      <ManageLocationModal
        open={manageModalOpen}
        onClose={() => {
          setManageModalOpen(false);
          setSelectedLocation(null);
        }}
        location={selectedLocation}
        onUpdate={handleUpdateLocation}
        onTogglePermissions={handleTogglePermissions}
      />

      <ManageLocationAllowedGroupsModal
        open={groupsModalOpen}
        onClose={() => {
          setGroupsModalOpen(false);
          setSelectedLocation(null);
        }}
        location={selectedLocation}
        onSetGroups={handleSetAllowedGroups}
      />

      <ManageLocationManagersModal
        open={managersModalOpen}
        onClose={() => {
          setManagersModalOpen(false);
          setSelectedLocation(null);
        }}
        location={selectedLocation}
        onAddManagers={handleAddManagers}
        onRemoveManager={handleRemoveManager}
      />
    </>
  );
};

export default LocationManagement;