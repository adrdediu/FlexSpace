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
  Menu,
  MenuPopover,
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
  PersonTag20Regular,
  AddSquare20Regular,
  SubtractSquare20Regular,
  ArrowCounterclockwise20Regular,
} from '@fluentui/react-icons';
import { type RoomWithDesks, type Desk } from '../../../services/roomApi';
import { useAuth } from '../../../contexts/AuthContext';
import { AssignPermanentModal } from './AssignPermanentModal';

const useStyles = makeStyles({
  modalContent: {
    display: 'flex',
    gap: tokens.spacingHorizontalL,
    height: '600px',
  },
  leftPanel: {
    width: '260px',
    flexShrink: 0,
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
    gap: tokens.spacingVerticalS,
    minWidth: 0,
  },
  mapControls: {
    display: 'flex',
    alignItems: 'center',
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
    pointerEvents: 'none',
    zIndex: 1,
    transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  markersLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 10,
    pointerEvents: 'none', // layer itself is transparent; individual markers re-enable it
  },
  mapImage: {
    display: 'block',
    width: 'auto',
    height: 'auto',
    userSelect: 'none',
    pointerEvents: 'none',
  },
  markerLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  imageWrapper: {
    position: 'relative',
    display: 'inline-block',
    lineHeight: 0,
  },
  deskMarker: {
    position: 'absolute',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    userSelect: 'none',
    pointerEvents: 'all',
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    border: `3px solid ${tokens.colorNeutralBackground1}`,
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
    ':hover': {
      transform: 'scale(1.15)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.28)',
      zIndex: '100',
    },
  },
  deskMarkerDragging: {
    transform: 'scale(1.25)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
    zIndex: '999',
    cursor: 'move',
  },
  deskItemSelected: {
    backgroundColor: tokens.colorBrandBackground2,
    borderColor: tokens.colorBrandStroke1,
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
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
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    flex: 1,
    minWidth: 0,
  },
  deskNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    flexWrap: 'wrap',
  },
  deskName: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
  },
  deskAssignee: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  deskActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalXXS,
    flexShrink: 0,
  },
  addDeskSection: {
    paddingTop: tokens.spacingVerticalM,
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
    gap: tokens.spacingVerticalS,
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
  x: number; // 0-1, percentage from left edge of image
  y: number; // 0-1, percentage from top edge of image
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
  const [assignPermanentDesk, setAssignPermanentDesk] = useState<Desk | null>(null);
  const [selectedDeskId, setSelectedDeskId] = useState<number | null>(null);
  // Ref map so we can imperatively open a specific marker's Menu
  const markerRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Zoom and pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const mapImageRef = useRef<HTMLImageElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const initialLoadRef = useRef(true);
  const isZoomedToDeskRef = useRef(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  useEffect(() => {
    if (open && room && initialLoadRef.current) {
      setDesks(room.desks || []);
      const positions = new Map<number, DeskPosition>();
      room.desks?.forEach(desk => {
        positions.set(desk.id, {
          id: desk.id,
          x: desk.pos_x ?? 0.5,
          y: desk.pos_y ?? 0.5,
          saved: true,
        });
      });
      setDeskPositions(positions);
      initialLoadRef.current = false;

      // Lock room for bookings while admin is editing
      authenticatedFetch(`${API_BASE_URL}/admin/rooms/${room.id}/set-maintenance/`, { method: 'POST' })
        .catch(err => console.error('Failed to set maintenance mode:', err));
    }
    if (!open) {
      initialLoadRef.current = true;
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setEditingPositionDeskId(null);
      setSelectedDeskId(null);

      // Release maintenance lock when admin closes the modal
      if (room?.id) {
        authenticatedFetch(`${API_BASE_URL}/admin/rooms/${room.id}/clear-maintenance/`, { method: 'POST' })
          .catch(err => console.error('Failed to clear maintenance mode:', err));
      }
    }
  }, [open, room?.id]);

useEffect(() => {
  if (!open || !room?.map_image) return;

  const image = mapImageRef.current;
  const container = mapContainerRef.current;
  if (!image || !container) return;

  const setup = () => {
    if (!image.naturalWidth || !image.naturalHeight) return;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const centeredPanX = (containerW - image.naturalWidth)  / 2;
    const centeredPanY = (containerH - image.naturalHeight) / 2;
    setZoom(1);
    setPan({ x: centeredPanX, y: centeredPanY });
  };

  if (image.complete) setup();
  else image.onload = setup;
}, [open, room?.map_image]);


useEffect(() => {
  const handleResize = () => {
    // Only re-center if not currently zoomed to a desk
    if (isZoomedToDeskRef.current) return;
    const image = mapImageRef.current;
    const container = mapContainerRef.current;
    if (!image || !container || !image.naturalWidth) return;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const centeredPanX = (containerW - image.naturalWidth)  / 2;
    const centeredPanY = (containerH - image.naturalHeight) / 2;
    setPan({ x: centeredPanX, y: centeredPanY });
  };

  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);



  // ── Zoom / Pan ──────────────────────────────────────────────────
const zoomToward = (clientX: number, clientY: number, newZoom: number) => {
  const container = mapContainerRef.current;
  if (!container) return;

  // Convert cursor to container coordinates
  const rect = container.getBoundingClientRect();
  const offsetX = clientX - rect.left;
  const offsetY = clientY - rect.top;

  // Convert screen point to image space
  const imageX = (offsetX - pan.x) / zoom;
  const imageY = (offsetY - pan.y) / zoom;

  // Compute new pan so that the same image point stays under cursor
  const newPanX = offsetX - imageX * newZoom;
  const newPanY = offsetY - imageY * newZoom;

  setZoom(newZoom);
  setPan({ x: newPanX, y: newPanY });
};


const zoomToDesk = (deskId: number) => {
  const position = deskPositions.get(deskId);
  if (!position) return;

  const image = mapImageRef.current;
  const container = mapContainerRef.current;
  if (!image || !container) return;

  const containerW = container.clientWidth;
  const containerH = container.clientHeight;
  const naturalW = image.naturalWidth;
  const naturalH = image.naturalHeight;

  // The image sits at the wrapper origin (top-left = 0,0).
  // Desk position in wrapper-local pixels:
  const deskLocalX = position.x * naturalW;
  const deskLocalY = position.y * naturalH;

  const targetZoom = 2.5;

  // We want: newPan + deskLocal * targetZoom = containerCenter
  const newPanX = containerW / 2 - deskLocalX * targetZoom;
  const newPanY = containerH / 2 - deskLocalY * targetZoom;

  isZoomedToDeskRef.current = true;
  setZoom(targetZoom);
  setPan({ x: newPanX, y: newPanY });
};



  const handleZoomIn  = () => {
    isZoomedToDeskRef.current = false;
    zoomToward(
      (mapContainerRef.current?.getBoundingClientRect().left ?? 0) + (mapContainerRef.current?.offsetWidth  ?? 0) / 2,
      (mapContainerRef.current?.getBoundingClientRect().top  ?? 0) + (mapContainerRef.current?.offsetHeight ?? 0) / 2,
      Math.min(zoom + 0.25, 4)
    );
  };
  const handleZoomOut = () => {
    isZoomedToDeskRef.current = false;
    zoomToward(
      (mapContainerRef.current?.getBoundingClientRect().left ?? 0) + (mapContainerRef.current?.offsetWidth  ?? 0) / 2,
      (mapContainerRef.current?.getBoundingClientRect().top  ?? 0) + (mapContainerRef.current?.offsetHeight ?? 0) / 2,
      Math.max(zoom - 0.25, 0.25)
    );
  };
const handleResetView = () => {
  const image = mapImageRef.current;
  const container = mapContainerRef.current;
  if (!image || !container || !image.naturalWidth) return;

  const containerW = container.clientWidth;
  const containerH = container.clientHeight;
  const naturalW   = image.naturalWidth;
  const naturalH   = image.naturalHeight;

  // At zoom=1 the image is rendered at its natural size.
  // Center it in the container.
  const centeredPanX = (containerW - naturalW) / 2;
  const centeredPanY = (containerH - naturalH) / 2;

  isZoomedToDeskRef.current = false;
  setZoom(1);
  setPan({ x: centeredPanX, y: centeredPanY });
};


const handleWheel = (e: React.WheelEvent) => {
  e.preventDefault();
  isZoomedToDeskRef.current = false; // manual zoom clears desk-zoom state
  const delta = e.deltaY > 0 ? -0.15 : 0.15;
  const newZoom = Math.max(0.25, Math.min(4, zoom + delta));
  zoomToward(e.clientX, e.clientY, newZoom);
};



  const handleMapMouseDown = (e: React.MouseEvent) => {
    if (draggingDeskId !== null) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMapMouseMove = (e: React.MouseEvent) => {
    if (isPanning && draggingDeskId === null) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }
    if (draggingDeskId !== null) handleDeskDrag(e);
  };

  const handleMapMouseUp = () => {
    setIsPanning(false);
    setDraggingDeskId(null);
  };

  // ── Desk dragging ───────────────────────────────────────────────
  // imageWrapperRef is the inline-block div that exactly matches the rendered image size.
  // All marker left/top percentages are relative to it, so drag coords must be too.
  const handleDeskMouseDown = (e: React.MouseEvent, deskId: number) => {
    e.stopPropagation();
    e.preventDefault();

    const imgWrapper = imageWrapperRef.current;
    if (!imgWrapper) return;

    const pos = deskPositions.get(deskId);
    if (!pos) return;

    const rect = imgWrapper.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - (rect.left + pos.x * rect.width),
      y: e.clientY - (rect.top  + pos.y * rect.height),
    };
    setDraggingDeskId(deskId);
  };

  const handleDeskDrag = (e: React.MouseEvent) => {
    if (draggingDeskId === null) return;
    const imgWrapper = imageWrapperRef.current;
    if (!imgWrapper) return;

    const rect = imgWrapper.getBoundingClientRect();
    const margin = 0.03;
    const x = Math.max(margin, Math.min(1 - margin, (e.clientX - rect.left - dragOffsetRef.current.x) / rect.width));
    const y = Math.max(margin, Math.min(1 - margin, (e.clientY - rect.top  - dragOffsetRef.current.y) / rect.height));

    setDeskPositions(prev => {
      const next = new Map(prev);
      next.set(draggingDeskId, { id: draggingDeskId, x, y, saved: false });
      return next;
    });
  };

  // ── CRUD ────────────────────────────────────────────────────────
  const handleAddDesk = async () => {
    if (!room || !newDeskName.trim()) return;
    try {
      setAddingDesk(true);
      const res = await authenticatedFetch(`${API_BASE_URL}/desks/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDeskName.trim(), room: room.id, pos_x: 0.5, pos_y: 0.5 }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Failed to create desk');
      const newDesk = await res.json();
      setDesks(prev => [...prev, newDesk]);
      setDeskPositions(prev => new Map(prev).set(newDesk.id, { id: newDesk.id, x: 0.5, y: 0.5, saved: false }));
      setNewDeskName('');
    } catch (err: any) {
      alert(err.message || 'Failed to add desk');
    } finally {
      setAddingDesk(false);
    }
  };

  const handleDeleteDesk = async (deskId: number) => {
    if (!confirm('Are you sure you want to delete this desk?')) return;
    try {
      setLoading(true);
      const res = await authenticatedFetch(`${API_BASE_URL}/desks/${deskId}/`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete desk');
      setDesks(prev => prev.filter(d => d.id !== deskId));
      setDeskPositions(prev => { const m = new Map(prev); m.delete(deskId); return m; });
    } catch (err: any) {
      alert(err.message || 'Failed to delete desk');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDeskPosition = async (deskId: number) => {
    const pos = deskPositions.get(deskId);
    if (!pos) return;
    try {
      setSavingDeskId(deskId);
      const res = await authenticatedFetch(`${API_BASE_URL}/desks/${deskId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pos_x: pos.x, pos_y: pos.y }),
      });
      if (!res.ok) throw new Error('Failed to save position');
      const updated = await res.json();
      setDeskPositions(prev => new Map(prev).set(deskId, { ...pos, saved: true }));
      setDesks(prev => prev.map(d => d.id === deskId ? updated : d));
    } catch (err: any) {
      alert(err.message || 'Failed to save desk position');
    } finally {
      setSavingDeskId(null);
    }
  };

  const handleAssignPermanent = async (deskId: number, userId: number) => {
    const res = await authenticatedFetch(`${API_BASE_URL}/desks/${deskId}/assign-permanent/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.detail || 'Failed to assign');
    }
    const updated = await res.json();
    setDesks(prev => prev.map(d => d.id === deskId ? updated : d));
    // Sync the desk in assignPermanentDesk if still open
    setAssignPermanentDesk(prev => prev?.id === deskId ? updated : prev);
  };

  const handleClearPermanent = async (deskId: number) => {
    const res = await authenticatedFetch(`${API_BASE_URL}/desks/${deskId}/clear-permanent/`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.detail || 'Failed to clear');
    }
    const updated = await res.json();
    setDesks(prev => prev.map(d => d.id === deskId ? updated : d));
  };

  // ── Derived stats ───────────────────────────────────────────────
  const totalDesks     = desks.length;
  const bookedDesks    = desks.filter(d => d.is_booked).length;
  const permanentDesks = desks.filter(d => d.is_permanent).length;
  const availableDesks = totalDesks - bookedDesks - permanentDesks;

  const markerBgColor = (desk: Desk, isEditing: boolean): string => {
    if (isEditing || selectedDeskId === desk.id) return '#f59e0b';
    if (deskPositions.get(desk.id)?.saved === false) return '#f59e0b';
    if (desk.is_booked)    return '#ef4444';
    if (desk.is_permanent) return '#a855f7';
    return '#0078d4';
  };

  // Click a desk in the list → toggle selection and pan to center it
const handleListDeskClick = (desk: Desk) => {
  const newSelectedId = selectedDeskId === desk.id ? null : desk.id;
  setSelectedDeskId(newSelectedId);

  if (newSelectedId === null) {
    handleResetView();
  } else {
    zoomToDesk(desk.id);
  }
};


  return (
    <>
      <Dialog open={open} onOpenChange={(_, d) => !d.open && onClose()}>
        <DialogSurface style={{ maxWidth: '1200px', maxHeight: '90vh' }}>
          <DialogBody>
            <DialogTitle>Manage Desks — {room?.name}</DialogTitle>
            <DialogContent>

              {/* Stats */}
              <div className={styles.statsRow}>
                {[
                  { label: 'Total',     value: totalDesks },
                  { label: 'Available', value: availableDesks },
                  { label: 'Booked',    value: bookedDesks },
                  { label: 'Permanent', value: permanentDesks },
                ].map(s => (
                  <div key={s.label} className={styles.stat}>
                    <div className={styles.statValue}>{s.value}</div>
                    <div className={styles.statLabel}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Main layout */}
              <div className={styles.modalContent}>

                {/* ── Left: desk list ── */}
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
                        No desks yet.
                      </Text>
                    ) : desks.map(desk => {
                      const pos = deskPositions.get(desk.id);
                      const isUnsaved = pos && !pos.saved;
                      const isSelected = selectedDeskId === desk.id;
                      return (
                        <div
                          key={desk.id}
                          className={`${styles.deskItem} ${isSelected ? styles.deskItemSelected : ''}`}
                          onClick={() => handleListDeskClick(desk)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className={styles.deskInfo}>
                            <div className={styles.deskNameRow}>
                              <Text className={styles.deskName}>{desk.name}</Text>
                              {isUnsaved         && <Badge appearance="filled" color="warning" size="small">Unsaved</Badge>}
                              {desk.is_booked    && <Badge appearance="filled" color="danger"  size="small">Booked</Badge>}
                              {desk.is_permanent && <Badge appearance="filled" color="brand"   size="small">Permanent</Badge>}
                            </div>
                            {desk.is_permanent && desk.permanent_assignee_full_name && (
                              <Text className={styles.deskAssignee}>{desk.permanent_assignee_full_name}</Text>
                            )}
                          </div>
                          <div className={styles.deskActions} onClick={e => e.stopPropagation()}>
                            <Button
                              appearance="subtle"
                              icon={<PersonTag20Regular />}
                              size="small"
                              onClick={() => setAssignPermanentDesk(desk)}
                              title={desk.is_permanent ? 'Manage permanent assignment' : 'Assign permanent user'}
                            />
                            <Button
                              appearance="subtle"
                              icon={<Delete20Regular />}
                              size="small"
                              onClick={() => handleDeleteDesk(desk.id)}
                              title="Delete desk"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className={styles.addDeskSection}>
                    <Field>
                      <Input
                        size="small"
                        value={newDeskName}
                        onChange={(_, d) => setNewDeskName(d.value)}
                        placeholder="Desk name (e.g., Desk 1)"
                        onKeyPress={e => { if (e.key === 'Enter') handleAddDesk(); }}
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

                {/* ── Right: map ── */}
                <div className={styles.rightPanel}>
                  <div className={styles.mapControls}>
                    <Button appearance="subtle" icon={<SubtractSquare20Regular />} size="small" onClick={handleZoomOut} disabled={zoom <= 0.25} title="Zoom out" />
                    <Text size={200}>{Math.round(zoom * 100)}%</Text>
                    <Button appearance="subtle" icon={<AddSquare20Regular />} size="small" onClick={handleZoomIn} disabled={zoom >= 4} title="Zoom in" />
                    <Button appearance="subtle" icon={<ArrowCounterclockwise20Regular />} size="small" onClick={handleResetView} title="Reset view" />
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
                      {/* Zoom/pan transform wrapper */}
                      <div
                        ref={mapWrapperRef}
                        className={styles.mapWrapper}
                        style={{
                          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                          transition: isPanning || draggingDeskId !== null ? 'none' : undefined,
                        }}
                      >
                        {/* markerLayer centres imageWrapper inside the full-size wrapper */}
                        <div className={styles.markerLayer}>
                          {/* imageWrapper is inline-block — its dimensions exactly match
                              the rendered image. Marker left/top % are relative to this. */}
                          <div ref={imageWrapperRef} className={styles.imageWrapper}>
                            <img
                              ref={mapImageRef}
                              src={room.map_image}
                              alt="Room map"
                              className={styles.mapImage}
                              draggable={false}
                            />

                            {desks.map(desk => {
                              const pos       = deskPositions.get(desk.id);
                              const isDragging = draggingDeskId === desk.id;
                              const isEditing  = editingPositionDeskId === desk.id;
                              const isUnsaved  = pos && !pos.saved;
                              const isSelected = selectedDeskId === desk.id;
                              if (!pos) return null;

                              return (
                                <div
                                  key={desk.id}
                                  style={{
                                    position: 'absolute',
                                    left: `${pos.x * 100}%`,
                                    top:  `${pos.y * 100}%`,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: isDragging ? 999 : isSelected ? 20 : 10,
                                    cursor: isEditing ? 'move' : 'pointer',
                                    pointerEvents: 'all',
                                  }}
                                  onMouseDown={e => {
                                    e.stopPropagation();
                                    if (isEditing) handleDeskMouseDown(e, desk.id);
                                  }}
                                >
                                  <Menu onOpenChange={(_, d) => {
                                    if (d.open) {
                                      setSelectedDeskId(desk.id);
                                      zoomToDesk(desk.id);
                                    } else {
                                      setSelectedDeskId(null);
                                      handleResetView();
                                    }
                                  }}>
                                    <MenuTrigger disableButtonEnhancement>
                                      <div
                                        ref={el => {
                                          if (el) markerRefs.current.set(desk.id, el);
                                          else markerRefs.current.delete(desk.id);
                                        }}
                                        className={`${styles.deskMarker} ${isDragging ? styles.deskMarkerDragging : ''}`}
                                        title={desk.name}
                                        style={{
                                          backgroundColor: markerBgColor(desk, isEditing),
                                          color: '#ffffff',
                                          cursor: 'inherit',
                                          // Pulse ring on selected
                                          outline: isSelected && !isEditing ? '3px solid #f59e0b' : 'none',
                                          outlineOffset: '2px',
                                        }}
                                      >
                                        <Person24Filled />
                                      </div>
                                    </MenuTrigger>
                                    <MenuPopover>
                                      <MenuList>
                                        {isEditing || isUnsaved ? (
                                          <MenuItem
                                            icon={<Checkmark20Regular />}
                                            disabled={savingDeskId === desk.id}
                                            onClick={() => {
                                              handleSaveDeskPosition(desk.id);
                                              setEditingPositionDeskId(null);
                                            }}
                                          >
                                            {savingDeskId === desk.id ? 'Saving...' : 'Save Position'}
                                          </MenuItem>
                                        ) : (
                                          <MenuItem
                                            icon={<LocationRegular />}
                                            onClick={() => {
                                                setEditingPositionDeskId(desk.id)
                                                zoomToDesk(desk.id);
                                            }}
                                          >
                                            Change Position
                                          </MenuItem>
                                        )}
                                        <MenuItem
                                          icon={<PersonTag20Regular />}
                                          onClick={() => setAssignPermanentDesk(desk)}
                                        >
                                          {desk.is_permanent ? 'Manage Assignment' : 'Assign Permanent User'}
                                        </MenuItem>
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
                      </div>
                    </div>
                  ) : (
                    <div className={styles.mapContainer}>
                      <div className={styles.emptyMap}>
                        <Text size={300}>No room map uploaded yet</Text>
                        <Text size={200}>Upload a map to position desks</Text>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </DialogContent>

            <DialogActions>
              <Button appearance="primary" onClick={onClose}>Done</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Permanent assignment sub-modal */}
      <AssignPermanentModal
        open={!!assignPermanentDesk}
        onClose={() => setAssignPermanentDesk(null)}
        desk={assignPermanentDesk}
        onAssign={handleAssignPermanent}
        onClear={handleClearPermanent}
      />
    </>
  );
};