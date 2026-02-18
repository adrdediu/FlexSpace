import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Spinner,
  Badge,
  Tooltip,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Field,
  Input,
  Select,
} from '@fluentui/react-components';
import {
  AddSquare20Regular,
  SubtractSquare20Regular,
  ArrowCounterclockwise20Regular,
  Person24Filled,
  LockClosed20Filled,
  Checkmark20Filled,
  Star20Filled,
  Dismiss24Regular,
  CalendarLtr20Regular,
  Clock20Regular,
  Warning20Regular,
} from '@fluentui/react-icons';
import { type RoomWithDesks, type Desk } from '../../services/roomApi';
import { createBookingApi, type Booking } from '../../services/bookingApi';
import { useAuth } from '../../contexts/AuthContext';
import websocketService from '../../services/webSocketService';

// ─── Styles ──────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    gap: tokens.spacingVerticalS,
  },

  // Top bar
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  roomTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  roomSubtitle: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  mapControls: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },

  // Legend
  legend: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalL,
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },

  // Map
  mapContainer: {
    flex: 1,
    position: 'relative',
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    cursor: 'grab',
    userSelect: 'none',
    minHeight: '300px',
  },
  mapContainerPanning: {
    cursor: 'grabbing',
  },
  mapWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    transformOrigin: '0 0',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    willChange: 'transform',
  },
  mapWrapperPanning: {
    transition: 'none',
  },
  mapImage: {
    display: 'block',
    width: 'auto',
    height: 'auto',
    userSelect: 'none',
    pointerEvents: 'none',
    draggable: 'false',
  },

  // Desk markers
  marker: {
    position: 'absolute',
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'all',
    cursor: 'pointer',
    border: `3px solid rgba(255,255,255,0.9)`,
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    transform: 'translate(-50%, -50%)',
    ':hover': {
      transform: 'translate(-50%, -50%) scale(1.18)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      zIndex: '50',
    },
  },
  markerSelected: {
    outline: '3px solid white',
    outlineOffset: '2px',
    transform: 'translate(-50%, -50%) scale(1.15)',
    boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
    zIndex: '40',
  },
  markerDisabled: {
    cursor: 'default',
    opacity: 0.85,
    ':hover': {
      transform: 'translate(-50%, -50%)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    },
  },

  // No-map empty state
  noMap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: tokens.colorNeutralForeground3,
    gap: tokens.spacingVerticalM,
    textAlign: 'center',
  },

  // Booking modal
  bookingForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    paddingTop: tokens.spacingVerticalS,
  },
  bookingDeskInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  bookingDeskDot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  fieldRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacingHorizontalM,
  },
  conflictWarning: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'flex-start',
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorPaletteRedBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorPaletteRedBorder1}`,
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
  },
  existingBookings: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  existingBookingItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  maintenanceBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorPaletteMarigoldBackground1,
    border: `1px solid ${tokens.colorPaletteMarigoldBorder1}`,
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorPaletteMarigoldForeground1,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    flexShrink: 0,
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function toLocalTimeStr(isoDate: string) {
  // "2025-02-18T09:00:00Z" → "09:00"
  try {
    return new Date(isoDate).toTimeString().slice(0, 5);
  } catch {
    return '';
  }
}

function buildISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0');
  return { value: `${h}:00`, label: `${h}:00` };
});

// ─── Marker colours ───────────────────────────────────────────────────────────

function markerColor(desk: DeskLiveState, isSelected: boolean, myUserId?: number) {
  if (isSelected) return '#f59e0b';                            // amber — selected
  if (desk.is_locked) return '#f59e0b';                        // amber — locked by someone
  if (desk.is_permanent && desk.permanent_assignee && desk.permanent_assignee !== myUserId) {
    return '#a855f7';                                          // purple — permanently taken
  }
  if (desk.is_booked) {
    if (desk.booked_by_id === myUserId) return '#3b82f6';      // blue — my booking
    return '#ef4444';                                          // red — booked by other
  }
  return '#22c55e';                                            // green — available
}

function markerTitle(desk: DeskLiveState, myUserId?: number) {
  if (desk.is_locked) return `${desk.name} — locked by ${desk.locked_by ?? 'someone'}`;
  if (desk.is_permanent && desk.permanent_assignee && desk.permanent_assignee !== myUserId) {
    return `${desk.name} — permanent desk`;
  }
  if (desk.is_booked) {
    if (desk.booked_by_id === myUserId) return `${desk.name} — your booking`;
    return `${desk.name} — booked by ${desk.booked_by ?? 'someone'}`;
  }
  return `${desk.name} — available`;
}

function canBook(desk: DeskLiveState, myUserId?: number) {
  if (desk.is_locked && desk.locked_by_id !== myUserId) return false;
  if (desk.is_booked && desk.booked_by_id !== myUserId) return false;
  if (desk.is_permanent && desk.permanent_assignee && desk.permanent_assignee !== myUserId) return false;
  return true;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeskLiveState {
  id: number;
  name: string;
  pos_x: number;
  pos_y: number;
  orientation: string;
  is_booked: boolean;
  booked_by?: string | null;
  booked_by_id?: number | null;
  is_locked: boolean;
  locked_by?: string | null;
  locked_by_id?: number | null;
  is_permanent: boolean;
  permanent_assignee?: number | null;
  permanent_assignee_full_name?: string | null;
}

export interface RoomMapViewerProps {
  room: RoomWithDesks;
  onClose?: () => void;
  /** Called after a booking is created or cancelled so parent can update stats */
  onBookingChange?: () => void;
}

// ─── Booking Modal ────────────────────────────────────────────────────────────

interface BookingModalProps {
  open: boolean;
  desk: DeskLiveState | null;
  roomName: string;
  onClose: () => void;
  onConfirm: (date: string, startTime: string, endTime: string) => Promise<void>;
  existingBookings: Booking[];
  loadingBookings: boolean;
  myUserId?: number;
}

const BookingModal: React.FC<BookingModalProps> = ({
  open, desk, roomName, onClose, onConfirm,
  existingBookings, loadingBookings, myUserId,
}) => {
  const styles = useStyles();
  const [date, setDate] = useState(todayStr());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setDate(todayStr()); setStartTime('09:00'); setEndTime('17:00'); setError(null); }
  }, [open, desk?.id]);

  const handleConfirm = async () => {
    if (!desk) return;
    if (startTime >= endTime) { setError('End time must be after start time.'); return; }
    setSaving(true);
    setError(null);
    try {
      await onConfirm(date, startTime, endTime);
    } catch (err: any) {
      setError(err.message || 'Failed to book desk.');
    } finally {
      setSaving(false);
    }
  };

  const myBookingOnThisDesk = existingBookings.find(b => b.user === myUserId);
  const otherBookings = existingBookings.filter(b => b.user !== myUserId);
  const isMyDesk = desk?.booked_by_id === myUserId;

  if (!desk) return null;

  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && !saving && onClose()}>
      <DialogSurface style={{ maxWidth: '480px', width: '90vw' }}>
        <DialogBody>
          <DialogTitle
            action={
              <Button appearance="subtle" icon={<Dismiss24Regular />} onClick={onClose} disabled={saving} />
            }
          >
            {isMyDesk ? 'Your Booking' : 'Book Desk'}
          </DialogTitle>

          <DialogContent>
            <div className={styles.bookingForm}>

              {/* Desk info */}
              <div className={styles.bookingDeskInfo}>
                <div
                  className={styles.bookingDeskDot}
                  style={{ backgroundColor: isMyDesk ? '#3b82f6' : '#22c55e' }}
                />
                <div>
                  <Text weight="semibold" size={400}>{desk.name}</Text>
                  <br />
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                    {roomName}
                    {desk.is_permanent && desk.permanent_assignee_full_name &&
                      ` · Permanent: ${desk.permanent_assignee_full_name}`
                    }
                  </Text>
                </div>
              </div>

              {/* Existing bookings on this desk today */}
              {loadingBookings ? (
                <Spinner size="tiny" label="Checking availability…" />
              ) : otherBookings.length > 0 && (
                <div>
                  <Text size={200} weight="semibold" style={{ color: tokens.colorNeutralForeground3 }}>
                    Already booked today
                  </Text>
                  <div className={styles.existingBookings} style={{ marginTop: tokens.spacingVerticalXS }}>
                    {otherBookings.map(b => (
                      <div key={b.id} className={styles.existingBookingItem}>
                        <Clock20Regular style={{ flexShrink: 0 }} />
                        <span>
                          {toLocalTimeStr(b.start_time)} – {toLocalTimeStr(b.end_time)}
                          <span style={{ color: tokens.colorNeutralForeground3 }}> · {b.username}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Booking form */}
              <Field label="Date" required>
                <Input
                  type="date"
                  value={date}
                  min={todayStr()}
                  onChange={(_, d) => setDate(d.value)}
                  contentBefore={<CalendarLtr20Regular />}
                  disabled={saving}
                />
              </Field>

              <div className={styles.fieldRow}>
                <Field label="Start time" required>
                  <Select
                    value={startTime}
                    onChange={(_, d) => setStartTime(d.value)}
                    disabled={saving}
                  >
                    {HOUR_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="End time" required>
                  <Select
                    value={endTime}
                    onChange={(_, d) => setEndTime(d.value)}
                    disabled={saving}
                  >
                    {HOUR_OPTIONS.filter(o => o.value > startTime).map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                </Field>
              </div>

              {error && (
                <div className={styles.conflictWarning}>
                  <Warning20Regular style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </DialogContent>

          <DialogActions>
            <Button appearance="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={handleConfirm} disabled={saving}>
              {saving ? <Spinner size="tiny" /> : 'Confirm Booking'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const RoomMapViewer: React.FC<RoomMapViewerProps> = ({
  room,
  onClose,
  onBookingChange,
}) => {
  const styles = useStyles();
  const { authenticatedFetch, user } = useAuth();
  const bookingApi = createBookingApi(authenticatedFetch);
  const myUserId = user?.id as number | undefined;

  // ── Live desk state (base from room prop, updated by WS) ──
  const [desks, setDesks] = useState<DeskLiveState[]>([]);

  // ── Zoom / Pan ──
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const isZoomedRef = useRef(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapImageRef = useRef<HTMLImageElement>(null);

  // ── Selection / Booking ──
  const [selectedDeskId, setSelectedDeskId] = useState<number | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [deskBookings, setDeskBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const lockRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockedDeskIdRef = useRef<number | null>(null);

  // ── Init desks from room prop ──
  useEffect(() => {
    setDesks(
      (room.desks || []).map(d => ({
        id: d.id,
        name: d.name,
        pos_x: d.pos_x,
        pos_y: d.pos_y,
        orientation: d.orientation,
        is_booked: d.is_booked,
        booked_by: d.booked_by ?? null,
        booked_by_id: null,
        is_locked: d.is_locked,
        locked_by: d.locked_by ?? null,
        locked_by_id: null,
        is_permanent: d.is_permanent,
        permanent_assignee: d.permanent_assignee ?? null,
        permanent_assignee_full_name: d.permanent_assignee_full_name ?? null,
      }))
    );
    // Reset view when room changes
    setSelectedDeskId(null);
    setBookingModalOpen(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    isZoomedRef.current = false;
  }, [room.id]);

  // ── Center image on load ──
  useEffect(() => {
    if (!room.map_image) return;
    const img = mapImageRef.current;
    const container = mapContainerRef.current;
    if (!img || !container) return;

    const setup = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      setPan({
        x: (cw - img.naturalWidth)  / 2,
        y: (ch - img.naturalHeight) / 2,
      });
    };

    if (img.complete && img.naturalWidth) setup();
    else img.onload = setup;
  }, [room.map_image, room.id]);

  // ── WebSocket ──
  useEffect(() => {
    websocketService.connectToRoom(room.id, {
      onMessage: (data: any) => {
        if (data.type === 'desk_status') {
          setDesks(prev => prev.map(d =>
            d.id === data.desk_id
              ? { ...d, is_booked: data.is_booked, booked_by: data.booked_by ?? null }
              : d
          ));
          onBookingChange?.();
        } else if (data.type === 'desk_lock') {
          setDesks(prev => prev.map(d =>
            d.id === data.desk_id
              ? { ...d, is_locked: data.locked, locked_by: data.locked_by ?? null }
              : d
          ));
        }
      },
    });

    return () => {
      websocketService.closeConnection(`room_${room.id}`);
    };
  }, [room.id]);

  // ── Cleanup lock on unmount ──
  useEffect(() => {
    return () => {
      if (lockRefreshRef.current) clearInterval(lockRefreshRef.current);
      if (lockedDeskIdRef.current !== null) {
        bookingApi.unlockDesk(lockedDeskIdRef.current).catch(() => {});
        lockedDeskIdRef.current = null;
      }
    };
  }, []);

  // ── Zoom helpers ──
  const zoomToward = useCallback((clientX: number, clientY: number, newZoom: number) => {
    const container = mapContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const ox = clientX - rect.left;
    const oy = clientY - rect.top;
    const imgX = (ox - pan.x) / zoom;
    const imgY = (oy - pan.y) / zoom;
    setZoom(newZoom);
    setPan({ x: ox - imgX * newZoom, y: oy - imgY * newZoom });
  }, [pan, zoom]);

  const zoomToDesk = useCallback((deskId: number) => {
    const desk = desks.find(d => d.id === deskId);
    const img = mapImageRef.current;
    const container = mapContainerRef.current;
    if (!desk || !img || !container) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const imgOffX = (cw - nw) / 2;
    const imgOffY = (ch - nh) / 2;
    const deskX = imgOffX + desk.pos_x * nw;
    const deskY = imgOffY + desk.pos_y * nh;
    const t = 2.5;

    isZoomedRef.current = true;
    setZoom(t);
    setPan({ x: cw / 2 - deskX * t, y: ch / 2 - deskY * t });
  }, [desks]);

  const handleResetView = useCallback(() => {
    const img = mapImageRef.current;
    const container = mapContainerRef.current;
    if (!img || !container || !img.naturalWidth) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    isZoomedRef.current = false;
    setZoom(1);
    setPan({ x: (cw - img.naturalWidth) / 2, y: (ch - img.naturalHeight) / 2 });
  }, []);

  const handleZoomIn  = () => { isZoomedRef.current = false; zoomToward(
    (mapContainerRef.current?.getBoundingClientRect().left ?? 0) + (mapContainerRef.current?.offsetWidth ?? 0) / 2,
    (mapContainerRef.current?.getBoundingClientRect().top  ?? 0) + (mapContainerRef.current?.offsetHeight ?? 0) / 2,
    Math.min(zoom + 0.25, 4)
  ); };
  const handleZoomOut = () => { isZoomedRef.current = false; zoomToward(
    (mapContainerRef.current?.getBoundingClientRect().left ?? 0) + (mapContainerRef.current?.offsetWidth ?? 0) / 2,
    (mapContainerRef.current?.getBoundingClientRect().top  ?? 0) + (mapContainerRef.current?.offsetHeight ?? 0) / 2,
    Math.max(zoom - 0.25, 0.25)
  ); };

  // ── Pan handlers ──
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
  };
  const handleMouseUp = () => setIsPanning(false);
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    isZoomedRef.current = false;
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    zoomToward(e.clientX, e.clientY, Math.max(0.25, Math.min(4, zoom + delta)));
  };

  // ── Desk click → lock → open modal ──
  const handleDeskClick = async (desk: DeskLiveState) => {
    if (!canBook(desk, myUserId)) return;

    setSelectedDeskId(desk.id);
    zoomToDesk(desk.id);

    // Fetch today's bookings for this desk
    setLoadingBookings(true);
    setDeskBookings([]);
    try {
      const bookings = await bookingApi.getDeskBookings(desk.id, todayStr());
      setDeskBookings(bookings);
    } catch {
      setDeskBookings([]);
    } finally {
      setLoadingBookings(false);
    }

    // Lock the desk
    const lockResult = await bookingApi.lockDesk(desk.id);
    if (!lockResult.ok) {
      // Already locked by someone else — still show modal but disable booking
      setDesks(prev => prev.map(d =>
        d.id === desk.id ? { ...d, is_locked: true, locked_by: lockResult.locked_by } : d
      ));
    } else {
      lockedDeskIdRef.current = desk.id;
      // Refresh lock every 25 seconds
      if (lockRefreshRef.current) clearInterval(lockRefreshRef.current);
      lockRefreshRef.current = setInterval(() => {
        bookingApi.refreshLock(desk.id).catch(() => {});
      }, 25_000);
    }

    setBookingModalOpen(true);
  };

  // ── Confirm booking ──
  const handleConfirmBooking = async (date: string, startTime: string, endTime: string) => {
    if (!selectedDeskId) return;
    const startISO = buildISO(date, startTime);
    const endISO   = buildISO(date, endTime);
    await bookingApi.createBooking({ desk_id: selectedDeskId, start_time: startISO, end_time: endISO });
    handleCloseBookingModal();
    onBookingChange?.();
  };

  // ── Close booking modal → release lock ──
  const handleCloseBookingModal = useCallback(() => {
    setBookingModalOpen(false);
    setSelectedDeskId(null);
    handleResetView();

    if (lockRefreshRef.current) { clearInterval(lockRefreshRef.current); lockRefreshRef.current = null; }
    if (lockedDeskIdRef.current !== null) {
      bookingApi.unlockDesk(lockedDeskIdRef.current).catch(() => {});
      lockedDeskIdRef.current = null;
    }
  }, [handleResetView]);

  // ─── Derived ──
  const hasMap = !!room.map_image;
  const desksWithPos = desks.filter(d => d.pos_x !== null && d.pos_y !== null);
  const availableCount = desks.filter(d => !d.is_booked && !d.is_locked && (!d.is_permanent || d.permanent_assignee === myUserId)).length;
  const selectedDesk = desks.find(d => d.id === selectedDeskId) ?? null;
  const isMaintenance = (room as any).is_under_maintenance;

  return (
    <div className={styles.root}>

      {/* Top bar */}
      <div className={styles.topBar}>
        <div>
          <div className={styles.roomTitle}>{room.name}</div>
          <div className={styles.roomSubtitle}>
            {room.floor?.location_name} · {room.floor?.name}
            {' · '}
            <span style={{ color: availableCount > 0 ? tokens.colorPaletteGreenForeground1 : tokens.colorNeutralForeground3 }}>
              {availableCount} available
            </span>
            {' of '}
            {desks.length} desks
          </div>
        </div>

        <div className={styles.mapControls}>
          <Button appearance="subtle" icon={<SubtractSquare20Regular />} size="small"
            onClick={handleZoomOut} disabled={zoom <= 0.25} title="Zoom out" />
          <Button appearance="subtle" icon={<AddSquare20Regular />} size="small"
            onClick={handleZoomIn} disabled={zoom >= 4} title="Zoom in" />
          <Button appearance="subtle" icon={<ArrowCounterclockwise20Regular />} size="small"
            onClick={handleResetView} title="Reset view" />
          {onClose && (
            <Button appearance="subtle" icon={<Dismiss24Regular />} size="small"
              onClick={onClose} title="Close" />
          )}
        </div>
      </div>

      {/* Maintenance banner */}
      {isMaintenance && (
        <div className={styles.maintenanceBanner}>
          <Warning20Regular />
          This room is currently under maintenance — booking is unavailable.
        </div>
      )}

      {/* Legend */}
      <div className={styles.legend}>
        {[
          { color: '#22c55e', label: 'Available' },
          { color: '#3b82f6', label: 'Your booking' },
          { color: '#ef4444', label: 'Booked' },
          { color: '#f59e0b', label: 'Locked' },
          { color: '#a855f7', label: 'Permanent' },
        ].map(({ color, label }) => (
          <div key={label} className={styles.legendItem}>
            <div className={styles.legendDot} style={{ backgroundColor: color }} />
            {label}
          </div>
        ))}
      </div>

      {/* Map */}
      {!hasMap ? (
        <div className={styles.noMap}>
          <Text size={400} weight="semibold">No floor map uploaded</Text>
          <Text size={200}>A room manager needs to upload a map for this room.</Text>
        </div>
      ) : (
        <div
          ref={mapContainerRef}
          className={`${styles.mapContainer} ${isPanning ? styles.mapContainerPanning : ''}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <div
            ref={undefined}
            className={`${styles.mapWrapper} ${isPanning ? styles.mapWrapperPanning : ''}`}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            {/* Image */}
            <img
              ref={mapImageRef}
              src={room.map_image!}
              alt={`${room.name} floor map`}
              className={styles.mapImage}
              draggable={false}
            />

            {/* Desk markers — positioned relative to the image's natural dimensions */}
            {mapImageRef.current && desksWithPos.map(desk => {
              const img = mapImageRef.current!;
              const nw = img.naturalWidth  || 1;
              const nh = img.naturalHeight || 1;
              const isSelected = selectedDeskId === desk.id;
              const bookable   = canBook(desk, myUserId) && !isMaintenance;
              const color      = markerColor(desk, isSelected, myUserId);

              return (
                <Tooltip
                  key={desk.id}
                  content={markerTitle(desk, myUserId)}
                  relationship="label"
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: `${desk.pos_x * nw}px`,
                      top:  `${desk.pos_y * nh}px`,
                      transform: 'translate(-50%, -50%)',
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'all',
                      cursor: bookable ? 'pointer' : 'default',
                      border: `3px solid rgba(255,255,255,0.9)`,
                      boxShadow: isSelected
                        ? '0 0 0 3px white, 0 6px 24px rgba(0,0,0,0.35)'
                        : '0 2px 10px rgba(0,0,0,0.2)',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      zIndex: isSelected ? 40 : 10,
                      opacity: bookable || isSelected ? 1 : 0.85,
                    }}
                    onClick={e => { e.stopPropagation(); if (bookable) handleDeskClick(desk); }}
                    onMouseDown={e => e.stopPropagation()} // don't trigger pan
                  >
                    {desk.is_locked
                      ? <LockClosed20Filled style={{ color: '#fff', fontSize: '18px' }} />
                      : desk.is_permanent
                      ? <Star20Filled style={{ color: '#fff', fontSize: '18px' }} />
                      : desk.is_booked && desk.booked_by_id === myUserId
                      ? <Checkmark20Filled style={{ color: '#fff', fontSize: '18px' }} />
                      : <Person24Filled style={{ color: '#fff', fontSize: '18px' }} />
                    }
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}

      {/* Booking modal */}
      <BookingModal
        open={bookingModalOpen}
        desk={selectedDesk}
        roomName={room.name}
        onClose={handleCloseBookingModal}
        onConfirm={handleConfirmBooking}
        existingBookings={deskBookings}
        loadingBookings={loadingBookings}
        myUserId={myUserId}
      />
    </div>
  );
};

export default RoomMapViewer;
