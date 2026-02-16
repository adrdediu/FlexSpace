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
  MenuPopover,
  Menu,
  MenuList,
  MenuItem,
  MenuTrigger,
} from '@fluentui/react-components';
import {
  Add20Regular,
  Delete20Regular,
  Checkmark20Regular,
  Person24Filled,
  LocationRegular,
  EditRegular,
  ArrowReset20Regular,
  ZoomIn20Regular,
  ZoomOut20Regular,
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
    gap: tokens.spacingVerticalM,
  },
  mapControls: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    justifyContent: 'flex-end',
  },
  mapContainer: {
    position: 'relative',
    flex: 1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground2,
    cursor: 'grab',
  },
  mapContainerPanning: {
    cursor: 'grabbing',
  },
  mapWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    transformOrigin: '0 0',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    userSelect: 'none',
    pointerEvents: 'none',
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
    flexDirection: 'column',
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
  const [editingPositionDeskId, setEditingPositionDeskId] = useState<number | null>(null);
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const initialLoadRef = useRef(true);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  // Initialize desks and positions only once when modal opens
  useEffect(() => {
    if (open && room && initialLoadRef.current) {
      setDesks(room.desks || []);
      const positions = new Map<DeskPosition>();
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
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [open, room?.id]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  const handleMapMouseDown = (e: React.MouseEvent) => {
    if (draggingDeskId !== null) return; // Don't pan while dragging desk
    
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMapMouseMove = (e: React.MouseEvent) => {
    if (isPanning && draggingDeskId === null) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (draggingDeskId !== null) {
      handleDeskDrag(e);
    }
  };

  const handleMapMouseUp = () => {
    setIsPanning(false);
    setDraggingDeskId(null);
  };

  const handleDeskMouseDown = (e: React.MouseEvent, deskId: number) => {
    e.stopPropagation();
    e.preventDefault();
    
    const wrapper = mapWrapperRef.current;
    if (!wrapper) return;

    const position = deskPositions.get(deskId);
    if (!position) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    
    // Calculate desk position in transformed space
    const deskX = position.x * wrapperRect.width;
    const deskY = position.y * wrapperRect.height;
    
    dragOffsetRef.current = {
      x: (e.clientX - wrapperRect.left) - deskX,
      y: (e.clientY - wrapperRect.top) - deskY,
    };

    setDraggingDeskId(deskId);
  };

  const handleDeskDrag = (e: React.MouseEvent) => {
    if (draggingDeskId === null) return;

    const wrapper = mapWrapperRef.current;
    if (!wrapper) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    
    // Calculate new position as percentage
    let x = ((e.clientX - wrapperRect.left) - dragOffsetRef.current.x) / wrapperRect.width;
    let y = ((e.clientY - wrapperRect.top) - dragOffsetRef.current.y) / wrapperRect.height;

    // Clamp to 0-1 range
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    const newPositions = new Map(deskPositions);
    newPositions.set(draggingDeskId, {
      id: draggingDeskId,
      x,
      y,
      saved: false,
    });
    setDeskPositions(newPositions);
  };

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
        saved: false,
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

      const newPositions = new Map(deskPositions);
      newPositions.set(deskId, { ...position, saved: true });
      setDeskPositions(newPositions);
      
      const updatedDesk = await response.json();
      setDesks(desks.map(d => d.id === deskId ? updatedDesk : d));
    } catch (err: any) {
      console.error('Failed to save position:', err);
      alert(err.message || 'Failed to save desk position');
    } finally {
      setSavingDeskId(null);
    }
  };

  const totalDesks = desks.length;
  const bookedDesks = desks.filter(d => d.is_booked).length;
  const permanentDesks = desks.filter(d => d.is_permanent).length;
  const availableDesks = totalDesks - bookedDesks - permanentDesks;

  const getDeskMarkerStyle = (desk: Desk): React.CSSProperties => {
    const position = deskPositions.get(desk.id);
    if (!position) return {};
    
    return {
      left: `${position.x * 100}%`,
      top: `${position.y * 100}%`,
      transform: 'translate(-50%, -50%)',
    };
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface style={{ maxWidth: '1200px', maxHeight: '90vh' }}>
        <DialogBody>
          <DialogTitle>
            Manage Desks - {room?.name}
          </DialogTitle>
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

            {/* Main Content */}
            <div className={styles.modalContent}>
              {/* Left Panel */}
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

              {/* Right Panel */}
              <div className={styles.rightPanel}>
                <div className={styles.mapControls}>
                  <Button
                    appearance="subtle"
                    icon={<ZoomOut20Regular />}
                    size="small"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.5}
                  />
                  <Text size={200}>{Math.round(zoom * 100)}%</Text>
                  <Button
                    appearance="subtle"
                    icon={<ZoomIn20Regular />}
                    size="small"
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                  />
                  <Button
                    appearance="subtle"
                    icon={<ArrowReset20Regular />}
                    size="small"
                    onClick={handleResetView}
                  />
                </div>

                {room?.map_image ? (
                  <div
                    ref={mapContainerRef}
                    className={`${styles.mapContainer} ${isPanning ? styles.mapContainerPanning : ''}`}
                    onMouseDown={handleMapMouseDown}
                    onMouseMove={handleMapMouseMove}
                    onMouseUp={handleMapMouseUp}
                    onMouseLeave={handleMapMouseUp}
                    onWheel={handleWheel}
                  >
                    <div
                      ref={mapWrapperRef}
                      className={styles.mapWrapper}
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      }}
                    >
                      <img
                        src={room.map_image}
                        alt="Room map"
                        className={styles.mapImage}
                        draggable={false}
                      />
                      
                      {/* Desk Markers */}
                      {desks.map((desk) => {
                        const position = deskPositions.get(desk.id);
                        const isDragging = draggingDeskId === desk.id;
                        const isUnsaved = position && !position.saved;
                        
                        let bgColor = '#0078d4';
                        let iconColor = '#ffffff';
                        
                        if (isUnsaved) {
                          bgColor = '#f59e0b';
                        } else if (desk.is_booked) {
                          bgColor = '#ef4444';
                        } else if (desk.is_permanent) {
                          bgColor = '#a855f7';
                        }
                        
                        const markerClass = `
                          ${styles.deskMarker} 
                          ${isDragging ? styles.deskMarkerDragging : ''} 
                        `;
                        
                        return (
                          <div
                            key={desk.id}
                            style={{ position: 'absolute', ...getDeskMarkerStyle(desk) }}
                          >
                            <Menu>
                              <MenuTrigger disableButtonEnhancement>
                                <div
                                  className={markerClass}
                                  onMouseDown={(e) => {
                                    // Only allow dragging if in edit mode for this desk
                                    if (editingPositionDeskId === desk.id) {
                                      handleDeskMouseDown(e, desk.id);
                                    }
                                  }}
                                  title={desk.name}
                                  style={{ 
                                    backgroundColor: editingPositionDeskId === desk.id ? '#f59e0b' : bgColor,
                                    color: iconColor,
                                    cursor: editingPositionDeskId === desk.id ? 'move' : 'pointer',
                                  }}
                                >
                                  <Person24Filled />
                                </div>
                              </MenuTrigger>
                              <MenuPopover>
                                <MenuList>
                                  {isUnsaved || editingPositionDeskId === desk.id ? (
                                    <MenuItem
                                      icon={<Checkmark20Regular />}
                                      onClick={() => {
                                        handleSaveDeskPosition(desk.id);
                                        setEditingPositionDeskId(null);
                                      }}
                                      disabled={savingDeskId === desk.id}
                                    >
                                      {savingDeskId === desk.id ? 'Saving...' : 'Save Position'}
                                    </MenuItem>
                                  ) : (
                                    <MenuItem
                                      icon={<LocationRegular />}
                                      onClick={() => {
                                        setEditingPositionDeskId(desk.id);
                                      }}
                                    >
                                      Change Position
                                    </MenuItem>
                                  )}
                                  <MenuItem
                                    icon={<Delete20Regular />}
                                    onClick={() => handleDeleteDesk(desk.id)}
                                  >
                                    Delete Desk
                                  </MenuItem>
                                </MenuList>
                              </MenuPopover>
                            </Menu>
                          </div>
                        );
                      })}
                    </div>
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