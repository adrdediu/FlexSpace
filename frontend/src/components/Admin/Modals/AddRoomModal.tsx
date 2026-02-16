import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Input,
  Field,
  Textarea,
  Dropdown,
  Option,
} from '@fluentui/react-components';
import { createFloorApi } from '../../../services/floorApi';
import { useAuth } from '../../../contexts/AuthContext';

interface Floor {
  id: number;
  name: string;
  location: number;
  location_name?: string;
}

interface Location {
  id: number;
  name: string;
}

interface AddRoomModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string; floor_id: number }) => Promise<void>;
  floorId?: number;
}

/**
 * AddRoomModal - Create new room
 * 
 * Features:
 * - Select location from dropdown
 * - Select floor from location's floors
 * - Enter room name (required)
 * - Optional description
 * - Validates input before submission
 */
export const AddRoomModal: React.FC<AddRoomModalProps> = ({
  open,
  onClose,
  onSubmit,
  floorId,
}) => {
  const { authenticatedFetch } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>(undefined);
  const [selectedFloorId, setSelectedFloorId] = useState<number | undefined>(floorId);
  const [locations, setLocations] = useState<Location[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingFloors, setLoadingFloors] = useState(false);

  const floorApi = createFloorApi(authenticatedFetch);

  useEffect(() => {
    if (open) {
      fetchLocations();
    }
  }, [open]);

  useEffect(() => {
    if (floorId) {
      setSelectedFloorId(floorId);
    }
  }, [floorId]);

  useEffect(() => {
    if (selectedLocationId) {
      fetchFloorsForLocation(selectedLocationId);
    } else {
      setFloors([]);
      setSelectedFloorId(undefined);
    }
  }, [selectedLocationId]);

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
      const data = await floorApi.getFloorsByLocation(locationId);
      setFloors(data);
    } catch (err) {
      console.error('Failed to fetch floors:', err);
      setFloors([]);
    } finally {
      setLoadingFloors(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !selectedFloorId) {
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        floor_id: selectedFloorId,
      });
      handleClose();
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setSelectedLocationId(undefined);
    setSelectedFloorId(floorId);
    setFloors([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && handleClose()}>
      <DialogSurface>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <DialogTitle>Add New Room</DialogTitle>
            <DialogContent>
              <Field label="Room Name" required>
                <Input
                  value={name}
                  onChange={(_, data) => setName(data.value)}
                  placeholder="Enter room name"
                  required
                />
              </Field>

              <Field label="Location" required style={{ marginTop: '16px' }}>
                <Dropdown
                  placeholder={loadingLocations ? 'Loading locations...' : 'Select a location'}
                  value={locations.find(l => l.id === selectedLocationId)?.name || ''}
                  selectedOptions={selectedLocationId ? [selectedLocationId.toString()] : []}
                  onOptionSelect={(_, data) => setSelectedLocationId(Number(data.optionValue))}
                  disabled={loadingLocations}
                >
                  {locations.map((location) => (
                    <Option key={location.id} value={location.id.toString()}>
                      {location.name}
                    </Option>
                  ))}
                </Dropdown>
              </Field>

              <Field label="Floor" required style={{ marginTop: '16px' }}>
                <Dropdown
                  placeholder={
                    !selectedLocationId 
                      ? 'Select a location first' 
                      : loadingFloors 
                      ? 'Loading floors...' 
                      : floors.length === 0
                      ? 'No floors available'
                      : 'Select a floor'
                  }
                  value={floors.find(f => f.id === selectedFloorId)?.name || ''}
                  selectedOptions={selectedFloorId ? [selectedFloorId.toString()] : []}
                  onOptionSelect={(_, data) => setSelectedFloorId(Number(data.optionValue))}
                  disabled={!selectedLocationId || loadingFloors || floors.length === 0 || !!floorId}
                >
                  {floors.map((floor) => (
                    <Option key={floor.id} value={floor.id.toString()}>
                      {floor.name}
                    </Option>
                  ))}
                </Dropdown>
              </Field>

              <Field label="Description" style={{ marginTop: '16px' }}>
                <Textarea
                  value={description}
                  onChange={(_, data) => setDescription(data.value)}
                  placeholder="Enter room description (optional)"
                  rows={3}
                />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button appearance="primary" type="submit" disabled={loading || !name.trim() || !selectedFloorId}>
                {loading ? 'Creating...' : 'Create Room'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
};