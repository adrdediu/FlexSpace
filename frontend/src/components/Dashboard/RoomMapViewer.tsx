import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Spinner,
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
  Menu,
  MenuPopover,
  MenuList,
  MenuItem,
  MenuTrigger,
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
  CalendarAdd20Regular,
  CalendarCancel20Regular,
} from '@fluentui/react-icons';
import { type RoomWithDesks } from '../../services/roomApi';
import { createBookingApi, type Booking } from '../../services/bookingApi';
import { useAuth } from '../../contexts/AuthContext';
import websocketService from '../../services/webSocketService';

// ─── Styles ───────────────────────────────────────────────────────────────────
// Map-related styles copied verbatim from ManageDesksModal to guarantee identical rendering.

const useStyles = makeStyles({
  // ── Root layout ──
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    gap: tokens.spacingVerticalS,
  },

  // ── Top bar ──
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
    gap: tokens.spacingHorizontalS,
  },

  // ── Legend ──
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

  // ── Maintenance banner ──
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

  // ── Map — copied verbatim from ManageDesksModal ──
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

  // ── Empty map state ──
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

  // ── Booking modal ──
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
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function toLocalTimeStr(isoDate: string) {
  try { return new Date(isoDate).toTimeString().slice(0, 5); } catch { return ''; }
}

function buildISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0');
  return { value: `${h}:00`, label: `${h}:00` };
});

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
  onBookingChange?: () => void;
}

// ─── Marker helpers ───────────────────────────────────────────────────────────

function markerColor(desk: DeskLiveState, isSelected: boolean, myUserId?: number): string {
  if (isSelected) return '#f59e0b';
  if (desk.is_locked) return '#f59e0b';
  if (desk.is_permanent && desk.permanent_assignee && desk.permanent_assignee !== myUserId)
    return '#a855f7';
  if (desk.is_booked)
    return desk.booked_by_id === myUserId ? '#3b82f6' : '#ef4444';
  return '#22c55e';
}

function markerTitle(desk: DeskLiveState, myUserId?: number): string {
  if (desk.is_locked) return `${desk.name} — locked by ${desk.locked_by ?? 'someone'}`;
  if (desk.is_permanent && desk.permanent_assignee && desk.permanent_assignee !== myUserId)
    return `${desk.name} — permanent desk`;
  if (desk.is_booked)
    return desk.booked_by_id === myUserId
      ? `${desk.name} — your booking`
      : `${desk.name} — booked by ${desk.booked_by ?? 'someone'}`;
  return `${desk.name} — available`;
}

function canBook(desk: DeskLiveState, myUserId?: number): boolean {
  if (desk.is_locked && desk.locked_by_id !== myUserId) return false;
  if (desk.is_booked && desk.booked_by_id !== myUserId) return false;
  if (desk.is_permanent && desk.permanent_assignee && desk.permanent_assignee !== myUserId) return false;
  return true;
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
    setSaving(true); setError(null);
    try { await onConfirm(date, startTime, endTime); }
    catch (err: any) { setError(err.message || 'Failed to book desk.'); }
    finally { setSaving(false); }
  };

  const otherBookings = existingBookings.filter(b => b.user !== myUserId);
  const isMyDesk = desk?.booked_by_id === myUserId;
  if (!desk) return null;

  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && !saving && onClose()}>
      <DialogSurface style={{ maxWidth: '480px', width: '90vw' }}>
        <DialogBody>
          <DialogTitle
            action={<Button appearance="subtle" icon={<Dismiss24Regular />} onClick={onClose} disabled={saving} />}
          >
            {isMyDesk ? 'Your Booking' : 'Book Desk'}
          </DialogTitle>
          <DialogContent>
            <div className={styles.bookingForm}>

              <div className={styles.bookingDeskInfo}>
                <div className={styles.bookingDeskDot}
                  style={{ backgroundColor: isMyDesk ? '#3b82f6' : '#22c55e' }} />
                <div>
                  <Text weight="semibold" size={400}>{desk.name}</Text><br />
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                    {roomName}
                    {desk.is_permanent && desk.permanent_assignee_full_name &&
                      ` · Permanent: ${desk.permanent_assignee_full_name}`}
                  </Text>
                </div>
              </div>

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

              <Field label="Date" required>
                <Input
                  type="date" value={date} min={todayStr()}
                  onChange={(_, d) => setDate(d.value)}
                  contentBefore={<CalendarLtr20Regular />}
                  disabled={saving}
                />
              </Field>

              <div className={styles.fieldRow}>
                <Field label="Start time" required>
                  <Select value={startTime} onChange={(_, d) => setStartTime(d.value)} disabled={saving}>
                    {HOUR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </Field>
                <Field label="End time" required>
                  <Select value={endTime} onChange={(_, d) => setEndTime(d.value)} disabled={saving}>
                    {HOUR_OPTIONS.filter(o => o.value > startTime).map(o =>
                      <option key={o.value} value={o.value}>{o.label}</option>
                    )}
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
            <Button appearance="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
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

export const RoomMapViewer: React.FC<RoomMapViewerProps> = ({ room, onClose, onBookingChange }) => {
  const styles = useStyles();
  const { authenticatedFetch, user } = useAuth();
  const bookingApi = createBookingApi(authenticatedFetch);
  const myUserId = user?.id as number | undefined;

  // ── Live desk state ──
  const [desks, setDesks] = useState<DeskLiveState[]>([]);

  // ── Zoom / pan — identical refs/state to ManageDesksModal ──
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef   = useRef<HTMLDivElement>(null);
  const mapImageRef     = useRef<HTMLImageElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const isZoomedToDeskRef = useRef(false);

  // ── Selection / delayed menu ──
  const [selectedDeskId, setSelectedDeskId] = useState<number | null>(null);
  const [menuReadyDeskId, setMenuReadyDeskId] = useState<number | null>(null);
  const menuReadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Maintenance state (seeded from room prop, kept live via WS) ──
  const [isMaintenance, setIsMaintenance] = useState<boolean>(!!(room as any).is_under_maintenance);
  const [maintenanceBy, setMaintenanceBy] = useState<string | null>((room as any).maintenance_by_name || null);

  // ── Booking ──
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [deskBookings, setDeskBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const lockRefreshRef  = useRef<ReturnType<typeof setInterval> | null>(null);
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
    setSelectedDeskId(null);
    setMenuReadyDeskId(null);
    setBookingModalOpen(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    isZoomedToDeskRef.current = false;
  }, [room.id]);

  // ── Center image on load — verbatim from ManageDesksModal ──
  useEffect(() => {
    if (!room.map_image) return;
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
  }, [room.map_image, room.id]);

  // ── Resize re-center — verbatim from ManageDesksModal ──
  useEffect(() => {
    const handleResize = () => {
      if (isZoomedToDeskRef.current) return;
      const image = mapImageRef.current;
      const container = mapContainerRef.current;
      if (!image || !container || !image.naturalWidth) return;
      const containerW = container.clientWidth;
      const containerH = container.clientHeight;
      setPan({
        x: (containerW - image.naturalWidth)  / 2,
        y: (containerH - image.naturalHeight) / 2,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        } else if (data.type === 'room_maintenance') {
          setIsMaintenance(data.enabled);
          setMaintenanceBy(data.enabled ? (data.by ?? null) : null);
        }
      },
    });
    return () => websocketService.closeConnection(`room_${room.id}`);
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

  // ── Zoom / pan handlers — verbatim from ManageDesksModal ──
  const zoomToward = (clientX: number, clientY: number, newZoom: number) => {
    const container = mapContainerRef.current;
    if (!container) return;
    const rect    = container.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;
    const imageX  = (offsetX - pan.x) / zoom;
    const imageY  = (offsetY - pan.y) / zoom;
    setZoom(newZoom);
    setPan({ x: offsetX - imageX * newZoom, y: offsetY - imageY * newZoom });
  };

  const zoomToDesk = (deskId: number) => {
    const desk = desks.find(d => d.id === deskId);
    if (!desk) return;
    const image     = mapImageRef.current;
    const container = mapContainerRef.current;
    if (!image || !container) return;

    const containerW  = container.clientWidth;
    const containerH  = container.clientHeight;
    const naturalW    = image.naturalWidth;
    const naturalH    = image.naturalHeight;
    const deskLocalX  = desk.pos_x * naturalW;
    const deskLocalY  = desk.pos_y * naturalH;
    const targetZoom  = 2.5;

    isZoomedToDeskRef.current = true;
    setZoom(targetZoom);
    setPan({
      x: containerW / 2 - deskLocalX * targetZoom,
      y: containerH / 2 - deskLocalY * targetZoom,
    });
  };

  const handleZoomIn = () => {
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

  const handleResetView = useCallback(() => {
    const image     = mapImageRef.current;
    const container = mapContainerRef.current;
    if (!image || !container || !image.naturalWidth) return;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    isZoomedToDeskRef.current = false;
    setZoom(1);
    setPan({
      x: (containerW - image.naturalWidth)  / 2,
      y: (containerH - image.naturalHeight) / 2,
    });
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    isZoomedToDeskRef.current = false;
    const delta   = e.deltaY > 0 ? -0.15 : 0.15;
    const newZoom = Math.max(0.25, Math.min(4, zoom + delta));
    zoomToward(e.clientX, e.clientY, newZoom);
  };

  const handleMapMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMapMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };

  const handleMapMouseUp = () => setIsPanning(false);

  // ── Marker click: zoom first, reveal menu after animation settles ──
  const handleMarkerClick = (desk: DeskLiveState, e: React.MouseEvent) => {
    e.stopPropagation();
    // Second click on the same desk closes everything
    if (menuReadyDeskId === desk.id || selectedDeskId === desk.id) {
      if (menuReadyTimerRef.current) clearTimeout(menuReadyTimerRef.current);
      setMenuReadyDeskId(null);
      setSelectedDeskId(null);
      handleResetView();
      return;
    }
    if (menuReadyTimerRef.current) clearTimeout(menuReadyTimerRef.current);
    setSelectedDeskId(desk.id);
    zoomToDesk(desk.id);
    // Delay menu appearance until CSS transition finishes (0.35 s + small buffer)
    menuReadyTimerRef.current = setTimeout(() => setMenuReadyDeskId(desk.id), 380);
  };

  const handleMenuClose = () => {
    if (menuReadyTimerRef.current) clearTimeout(menuReadyTimerRef.current);
    setMenuReadyDeskId(null);
    setSelectedDeskId(null);
    handleResetView();
  };

  // ── "Book Desk" menu item → acquire lock → open booking modal ──
  const handleBookDesk = async (desk: DeskLiveState) => {
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

    const lockResult = await bookingApi.lockDesk(desk.id);
    if (!lockResult.ok) {
      setDesks(prev => prev.map(d =>
        d.id === desk.id ? { ...d, is_locked: true, locked_by: lockResult.locked_by } : d
      ));
    } else {
      lockedDeskIdRef.current = desk.id;
      if (lockRefreshRef.current) clearInterval(lockRefreshRef.current);
      lockRefreshRef.current = setInterval(() => bookingApi.refreshLock(desk.id).catch(() => {}), 25_000);
    }
    setBookingModalOpen(true);
  };

  const handleConfirmBooking = async (date: string, startTime: string, endTime: string) => {
    if (!selectedDeskId) return;
    await bookingApi.createBooking({
      desk_id: selectedDeskId,
      start_time: buildISO(date, startTime),
      end_time:   buildISO(date, endTime),
    });
    handleCloseBookingModal();
    onBookingChange?.();
  };

  const handleCloseBookingModal = useCallback(() => {
    setBookingModalOpen(false);
    setMenuReadyDeskId(null);
    setSelectedDeskId(null);
    handleResetView();
    if (lockRefreshRef.current) { clearInterval(lockRefreshRef.current); lockRefreshRef.current = null; }
    if (lockedDeskIdRef.current !== null) {
      bookingApi.unlockDesk(lockedDeskIdRef.current).catch(() => {});
      lockedDeskIdRef.current = null;
    }
  }, [handleResetView]);

  // ── Derived ──
  const desksWithPos   = desks.filter(d => d.pos_x !== null && d.pos_y !== null);
  const availableCount = desks.filter(d =>
    !d.is_booked && !d.is_locked && (!d.is_permanent || d.permanent_assignee === myUserId)
  ).length;
  const selectedDesk = desks.find(d => d.id === selectedDeskId) ?? null;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.root}>

      {/* Top bar */}
      <div className={styles.topBar}>
        <div>
          <div className={styles.roomTitle}>{room.name}</div>
          <div className={styles.roomSubtitle}>
            {room.floor?.location_name} · {room.floor?.name}
            {' · '}
            <span style={{
              color: availableCount > 0
                ? tokens.colorPaletteGreenForeground1
                : tokens.colorNeutralForeground3,
            }}>
              {availableCount} available
            </span>
            {' of '}{desks.length} desks
          </div>
        </div>
        <div className={styles.mapControls}>
          <Button appearance="subtle" icon={<SubtractSquare20Regular />} size="small"
            onClick={handleZoomOut} disabled={zoom <= 0.25} title="Zoom out" />
          <Text size={200}>{Math.round(zoom * 100)}%</Text>
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
          <Warning20Regular style={{ flexShrink: 0 }} />
          <span>
            <strong>Under Maintenance</strong>
            {maintenanceBy ? `, issued by ${maintenanceBy}` : ''}
            {'. Booking is currently unavailable. Please contact them.'}
          </span>
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
      {!room.map_image ? (
        <div className={styles.mapContainer}>
          <div className={styles.emptyMap}>
            <Text size={300}>No floor map uploaded</Text>
            <Text size={200}>A room manager needs to upload a map for this room.</Text>
          </div>
        </div>
      ) : (
        <div
          ref={mapContainerRef}
          className={`${styles.mapContainer} ${isPanning ? styles.mapContainerPanning : ''}`}
          onMouseDown={handleMapMouseDown}
          onMouseMove={handleMapMouseMove}
          onMouseUp={handleMapMouseUp}
          onMouseLeave={handleMapMouseUp}
          onWheel={handleWheel}
        >
          {/* Zoom/pan transform wrapper — verbatim from ManageDesksModal */}
          <div
            ref={mapWrapperRef}
            className={styles.mapWrapper}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: isPanning ? 'none' : undefined,
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

                {desksWithPos.map(desk => {
                  const isSelected = selectedDeskId === desk.id;
                  const isMenuOpen = menuReadyDeskId === desk.id;
                  const bookable   = canBook(desk, myUserId) && !isMaintenance;
                  const color      = markerColor(desk, isSelected, myUserId);

                  return (
                    <div
                      key={desk.id}
                      style={{
                        position: 'absolute',
                        left: `${desk.pos_x * 100}%`,
                        top:  `${desk.pos_y * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: isSelected ? 20 : 10,
                        cursor: 'pointer',
                        pointerEvents: 'all',
                      }}
                      onMouseDown={e => e.stopPropagation()}
                    >
                      <Menu
                        open={isMenuOpen}
                        onOpenChange={(_, d) => { if (!d.open) handleMenuClose(); }}
                      >
                        <MenuTrigger disableButtonEnhancement>
                          <Tooltip content={markerTitle(desk, myUserId)} relationship="label">
                            <div
                              className={styles.deskMarker}
                              onClick={e => handleMarkerClick(desk, e)}
                              style={{
                                backgroundColor: color,
                                color: '#ffffff',
                                outline: isSelected ? '3px solid #f59e0b' : 'none',
                                outlineOffset: '2px',
                              }}
                            >
                              {desk.is_locked
                                ? <LockClosed20Filled />
                                : desk.is_permanent
                                ? <Star20Filled />
                                : desk.is_booked && desk.booked_by_id === myUserId
                                ? <Checkmark20Filled />
                                : <Person24Filled />
                              }
                            </div>
                          </Tooltip>
                        </MenuTrigger>
                        <MenuPopover>
                          <MenuList>
                            {bookable ? (
                              <MenuItem
                                icon={<CalendarAdd20Regular />}
                                onClick={() => handleBookDesk(desk)}
                              >
                                {desk.is_booked && desk.booked_by_id === myUserId
                                  ? 'Manage Booking' : 'Book Desk'}
                              </MenuItem>
                            ) : (
                              <MenuItem icon={<CalendarCancel20Regular />} disabled>
                                {desk.is_locked
                                  ? `Locked by ${desk.locked_by ?? 'someone'}`
                                  : desk.is_permanent ? 'Permanently assigned'
                                  : 'Unavailable'}
                              </MenuItem>
                            )}
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