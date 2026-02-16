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
  Field,
  makeStyles,
  tokens,
  Spinner,
  Badge,
  Tooltip,
} from '@fluentui/react-components';
import {
  Add20Regular,
  Delete20Regular,
  Checkmark20Regular,
  Person24Filled,
} from '@fluentui/react-icons';
import { type RoomWithDesks, type Desk } from '../../../services/roomApi';
import { useAuth } from '../../../contexts/AuthContext';

const useStyles = makeStyles({
  modalContent: {
    display: 'flex',
    gap: tokens.spacingHorizontalL,
    height: '600px',
  },
  leftPanel: {
    width: '300px',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingRight: tokens.spacingHorizontalL,
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  mapContainer: {
    position: 'relative',
    flex: 1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  mapImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    userSelect: 'none',
  },
  deskMarker: {
    position: 'absolute',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'move',
    fontSize: '24px',
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
    userSelect: 'none',
    boxShadow: `0 2px 8px rgba(0, 0, 0, 0.15)`,
    border: `3px solid ${tokens.colorNeutralBackground1}`,
    ':hover': {
      transform: 'scale(1.2)',
      boxShadow: `0 4px 16px rgba(0, 0, 0, 0.25)`,
      zIndex: '100',
    },
  },
  deskMarkerDragging: {
    transform: 'scale(1.25)',
    boxShadow: `0 8px 24px rgba(0, 0, 0, 0.35)`,
    zIndex: '999',
  },
  saveButton: {
    position: 'absolute',
    top: '-40px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    minWidth: 'auto',
    height: '28px',
    fontSize: tokens.fontSizeBase200,
    whiteSpace: 'nowrap',
  },
  desksList: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    overflowY: 'auto',
  },
  desksHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacingVerticalS,
  },
  deskItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusSmall,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    minHeight: '36px',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  deskInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    flex: 1,
  },
  deskName: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
  },
  badgeContainer: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
  },
  addDeskSection: {
    padding: tokens.spacingVerticalM,
    paddingRight: 0,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  statsRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalL,
    marginBottom: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalS,
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
  statLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  emptyMap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
  },
});

interface ManageDesksModalProps {
  open: boolean;
  onClose: () => void;
  room: RoomWithDesks | null;
  onRefresh: () => Promise<void>;
}

interface DeskPosition {
  id: number;
  x: number; // Position as percentage (0-1) from left edge
  y: number; // Position as percentage (0-1) from top edge
  saved: boolean;
}

export const ManageDesksModal: React.FC<ManageDesksModalProps> = ({
  open,
  onClose,
  room,
  onRefresh,
}) => {
  const styles = useStyles();
  const { authenticatedFetch } = useAuth();
  const [desks, setDesks] = useState<Desk[]>([]);
  const [deskPositions, setDeskPositions] = useState<Map<number, DeskPosition>>(new Map());
  const [loading, setLoading] = useState(false);
  const [savingDeskId, setSavingDeskId] = useState<number | null>(null);
  const [addingDesk, setAddingDesk] = useState(false);
  const [newDeskName, setNewDeskName] = useState('');
  const [draggingDeskId, setDraggingDeskId] = useState<number | null>(null);
  const [hoveredDeskId, setHoveredDeskId] = useState<number | null>(null);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapImageRef = useRef<HTMLImageElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const initialLoadRef = useRef(true);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  // Initialize desks and positions only once when modal opens
  useEffect(() => {
    if (open && room && initialLoadRef.current) {
      setDesks(room.desks || []);
      const positions = new Map<number, DeskPosition>();
      room.desks?.forEach(desk => {
        positions.set(desk.id, {
          id: desk.id,
          x: desk.pos_x || 0.5,
          y: desk.pos_y || 0.5,
          saved: true,
        });
      });
      setDeskPositions(positions);
      initialLoadRef.current = false;
    }
    
    // Reset on close
    if (!open) {
      initialLoadRef.current = true;
    }
  }, [open, room?.id]); // Only depend on open and room.id, not the full room object

  const handleAddDesk = async () => {
    if (!room || !newDeskName.trim()) return;

    try {
      setAddingDesk(true);
      const response = await authenticatedFetch(`${API_BASE_URL}/desks/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDeskName.trim(),
          room: room.id,
          pos_x: 0.5,
          pos_y: 0.5,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to create desk');
      }

      const newDesk = await response.json();
      setDesks([...desks, newDesk]);
      setDeskPositions(new Map(deskPositions).set(newDesk.id, {
        id: newDesk.id,
        x: 0.5,
        y: 0.5,
        saved: false, // New desk needs positioning
      }));
      setNewDeskName('');
    } catch (err: any) {
      console.error('Failed to add desk:', err);
      alert(err.message || 'Failed to add desk');
    } finally {
      setAddingDesk(false);
    }
  };

  const handleDeleteDesk = async (deskId: number) => {
    if (!confirm('Are you sure you want to delete this desk?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await authenticatedFetch(`${API_BASE_URL}/desks/${deskId}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to delete desk');
      }

      setDesks(desks.filter(d => d.id !== deskId));
      const newPositions = new Map(deskPositions);
      newPositions.delete(deskId);
      setDeskPositions(newPositions);
    } catch (err: any) {
      console.error('Failed to delete desk:', err);
      alert(err.message || 'Failed to delete desk');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDeskPosition = async (deskId: number) => {
    const position = deskPositions.get(deskId);
    if (!position) return;

    try {
      setSavingDeskId(deskId);
      const response = await authenticatedFetch(`${API_BASE_URL}/desks/${deskId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pos_x: position.x,
          pos_y: position.y,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save desk position');
      }

      // Mark as saved
      const newPositions = new Map(deskPositions);
      newPositions.set(deskId, { ...position, saved: true });
      setDeskPositions(newPositions);
      
      // Update the desk in the list with new position
      const updatedDesk = await response.json();
      setDesks(desks.map(d => d.id === deskId ? updatedDesk : d));
    } catch (err: any) {
      console.error('Failed to save position:', err);
      alert(err.message || 'Failed to save desk position');
    } finally {
      setSavingDeskId(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, deskId: number) => {
    e.preventDefault();
    const container = mapContainerRef.current;
    const image = mapImageRef.current;
    if (!container || !image) return;

    const imageRect = image.getBoundingClientRect();
    const position = deskPositions.get(deskId);
    if (!position) return;

    const deskCenterX = position.x * imageRect.width;
    const deskCenterY = position.y * imageRect.height;
    dragOffsetRef.current = {
      x: e.clientX - imageRect.left - deskCenterX,
      y: e.clientY - imageRect.top - deskCenterY,
    };

    setDraggingDeskId(deskId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingDeskId === null) return;

    const container = mapContainerRef.current;
    const image = mapImageRef.current;
    if (!container || !image) return;

    const imageRect = image.getBoundingClientRect();
    
    // Calculate position as percentage (0-1) relative to the actual image
    let x = (e.clientX - imageRect.left - dragOffsetRef.current.x) / imageRect.width;
    let y = (e.clientY - imageRect.top - dragOffsetRef.current.y) / imageRect.height;

    // Clamp to valid range with margin (0.05 = 5% from edge for 40px desk marker)
    const margin = 0.05;
    x = Math.max(margin, Math.min(1 - margin, x));
    y = Math.max(margin, Math.min(1 - margin, y));

    const currentPosition = deskPositions.get(draggingDeskId);
    if (!currentPosition) return;

    const newPositions = new Map(deskPositions);
    newPositions.set(draggingDeskId, {
      id: draggingDeskId,
      x,
      y,
      saved: false, // Mark as unsaved when moved
    });
    setDeskPositions(newPositions);
  };

  const handleMouseUp = () => {
    setDraggingDeskId(null);
  };

  const totalDesks = desks.length;
  const bookedDesks = desks.filter(d => d.is_booked).length;
  const permanentDesks = desks.filter(d => d.is_permanent).length;
  const availableDesks = totalDesks - bookedDesks - permanentDesks;

  const getDeskMarkerStyle = (desk: Desk): React.CSSProperties => {
    const position = deskPositions.get(desk.id);
    const image = mapImageRef.current;
    const container = mapContainerRef.current;
    if (!position || !image || !container) return {};

    const imageRect = image.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Calculate position relative to the container, but based on image dimensions
    const left = imageRect.left - containerRect.left + (position.x * imageRect.width);
    const top = imageRect.top - containerRect.top + (position.y * imageRect.height);
    
    return {
      left: `${left}px`,
      top: `${top}px`,
      transform: 'translate(-50%, -50%)',
    };
  };

  const getDeskNumber = (desk: Desk): string => {
    const match = desk.name.match(/\d+/);
    return match ? match[0] : desk.name.substring(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface style={{ maxWidth: '1200px', maxHeight: '90vh' }}>
        <DialogBody>
          <DialogTitle>Manage Desks - {room?.name}</DialogTitle>
          <DialogContent>
            {/* Stats Row */}
            <div className={styles.statsRow}>
              <div className={styles.stat}>
                <div className={styles.statValue}>{totalDesks}</div>
                <div className={styles.statLabel}>Total</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statValue}>{availableDesks}</div>
                <div className={styles.statLabel}>Available</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statValue}>{bookedDesks}</div>
                <div className={styles.statLabel}>Booked</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statValue}>{permanentDesks}</div>
                <div className={styles.statLabel}>Permanent</div>
              </div>
            </div>

            {/* Main Content - Left: Desks List, Right: Map */}
            <div className={styles.modalContent}>
              {/* Left Panel - Desks List */}
              <div className={styles.leftPanel}>
                <div className={styles.desksHeader}>
                  <Text size={400} weight="semibold">Desks ({desks.length})</Text>
                </div>
                
                <div className={styles.desksList}>
                  {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: tokens.spacingVerticalXL }}>
                      <Spinner size="small" />
                    </div>
                  ) : desks.length === 0 ? (
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3, textAlign: 'center', padding: tokens.spacingVerticalL }}>
                      No desks yet. Add your first desk below.
                    </Text>
                  ) : (
                    desks.map((desk) => {
                      const position = deskPositions.get(desk.id);
                      const isUnsaved = position && !position.saved;
                      
                      return (
                        <div key={desk.id} className={styles.deskItem}>
                          <div className={styles.deskInfo}>
                            <Text className={styles.deskName}>{desk.name}</Text>
                            <div className={styles.badgeContainer}>
                              {isUnsaved && <Badge appearance="filled" color="warning" size="small">Unsaved</Badge>}
                              {desk.is_booked && <Badge appearance="filled" color="danger" size="small">Booked</Badge>}
                              {desk.is_permanent && <Badge appearance="filled" color="brand" size="small">Permanent</Badge>}
                            </div>
                          </div>
                          <Button
                            appearance="subtle"
                            icon={<Delete20Regular />}
                            size="small"
                            onClick={() => handleDeleteDesk(desk.id)}
                            aria-label="Delete desk"
                          />
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Desk Section */}
                <div className={styles.addDeskSection}>
                  <Field>
                    <Input
                      value={newDeskName}
                      onChange={(_, data) => setNewDeskName(data.value)}
                      placeholder="Desk name (e.g., Desk 1)"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleAddDesk();
                      }}
                      size="small"
                    />
                  </Field>
                  <Button
                    appearance="primary"
                    icon={<Add20Regular />}
                    onClick={handleAddDesk}
                    disabled={!newDeskName.trim() || addingDesk}
                    size="small"
                    style={{ width: '100%' }}
                  >
                    {addingDesk ? 'Adding...' : 'Add Desk'}
                  </Button>
                </div>
              </div>

              {/* Right Panel - Map */}
              <div className={styles.rightPanel}>
                {room?.map_image ? (
                  <div
                    ref={mapContainerRef}
                    className={styles.mapContainer}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    <img
                      ref={mapImageRef}
                      src={room.map_image}
                      alt="Room map"
                      className={styles.mapImage}
                      draggable={false}
                    />
                    
                    {/* Desk Markers */}
                    {desks.map((desk) => {
                      const position = deskPositions.get(desk.id);
                      const isDragging = draggingDeskId === desk.id;
                      const isHovered = hoveredDeskId === desk.id && !isDragging;
                      const isUnsaved = position && !position.saved;
                      
                      // Determine background color based on status
                      let bgColor = '#0078d4'; // Default blue
                      let iconColor = '#ffffff'; // White icon
                      
                      if (isUnsaved) {
                        bgColor = '#f59e0b'; // Yellow/amber for unsaved
                      } else if (desk.is_booked) {
                        bgColor = '#ef4444'; // Red for booked
                      } else if (desk.is_permanent) {
                        bgColor = '#a855f7'; // Purple for permanent
                      }
                      
                      const markerClass = `
                        ${styles.deskMarker} 
                        ${isDragging ? styles.deskMarkerDragging : ''} 
                      `;
                      
                      return (
                        <div
                          key={desk.id}
                          style={{ position: 'absolute', ...getDeskMarkerStyle(desk) }}
                          onMouseEnter={() => setHoveredDeskId(desk.id)}
                          onMouseLeave={() => setHoveredDeskId(null)}
                        >
                          {/* Save Button - shown on hover for unsaved positions */}
                          {isHovered && isUnsaved && (
                            <Tooltip content="Save position" relationship="label">
                              <Button
                                appearance="primary"
                                size="small"
                                icon={<Checkmark20Regular />}
                                onClick={() => handleSaveDeskPosition(desk.id)}
                                disabled={savingDeskId === desk.id}
                                className={styles.saveButton}
                              >
                                {savingDeskId === desk.id ? 'Saving...' : 'Save'}
                              </Button>
                            </Tooltip>
                          )}
                          
                          <div
                            className={markerClass}
                            onMouseDown={(e) => handleMouseDown(e, desk.id)}
                            title={desk.name}
                            style={{ 
                              backgroundColor: bgColor,
                              color: iconColor,
                            }}
                          >
                            <Person24Filled />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.mapContainer}>
                    <div className={styles.emptyMap}>
                      <Text size={300}>No room map uploaded yet</Text>
                      <Text size={200} style={{ marginTop: tokens.spacingVerticalS }}>
                        Upload a map to position desks
                      </Text>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={onClose}>
              Done
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};