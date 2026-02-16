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
  makeStyles,
  tokens,
  Text,
  Divider,
} from '@fluentui/react-components';
import { Building20Regular, Door20Regular } from '@fluentui/react-icons';
import { type RoomWithDesks } from '../../../services/roomApi';

const useStyles = makeStyles({
  locationInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    marginBottom: tokens.spacingVerticalL,
  },
  infoRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  label: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  value: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalL,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  statValue: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorBrandForeground1,
  },
  formSection: {
    marginTop: tokens.spacingVerticalL,
  },
});

interface ManageRoomModalProps {
  open: boolean;
  onClose: () => void;
  room: RoomWithDesks | null;
  onUpdate: (id: number, data: Partial<RoomWithDesks>) => Promise<void>;
}

/**
 * ManageRoomModal - Edit room details with enhanced layout
 * 
 * Features:
 * - Display room location and floor information
 * - Show room statistics
 * - Update room name
 * - Update room description
 * - Validates input before saving
 */
export const ManageRoomModal: React.FC<ManageRoomModalProps> = ({
  open,
  onClose,
  room,
  onUpdate,
}) => {
  const styles = useStyles();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (room) {
      setName(room.name);
      setDescription(room.description || '');
    }
  }, [room]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!room || !name.trim()) {
      return;
    }

    try {
      setLoading(true);
      await onUpdate(room.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Failed to update room:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface style={{ minWidth: '500px' }}>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <DialogTitle>Manage Room</DialogTitle>
            <DialogContent>
              {/* Location Information */}
              <div className={styles.locationInfo}>
                <Building20Regular style={{ fontSize: '24px', color: tokens.colorBrandForeground1 }} />
                <div className={styles.infoRow}>
                  <Text className={styles.label}>Location</Text>
                  <Text className={styles.value}>{room?.floor.location_name || 'Unknown'}</Text>
                </div>
                <Door20Regular style={{ fontSize: '24px', color: tokens.colorBrandForeground1, marginLeft: tokens.spacingHorizontalL }} />
                <div className={styles.infoRow}>
                  <Text className={styles.label}>Floor</Text>
                  <Text className={styles.value}>{room?.floor.name || 'Unknown'}</Text>
                </div>
              </div>

              <Divider />

              {/* Room Details Form */}
              <div className={styles.formSection}>
                <Field label="Room Name" required>
                  <Input
                    value={name}
                    onChange={(_, data) => setName(data.value)}
                    placeholder="Enter room name"
                    size="large"
                    required
                  />
                </Field>

                <Field label="Description" style={{ marginTop: tokens.spacingVerticalL }}>
                  <Textarea
                    value={description}
                    onChange={(_, data) => setDescription(data.value)}
                    placeholder="Enter room description (optional)"
                    rows={4}
                    resize="vertical"
                  />
                </Field>
              </div>

              {/* Room Statistics */}
              {room && (
                <div className={styles.statsGrid}>
                  <div className={styles.stat}>
                    <Text className={styles.label}>Total Desks</Text>
                    <Text className={styles.statValue}>{room.desk_count || 0}</Text>
                  </div>
                  <div className={styles.stat}>
                    <Text className={styles.label}>Managers</Text>
                    <Text className={styles.statValue}>{room.room_managers?.length || 0}</Text>
                  </div>
                  <div className={styles.stat}>
                    <Text className={styles.label}>Allowed Groups</Text>
                    <Text className={styles.statValue}>
                      {room.allowed_groups?.length || 0}
                      {room.allowed_groups?.length === 0 && <Text size={200}> (All users)</Text>}
                    </Text>
                  </div>
                  <div className={styles.stat}>
                    <Text className={styles.label}>Map Status</Text>
                    <Text className={styles.statValue}>{room.map_image ? '✓ Uploaded' : '✗ No map'}</Text>
                  </div>
                </div>
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button appearance="primary" type="submit" disabled={loading || !name.trim()}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
};