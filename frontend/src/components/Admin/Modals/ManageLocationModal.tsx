import React, { useState, useEffect } from 'react';
import {
  Field,
  Input,
  Switch,
  Button,
  makeStyles,
  tokens,
  Text,
  Spinner,
} from '@fluentui/react-components';
import {
  Add20Regular,
  Delete20Regular,
  Edit20Regular,
} from '@fluentui/react-icons';
import { Modal } from '../../Common/Modal';
import { type Location } from '../../../services/locationApi';
import { createFloorApi, type Floor } from '../../../services/floorApi';
import { useAuth } from '../../../contexts/AuthContext';

const useStyles = makeStyles({
  formFields: {
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
  switchField: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
  },
  switchLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  floorsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  floorItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
  },
  floorItemEditing: {
    backgroundColor: tokens.colorNeutralBackground2,
  },
  addFloorSection: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'flex-end',
  },
  loadingState: {
    display: 'flex',
    justifyContent: 'center',
    padding: tokens.spacingVerticalL,
  },
  emptyState: {
    textAlign: 'center',
    padding: tokens.spacingVerticalL,
    color: tokens.colorNeutralForeground3,
  },
});

export interface ManageLocationModalProps {
  open: boolean;
  onClose: () => void;
  location: Location | null;
  onUpdate: (id: number, data: Partial<Location>) => Promise<void>;
  onTogglePermissions: (id: number, allow: boolean) => Promise<void>;
}

export const ManageLocationModal: React.FC<ManageLocationModalProps> = ({
  open,
  onClose,
  location,
  onUpdate,
  onTogglePermissions,
}) => {
  const styles = useStyles();
  const { authenticatedFetch } = useAuth();
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [allowRoomManagers, setAllowRoomManagers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Floor management
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loadingFloors, setLoadingFloors] = useState(false);
  const [newFloorName, setNewFloorName] = useState('');
  const [editingFloorId, setEditingFloorId] = useState<number | null>(null);
  const [editingFloorName, setEditingFloorName] = useState('');

  const floorApi = createFloorApi(authenticatedFetch);

  useEffect(() => {
    if (location) {
      setName(location.name);
      setLat(location.lat?.toString() || '');
      setLng(location.lng?.toString() || '');
      setCountryCode(location.country_code || '');
      setAllowRoomManagers(location.allow_room_managers_to_add_group_members);
      fetchFloors(location.id);
    }
  }, [location]);

  const fetchFloors = async (locationId: number) => {
    try {
      setLoadingFloors(true);
      const data = await floorApi.getFloorsByLocation(locationId);
      setFloors(data);
    } catch (error) {
      console.error('Error fetching floors:', error);
    } finally {
      setLoadingFloors(false);
    }
  };

  const handleAddFloor = async () => {
    if (!location || !newFloorName.trim()) return;

    try {
      await floorApi.createFloor({
        name: newFloorName.trim(),
        location: location.id,
      });
      setNewFloorName('');
      await fetchFloors(location.id);
    } catch (error: any) {
      alert(error.message || 'Failed to add floor');
    }
  };

  const handleEditFloor = (floor: Floor) => {
    setEditingFloorId(floor.id);
    setEditingFloorName(floor.name);
  };

  const handleSaveFloor = async (floorId: number) => {
    if (!editingFloorName.trim()) return;

    try {
      await floorApi.updateFloor(floorId, { name: editingFloorName.trim() });
      setEditingFloorId(null);
      setEditingFloorName('');
      if (location) await fetchFloors(location.id);
    } catch (error: any) {
      alert(error.message || 'Failed to update floor');
    }
  };

  const handleDeleteFloor = async (floorId: number) => {
    if (!confirm('Are you sure you want to delete this floor? All rooms on this floor will also be deleted.')) {
      return;
    }

    try {
      await floorApi.deleteFloor(floorId);
      if (location) await fetchFloors(location.id);
    } catch (error: any) {
      alert(error.message || 'Failed to delete floor');
    }
  };

  const handleSubmit = async () => {
    if (!location || !name.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      // Update basic info
      await onUpdate(location.id, {
        name: name.trim(),
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
        country_code: countryCode || undefined,
      });

      // Update permissions if changed
      if (allowRoomManagers !== location.allow_room_managers_to_add_group_members) {
        await onTogglePermissions(location.id, allowRoomManagers);
      }

      onClose();
    } catch (error) {
      console.error('Error updating location:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!location) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage Location"
      subtitle={location.country_name}
      size="medium"
      actions={[
        {
          label: 'Cancel',
          onClick: onClose,
          appearance: 'secondary',
          disabled: submitting,
        },
        {
          label: 'Save Changes',
          onClick: handleSubmit,
          appearance: 'primary',
          loading: submitting,
          disabled: !name.trim(),
        },
      ]}
    >
      <div className={styles.formFields}>
        {/* Basic Information */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Basic Information</div>
          
          <Field label="Location Name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
            />
          </Field>

          <Field label="Country Code" hint="e.g., US, UK, JP">
            <Input
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              placeholder="US"
              maxLength={2}
              disabled={submitting}
            />
          </Field>

          <Field label="Latitude">
            <Input
              type="number"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              step="0.000001"
              disabled={submitting}
            />
          </Field>

          <Field label="Longitude">
            <Input
              type="number"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              step="0.000001"
              disabled={submitting}
            />
          </Field>
        </div>

        {/* Permissions */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Permissions</div>
          
          <div className={styles.switchField}>
            <div className={styles.switchLabel}>
              <Text weight="semibold">Allow Room Managers to Add Group Members</Text>
              <Text size={200}>
                When enabled, room managers can add members to user groups
              </Text>
            </div>
            <Switch
              checked={allowRoomManagers}
              onChange={(e) => setAllowRoomManagers(e.currentTarget.checked)}
              disabled={submitting}
            />
          </div>
        </div>

        {/* Floors */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Floors ({floors.length})</div>
          
          {loadingFloors ? (
            <div className={styles.loadingState}>
              <Spinner size="small" label="Loading floors..." />
            </div>
          ) : (
            <>
              {floors.length === 0 ? (
                <div className={styles.emptyState}>
                  <Text size={200}>No floors added yet</Text>
                </div>
              ) : (
                <div className={styles.floorsList}>
                  {floors.map((floor) => (
                    <div 
                      key={floor.id} 
                      className={`${styles.floorItem} ${editingFloorId === floor.id ? styles.floorItemEditing : ''}`}
                    >
                      {editingFloorId === floor.id ? (
                        <>
                          <Input
                            value={editingFloorName}
                            onChange={(e) => setEditingFloorName(e.target.value)}
                            style={{ flex: 1 }}
                          />
                          <Button
                            appearance="primary"
                            size="small"
                            onClick={() => handleSaveFloor(floor.id)}
                          >
                            Save
                          </Button>
                          <Button
                            appearance="secondary"
                            size="small"
                            onClick={() => {
                              setEditingFloorId(null);
                              setEditingFloorName('');
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Text style={{ flex: 1 }} weight="semibold">{floor.name}</Text>
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<Edit20Regular />}
                            onClick={() => handleEditFloor(floor)}
                          />
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<Delete20Regular />}
                            onClick={() => handleDeleteFloor(floor.id)}
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.addFloorSection}>
                <Field label="Add Floor" style={{ flex: 1 }}>
                  <Input
                    value={newFloorName}
                    onChange={(e) => setNewFloorName(e.target.value)}
                    placeholder="e.g., Ground Floor, 1st Floor"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newFloorName.trim()) {
                        handleAddFloor();
                      }
                    }}
                  />
                </Field>
                <Button
                  appearance="primary"
                  icon={<Add20Regular />}
                  onClick={handleAddFloor}
                  disabled={!newFloorName.trim()}
                >
                  Add
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Statistics */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Statistics</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacingVerticalM }}>
            <div>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginRight: tokens.spacingHorizontalS }}>
                User Groups
              </Text>
              <Text size={400} weight="semibold">
                {location.user_group_count}
              </Text>
            </div>
            <div>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginRight: tokens.spacingHorizontalS }}>
                Floors
              </Text>
              <Text size={400} weight="semibold">
                {location.floor_count || 0}
              </Text>
            </div>
            <div>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginRight: tokens.spacingHorizontalS }}>
                Rooms
              </Text>
              <Text size={400} weight="semibold">
                {location.room_count || 0}
              </Text>
            </div>
            <div>
              <Text size={200} style={{ color: tokens.colorNeutralForeground3, marginRight: tokens.spacingHorizontalS }}>
                Managers
              </Text>
              <Text size={400} weight="semibold">
                {location.location_managers.length}
              </Text>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ManageLocationModal;