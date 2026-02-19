import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Field,
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
  Clock20Regular,
  Warning20Regular,
  CalendarAdd20Regular,
  CalendarCancel20Regular,
  ChevronLeft20Regular,
  ChevronRight20Regular,
} from '@fluentui/react-icons';
import { DatePicker } from '@fluentui/react-datepicker-compat';
import { TimePicker } from '@fluentui/react-timepicker-compat';
import { type RoomWithDesks } from '../../services/roomApi';
import { createBookingApi, type Booking } from '../../services/bookingApi';
import { useAuth } from '../../contexts/AuthContext';
import websocketService from '../../services/webSocketService';
import {
  CalendarGrid, type DraftSlot,
  calStartOfDay, calStartOfWeek, calAddDays, calStartOfMonth,
  calFormatShortDate,
} from './BookingsCalendar';

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
  bookingModalSurface: {
    maxWidth: '860px',
    width: '96vw',
    maxHeight: '92vh',
  },
  // Top row: desk chip + date/time fields + duration + actions all inline
  bookingTopRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalM,
    paddingBottom: tokens.spacingVerticalM,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexWrap: 'wrap',
  },
  bookingDeskInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `6px ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
    alignSelf: 'flex-end',
    minWidth: 0,
  },
  bookingDeskDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  bookingFieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    minWidth: '110px',
  },
  bookingFieldLabel: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightSemibold,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  bookingArrow: {
    alignSelf: 'flex-end',
    paddingBottom: '9px',
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase400,
    lineHeight: 1,
    flexShrink: 0,
    userSelect: 'none',
  },
  tzLabel: {
    alignSelf: 'flex-end',
    paddingBottom: '9px',
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  durationBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    padding: `5px ${tokens.spacingHorizontalS}`,
    backgroundColor: tokens.colorBrandBackground2,
    borderRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
    alignSelf: 'flex-end',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  bookingActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignSelf: 'flex-end',
    marginLeft: 'auto',
    flexShrink: 0,
  },
  conflictWarning: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'flex-start',
    padding: tokens.spacingVerticalS,
    backgroundColor: tokens.colorPaletteRedBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorPaletteRedBorder1}`,
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
    flexShrink: 0,
  },
  // Calendar section fills remaining height
  bookingCalSection: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    paddingTop: tokens.spacingVerticalXS,
    overflow: 'hidden',
  },
  calViewToolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    paddingBottom: tokens.spacingVerticalXS,
    flexShrink: 0,
  },
  calTitleSmall: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    flex: 1,
    textAlign: 'center',
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

// Helpers for DatePicker / TimePicker
function dateStrToDate(str: string): Date {
  // Parse YYYY-MM-DD as local date
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateToDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function timeStrToDate(time: string, base: Date): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
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

type CalView = 'day' | 'week' | 'month';

// Local timezone abbreviation
const TZ_LABEL = (() => {
  try {
    return new Intl.DateTimeFormat([], { timeZoneName: 'short' })
      .formatToParts(new Date())
      .find(p => p.type === 'timeZoneName')?.value ?? '';
  } catch { return ''; }
})();

interface BookingModalProps {
  open: boolean;
  desk: DeskLiveState | null;
  roomName: string;
  onClose: () => void;
  onConfirm: (startDate: string, endDate: string, startTime: string, endTime: string) => Promise<void>;
  myUserId?: number;
  bookingApi: ReturnType<typeof createBookingApi>;
  onLockFailed?: (lockedBy: string | null) => void;
}

const BookingModal: React.FC<BookingModalProps> = ({
  open, desk, roomName, onClose, onConfirm,
  myUserId, bookingApi, onLockFailed,
}) => {
  const styles = useStyles();

  // ── Form state — separate start/end date + time ──
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate,   setEndDate]   = useState(todayStr());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime,   setEndTime]   = useState('17:00');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // ── Calendar view state ──
  const [calView,   setCalView]   = useState<CalView>('week');
  const [calAnchor, setCalAnchor] = useState<Date>(calStartOfWeek(calStartOfDay(new Date())));

  // ── Desk bookings (all users) for the visible range ──
  const [deskBookings, setDeskBookings] = useState<Booking[]>([]);
  const [loadingCal,   setLoadingCal]  = useState(false);

  // ── Lock lifecycle ──
  const lockRefreshRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockedDeskIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open || !desk) return;
    let cancelled = false;
    bookingApi.lockDesk(desk.id).then(result => {
      if (cancelled) return;
      if (result.ok) {
        lockedDeskIdRef.current = desk.id;
        lockRefreshRef.current = setInterval(
          () => bookingApi.refreshLock(desk.id).catch(() => {}), 25_000
        );
      } else {
        onLockFailed?.(result.locked_by ?? null);
        onClose();
      }
    });

    // ── Release lock on page unload (refresh / tab close / navigation) ──
    // sendBeacon fires synchronously during unload and sends cookies automatically.
    // React cleanup (return fn below) handles normal unmount; this handles hard exits.
    const unlockUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/bookings/unlock/`;
    const handleUnload = () => {
      if (lockedDeskIdRef.current === null) return;
      const payload = JSON.stringify({ desk_id: lockedDeskIdRef.current });
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(unlockUrl, blob);
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      cancelled = true;
      window.removeEventListener('beforeunload', handleUnload);
      if (lockRefreshRef.current) { clearInterval(lockRefreshRef.current); lockRefreshRef.current = null; }
      if (lockedDeskIdRef.current !== null) {
        bookingApi.unlockDesk(lockedDeskIdRef.current).catch(() => {});
        lockedDeskIdRef.current = null;
      }
    };
  }, [open, desk?.id]);

  // ── Reset on open ──
  useEffect(() => {
    if (open) {
      const today = todayStr();
      setStartDate(today); setEndDate(today);
      setStartTime('09:00'); setEndTime('17:00');
      setError(null); setCalView('week');
      setCalAnchor(calStartOfWeek(calStartOfDay(new Date())));
    }
  }, [open, desk?.id]);

  // ── Ensure endDate >= startDate ──
  useEffect(() => {
    if (endDate < startDate) setEndDate(startDate);
  }, [startDate]);

  // ── Sync calendar to show startDate when it changes ──
  useEffect(() => {
    if (!startDate) return;
    const d = dateStrToDate(startDate);
    if (calView === 'day')   setCalAnchor(calStartOfDay(d));
    if (calView === 'week')  setCalAnchor(calStartOfWeek(d));
    if (calView === 'month') setCalAnchor(calStartOfMonth(d));
  }, [startDate, calView]);

  // ── Compute calendar days ──
  const calDays: Date[] = useMemo(() => {
    if (calView === 'day')  return [calAnchor];
    if (calView === 'week') return Array.from({ length: 7 }, (_, i) => calAddDays(calAnchor, i));
    const gs = calStartOfWeek(calStartOfMonth(calAnchor));
    return Array.from({ length: 42 }, (_, i) => calAddDays(gs, i));
  }, [calView, calAnchor.toISOString().slice(0, 10)]);

  // ── Fetch desk bookings for visible range ──
  useEffect(() => {
    if (!open || !desk) return;
    setLoadingCal(true);
    const start = calDays[0];
    const end   = calAddDays(calDays[calDays.length - 1], 1);
    bookingApi.getDeskBookingsRange(desk.id, start.toISOString(), end.toISOString())
      .then(data => setDeskBookings(data))
      .catch(() => setDeskBookings([]))
      .finally(() => setLoadingCal(false));
  }, [open, desk?.id, calDays[0].toISOString(), calDays[calDays.length - 1].toISOString()]);

  // ── Calendar navigation ──
  const navigateCal = (dir: -1 | 1) => setCalAnchor(prev => {
    if (calView === 'day')   return calAddDays(prev, dir);
    if (calView === 'week')  return calAddDays(prev, dir * 7);
    return new Date(prev.getFullYear(), prev.getMonth() + dir, 1);
  });

  const calTitle = useMemo(() => {
    if (calView === 'day')  return calFormatShortDate(calAnchor);
    if (calView === 'week') {
      const s = calAnchor, e = calAddDays(s, 6);
      return `${s.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return calAnchor.toLocaleDateString([], { month: 'long', year: 'numeric' });
  }, [calView, calAnchor]);

  // ── bookingsByDay map ──
  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Array<{ booking: Booking; isOwn: boolean }>>();
    deskBookings.forEach(b => {
      const key = new Date(b.start_time).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ booking: b, isOwn: b.user === myUserId });
    });
    return map;
  }, [deskBookings, myUserId]);

  // ── Draft slots — span multiple days if needed ──
  const drafts: DraftSlot[] = useMemo(() => {
    if (!startDate || !endDate || !startTime || !endTime) return [];
    if (startDate === endDate) {
      if (startTime >= endTime) return [];
      return [{ date: startDate, start: startTime, end: endTime, label: desk?.name ?? 'Desk' }];
    }
    // Multi-day: first day goes to midnight, last day from midnight, middle days all-day
    const result: DraftSlot[] = [];
    let cur = startDate;
    while (cur <= endDate) {
      const isFirst = cur === startDate;
      const isLast  = cur === endDate;
      result.push({
        date:  cur,
        start: isFirst ? startTime : '00:00',
        end:   isLast  ? endTime   : '23:59',
        label: desk?.name ?? 'Desk',
      });
      // advance one day
      const next = calAddDays(dateStrToDate(cur), 1);
      cur = dateToDateStr(next);
    }
    return result;
  }, [startDate, endDate, startTime, endTime, desk?.name]);

  // ── Duration label ──
  const durationLabel = useMemo(() => {
    if (!startDate || !endDate || !startTime || !endTime) return null;
    const start = new Date(`${startDate}T${startTime}:00`);
    const end   = new Date(`${endDate}T${endTime}:00`);
    const mins  = (end.getTime() - start.getTime()) / 60_000;
    if (mins <= 0) return null;
    const days = Math.floor(mins / 1440);
    const h    = Math.floor((mins % 1440) / 60);
    const m    = mins % 60;
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (h > 0)    parts.push(`${h}h`);
    if (m > 0)    parts.push(`${m}min`);
    return parts.join(' ');
  }, [startDate, endDate, startTime, endTime]);

  // ── Validation ──
  const isValid = useMemo(() => {
    if (!startDate || !endDate || !startTime || !endTime) return false;
    const start = new Date(`${startDate}T${startTime}:00`);
    const end   = new Date(`${endDate}T${endTime}:00`);
    return end > start;
  }, [startDate, endDate, startTime, endTime]);

  // ── Confirm ──
  const handleConfirm = async () => {
    if (!desk || !isValid) return;
    setSaving(true); setError(null);
    try { await onConfirm(startDate, endDate, startTime, endTime); }
    catch (err: any) { setError(err.message || 'Failed to book desk.'); }
    finally { setSaving(false); }
  };

  const isMyDesk = desk?.booked_by_id === myUserId;
  if (!desk) return null;

  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && !saving && onClose()}>
      <DialogSurface className={styles.bookingModalSurface}>
        <DialogBody style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <DialogTitle
            action={<Button appearance="subtle" icon={<Dismiss24Regular />} onClick={onClose} disabled={saving} />}
          >
            {isMyDesk ? `Your Booking — ${desk.name}` : `Book ${desk.name}`}
          </DialogTitle>

          <DialogContent style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

            {/* ── Top row: desk info + date/time fields + actions ── */}
            <div className={styles.bookingTopRow}>

              {/* Desk chip */}
              <div className={styles.bookingDeskInfo}>
                <div className={styles.bookingDeskDot}
                  style={{ backgroundColor: isMyDesk ? '#3b82f6' : '#22c55e' }} />
                <div style={{ minWidth: 0 }}>
                  <Text weight="semibold" size={300} block style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {desk.name}
                  </Text>
                  <Text size={100} block style={{ color: tokens.colorNeutralForeground3, whiteSpace: 'nowrap' }}>
                    {roomName}
                  </Text>
                </div>
              </div>

              {/* Start date */}
              <div className={styles.bookingFieldGroup}>
                <div className={styles.bookingFieldLabel}>Start date</div>
                <DatePicker
                  value={dateStrToDate(startDate)}
                  onSelectDate={d => d && setStartDate(dateToDateStr(d))}
                  minDate={dateStrToDate(todayStr())}
                  disabled={saving}
                  style={{ width: '130px' }}
                />
              </div>

              {/* Start time */}
              <div className={styles.bookingFieldGroup}>
                <div className={styles.bookingFieldLabel}>Start time</div>
                <TimePicker
                  value={timeStrToDate(startTime, dateStrToDate(startDate))}
                  onTimeChange={(_, d) => d.selectedTime && setStartTime(dateToTimeStr(d.selectedTime))}
                  increment={30} disabled={saving} style={{ width: '110px' }}
                />
              </div>

              {/* Arrow separator */}
              <div className={styles.bookingArrow}>→</div>

              {/* End date */}
              <div className={styles.bookingFieldGroup}>
                <div className={styles.bookingFieldLabel}>End date</div>
                <DatePicker
                  value={dateStrToDate(endDate)}
                  onSelectDate={d => d && setEndDate(dateToDateStr(d))}
                  minDate={dateStrToDate(startDate)}
                  disabled={saving}
                  style={{ width: '130px' }}
                />
              </div>

              {/* End time */}
              <div className={styles.bookingFieldGroup}>
                <div className={styles.bookingFieldLabel}>End time</div>
                <TimePicker
                  value={timeStrToDate(endTime, dateStrToDate(endDate))}
                  onTimeChange={(_, d) => d.selectedTime && setEndTime(dateToTimeStr(d.selectedTime))}
                  increment={30} disabled={saving} style={{ width: '110px' }}
                />
              </div>

              {/* Timezone */}
              {TZ_LABEL && <div className={styles.tzLabel}>{TZ_LABEL}</div>}

              {/* Duration badge */}
              {durationLabel && (
                <div className={styles.durationBadge}>
                  <Clock20Regular style={{ fontSize: '12px' }} />
                  {durationLabel}
                </div>
              )}

              {/* Error inline */}
              {error && (
                <div className={styles.conflictWarning}>
                  <Warning20Regular style={{ flexShrink: 0, fontSize: '14px' }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions pushed right */}
              <div className={styles.bookingActions}>
                <Button appearance="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
                <Button appearance="primary" onClick={handleConfirm} disabled={saving || !isValid}>
                  {saving ? <Spinner size="tiny" /> : 'Confirm'}
                </Button>
              </div>
            </div>

            {/* ── Calendar fills remaining height ── */}
            <div className={styles.bookingCalSection}>

              {/* Cal toolbar */}
              <div className={styles.calViewToolbar}>
                <Button size="small" appearance="subtle" icon={<ChevronLeft20Regular />} onClick={() => navigateCal(-1)} />
                <Button size="small" appearance="subtle" icon={<ChevronRight20Regular />} onClick={() => navigateCal(1)} />
                <Text className={styles.calTitleSmall}>{calTitle}</Text>
                {(['day', 'week', 'month'] as CalView[]).map(v => (
                  <Button key={v} size="small" appearance={calView === v ? 'primary' : 'subtle'}
                    onClick={() => setCalView(v)}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </Button>
                ))}
              </div>

              {loadingCal ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Spinner size="small" />
                </div>
              ) : (
                <CalendarGrid
                  view={calView}
                  anchor={calAnchor}
                  days={calView !== 'month' ? calDays : []}
                  bookingsByDay={bookingsByDay}
                  drafts={drafts}
                />
              )}
            </div>

          </DialogContent>
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

  // ── Selection / menu ──
  const [selectedDeskId, setSelectedDeskId] = useState<number | null>(null);

  // ── Maintenance state (seeded from room prop, kept live via WS) ──
  const [isMaintenance, setIsMaintenance] = useState<boolean>(!!(room as any).is_under_maintenance);
  const [maintenanceBy, setMaintenanceBy] = useState<string | null>((room as any).maintenance_by_name || null);

  // ── Booking ──
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingDesk, setBookingDesk] = useState<DeskLiveState | null>(null);
  const openingBookingRef = useRef(false);

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

  // ── Marker click — toggle selection, menu opens immediately at marker ──
  const handleMarkerClick = (desk: DeskLiveState, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedDeskId === desk.id) {
      setSelectedDeskId(null);
      return;
    }
    setSelectedDeskId(desk.id);
  };

  const handleMenuClose = () => {
    if (!openingBookingRef.current) {
      setSelectedDeskId(null);
    }
    openingBookingRef.current = false;
  };

  // ── "Book Desk" menu item → snapshot desk, open modal immediately ──
  const handleBookDesk = (desk: DeskLiveState) => {
    openingBookingRef.current = true;
    setBookingDesk(desk);
    setBookingModalOpen(true);
  };

  const handleConfirmBooking = async (startDate: string, endDate: string, startTime: string, endTime: string) => {
    if (!bookingDesk) return;
    await bookingApi.createBooking({
      desk_id:    bookingDesk.id,
      start_time: buildISO(startDate, startTime),
      end_time:   buildISO(endDate, endTime),
    });
    handleCloseBookingModal();
    onBookingChange?.();
  };

  const handleCloseBookingModal = useCallback(() => {
    setBookingModalOpen(false);
    setBookingDesk(null);
    setSelectedDeskId(null);
  }, []);

  // ── Derived ──
  const desksWithPos   = desks.filter(d => d.pos_x !== null && d.pos_y !== null);
  const availableCount = desks.filter(d =>
    !d.is_booked && !d.is_locked && (!d.is_permanent || d.permanent_assignee === myUserId)
  ).length;

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
                        open={isSelected}
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
        desk={bookingDesk}
        roomName={room.name}
        onClose={handleCloseBookingModal}
        onConfirm={handleConfirmBooking}
        myUserId={myUserId}
        bookingApi={bookingApi}
        onLockFailed={(lockedBy) => {
          if (bookingDesk !== null) {
            setDesks(prev => prev.map(d =>
              d.id === bookingDesk.id
                ? { ...d, is_locked: true, locked_by: lockedBy }
                : d
            ));
          }
        }}
      />
    </div>
  );
};

export default RoomMapViewer;