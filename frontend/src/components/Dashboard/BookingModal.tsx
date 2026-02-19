import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  makeStyles, tokens, Text, Button, Spinner,
  Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent,
} from '@fluentui/react-components';
import {
  Dismiss24Regular, Clock20Regular, Warning20Regular,
  ChevronLeft20Regular, ChevronRight20Regular,
  CalendarDay20Regular, CalendarWeekNumbers20Regular, CalendarMonth20Regular,
  CheckmarkCircle20Regular,
} from '@fluentui/react-icons';
import { createBookingApi, type Booking } from '../../services/bookingApi';
import {
  CalendarGrid, type DraftSlot, type CalendarInteraction,
  calStartOfDay, calStartOfWeek, calAddDays, calStartOfMonth,
  calFormatShortDate, calDateStr, expandBookingsByDay,
  CAL_HOUR_START, CAL_HOUR_END, CAL_HOUR_RANGE,
} from './BookingsCalendar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateStrToDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateToDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function fmtDate(d: string): string {
  return dateStrToDate(d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function durationLabel(startDate: string, startTime: string, endDate: string, endTime: string): string | null {
  const start = new Date(`${startDate}T${startTime}:00`);
  const end = new Date(`${endDate}T${endTime}:00`);
  const mins = (end.getTime() - start.getTime()) / 60_000;
  if (mins <= 0) return null;
  const days = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(' ');
}

function snapHour(h: number): number {
  return Math.round(h * 2) / 2;
}

function hourToTimeStr(h: number): string {
  const clamped = Math.max(CAL_HOUR_START, Math.min(CAL_HOUR_END, snapHour(h)));
  const hh = Math.floor(clamped);
  const mm = clamped % 1 === 0.5 ? 30 : 0;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

type CalView = 'day' | 'week' | 'month';

const TZ_LABEL = (() => {
  try {
    return new Intl.DateTimeFormat([], { timeZoneName: 'short' })
      .formatToParts(new Date())
      .find(p => p.type === 'timeZoneName')?.value ?? '';
  } catch { return ''; }
})();

// ─── Styles ───────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
  surface: {
    maxWidth: '900px',
    width: '96vw',
    maxHeight: '94vh',
    display: 'flex',
    flexDirection: 'column',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    gap: tokens.spacingVerticalS,
  },

  // ── Selection summary bar ──
  summaryBar: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    flexWrap: 'wrap',
    flexShrink: 0,
    minHeight: '52px',
    transition: 'background-color 0.2s ease, border-color 0.2s ease',
  },
  summaryBarActive: {
    backgroundColor: tokens.colorBrandBackground2,
    borderColor: tokens.colorBrandStroke1,
  },
  summaryBarPicking: {
    backgroundColor: tokens.colorPaletteTealBackground2,
    borderColor: tokens.colorPaletteTealBorderActive,
  },
  deskChip: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    flexShrink: 0,
  },
  deskDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  summaryDivider: {
    width: '1px',
    height: '24px',
    backgroundColor: tokens.colorNeutralStroke2,
    flexShrink: 0,
  },
  summaryRange: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    flex: 1,
    flexWrap: 'wrap',
    minWidth: 0,
  },
  summaryPlaceholder: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
  },
  summaryPickingHint: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorPaletteTealForeground2,
    fontWeight: tokens.fontWeightSemibold,
    fontStyle: 'italic',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  summaryDateBlock: {
    display: 'flex',
    flexDirection: 'column',
  },
  summaryLabel: {
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: 1.2,
  },
  summaryValue: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    whiteSpace: 'nowrap',
  },
  summaryArrow: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    flexShrink: 0,
    userSelect: 'none',
  },
  durationChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: `3px 10px`,
    backgroundColor: tokens.colorBrandBackground,
    borderRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForegroundOnBrand,
    fontWeight: tokens.fontWeightSemibold,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  summaryActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    marginLeft: 'auto',
    flexShrink: 0,
    alignItems: 'center',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorPaletteRedBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorPaletteRedBorder1}`,
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
    flexShrink: 0,
  },

  // ── Calendar section ──
  calSection: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  calToolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    paddingBottom: tokens.spacingVerticalXS,
    flexShrink: 0,
  },
  calTitle: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    flex: 1,
    textAlign: 'center',
    color: tokens.colorNeutralForeground1,
  },

  // ── Step indicator ──
  stepBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `4px 0`,
    flexShrink: 0,
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    padding: '3px 10px',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid transparent`,
    transition: 'all 0.15s ease',
  },
  stepActive: {
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
    backgroundColor: tokens.colorBrandBackground2,
    borderColor: tokens.colorBrandStroke1,
  },
  stepDone: {
    color: tokens.colorNeutralForeground2,
    textDecoration: 'line-through',
  },
  stepBullet: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: tokens.fontWeightBold,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
    lineHeight: 1,
    transition: 'all 0.15s ease',
  },
  stepBulletActive: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  stepBulletDone: {
    backgroundColor: tokens.colorPaletteGreenBackground3,
    color: tokens.colorPaletteGreenForeground1,
  },
  stepArrow: {
    color: tokens.colorNeutralForeground4,
    fontSize: '12px',
  },

  loadingWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
  },
});

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BookingModalDeskInfo {
  id: number;
  name: string;
  color?: string;
}

export interface BookingModalProps {
  open: boolean;
  desk: BookingModalDeskInfo | null;
  roomName: string;
  onClose: () => void;
  onConfirm: (startDate: string, endDate: string, startTime: string, endTime: string) => Promise<void>;
  myUsername?: string;
  bookingApi: ReturnType<typeof createBookingApi>;
  onLockFailed?: (lockedBy: string | null) => void;
  /** When set, the modal is in edit mode — pre-populated with this booking's times. */
  editingBooking?: Booking | null;
  onBookingUpdated?: () => void;
  onEditBooking?: (b: Booking) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const BookingModal: React.FC<BookingModalProps> = ({
  open, desk, roomName, onClose, onConfirm,
  myUsername, bookingApi, onLockFailed,
  editingBooking, onBookingUpdated, onEditBooking,
}) => {
  const styles = useStyles();

  // ── Booking range state ──
  const [startDate, setStartDate] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);

  // ── Two-step selection: 0 = pick start, 1 = pick end ──
  const [step, setStep] = useState<0 | 1>(0);

  // ── Hover preview while waiting for end-click in day/week ──
  const [hoverTime, setHoverTime] = useState<string | null>(null);
  const [hoverDate, setHoverDateState] = useState<string | null>(null);
  const hoverColRefs = useRef<(HTMLElement | null)[]>([]);

  // ── Calendar ──
  const [calView, setCalView] = useState<CalView>('week');
  const [calAnchor, setCalAnchor] = useState<Date>(calStartOfWeek(calStartOfDay(new Date())));

  // ── Desk bookings ──
  const [deskBookings, setDeskBookings] = useState<Booking[]>([]);
  const [loadingCal, setLoadingCal] = useState(false);

  // ── Save state ──
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Lock ──
  const lockRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

    const unlockUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/bookings/unlock/`;
    const handleUnload = () => {
      if (lockedDeskIdRef.current === null) return;
      const payload = JSON.stringify({ desk_id: lockedDeskIdRef.current });
      navigator.sendBeacon(unlockUrl, new Blob([payload], { type: 'application/json' }));
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
    if (!open) return;
    if (editingBooking) {
      // Edit mode: lock in the existing start, go straight to step 1 so user just picks a new end
      const start = new Date(editingBooking.start_time);
      const sDate = calDateStr(start);
      const sTime = `${String(start.getHours()).padStart(2,'0')}:${String(start.getMinutes()).padStart(2,'0')}`;
      setStartDate(sDate); setStartTime(sTime);
      setEndDate(null); setEndTime(null);
      setStep(1);
      setCalView('week');
      setCalAnchor(calStartOfWeek(calStartOfDay(start)));
    } else {
      setStartDate(null); setStartTime(null);
      setEndDate(null); setEndTime(null);
      setStep(0);
      setCalView('week');
      setCalAnchor(calStartOfWeek(calStartOfDay(new Date())));
    }
    setError(null); setHoverTime(null); setHoverDateState(null);
  }, [open, desk?.id, editingBooking?.id]);

  // ── Reset selection when view changes ──
  useEffect(() => {
    if (editingBooking) {
      // Re-anchor the start from the editing booking, go back to step 1
      const start = new Date(editingBooking.start_time);
      const sDate = calDateStr(start);
      const sTime = `${String(start.getHours()).padStart(2,'0')}:${String(start.getMinutes()).padStart(2,'0')}`;
      setStartDate(sDate); setStartTime(sTime);
      setEndDate(null); setEndTime(null);
      setStep(1);
    } else {
      setStartDate(null); setStartTime(null);
      setEndDate(null); setEndTime(null);
      setStep(0);
    }
    setHoverTime(null); setHoverDateState(null);
  }, [calView]);

  // ── Calendar days ──
  const calDays: Date[] = useMemo(() => {
    if (calView === 'day') return [calAnchor];
    if (calView === 'week') return Array.from({ length: 7 }, (_, i) => calAddDays(calAnchor, i));
    const gs = calStartOfWeek(calStartOfMonth(calAnchor));
    return Array.from({ length: 42 }, (_, i) => calAddDays(gs, i));
  }, [calView, calDateStr(calAnchor)]);

  // ── Fetch desk bookings ──
  useEffect(() => {
    if (!open || !desk) return;
    setLoadingCal(true);
    const start = calDays[0];
    const end = calAddDays(calDays[calDays.length - 1], 1);
    bookingApi.getDeskBookingsRange(desk.id, start.toISOString(), end.toISOString())
      .then(data => setDeskBookings(data))
      .catch(() => setDeskBookings([]))
      .finally(() => setLoadingCal(false));
  }, [open, desk?.id, calDateStr(calDays[0]), calDateStr(calDays[calDays.length - 1])]);

  // ── Calendar navigation ──
  const navigateCal = (dir: -1 | 1) => setCalAnchor(prev => {
    if (calView === 'day') return calAddDays(prev, dir);
    if (calView === 'week') return calAddDays(prev, dir * 7);
    return new Date(prev.getFullYear(), prev.getMonth() + dir, 1);
  });

  const calTitle = useMemo(() => {
    if (calView === 'day') return calFormatShortDate(calAnchor);
    if (calView === 'week') {
      const s = calAnchor, e = calAddDays(s, 6);
      return `${s.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return calAnchor.toLocaleDateString([], { month: 'long', year: 'numeric' });
  }, [calView, calAnchor]);

  const bookingsByDay = useMemo(() => expandBookingsByDay(deskBookings, myUsername), [deskBookings, myUsername]);

  // ── Calendar click-click interaction handler ──
  const handleCalInteract = useCallback((sel: CalendarInteraction) => {
    if (calView === 'month') {
      // Month: CalendarGrid already manages two-click day range internally
      setStartDate(sel.startDate);
      setEndDate(sel.endDate);
      setStartTime('09:00');
      setEndTime('17:00');
      setStep(0);
      setHoverTime(null); setHoverDateState(null);
      return;
    }

    // Day / Week: click-click step logic
    // onInteract fires with startDate=endDate=clicked date, startTime=endTime=clicked time (single point)
    const clickedDate = sel.startDate;
    const clickedTime = sel.startTime;

    if (step === 0) {
      // First click: set start, advance to step 1
      setStartDate(clickedDate);
      setStartTime(clickedTime);
      setEndDate(null);
      setEndTime(null);
      setStep(1);
    } else {
      // Second click: determine end
      if (!startDate || !startTime) { setStep(0); return; }

      const startDt = new Date(`${startDate}T${startTime}:00`);
      const clickDt = new Date(`${clickedDate}T${clickedTime}:00`);

      let finalStartDate = startDate, finalStartTime = startTime;
      let finalEndDate = clickedDate, finalEndTime = clickedTime;

      // If user clicked before the start, swap
      if (clickDt < startDt) {
        finalStartDate = clickedDate; finalStartTime = clickedTime;
        finalEndDate = startDate; finalEndTime = startTime;
      }

      // Same time clicked — enforce 30 min minimum
      if (finalStartDate === finalEndDate && finalStartTime === finalEndTime) {
        const bumped = new Date(`${finalEndDate}T${finalEndTime}:00`);
        bumped.setMinutes(bumped.getMinutes() + 30);
        finalEndDate = dateToDateStr(bumped);
        finalEndTime = hourToTimeStr(bumped.getHours() + bumped.getMinutes() / 60);
      }

      setStartDate(finalStartDate); setStartTime(finalStartTime);
      setEndDate(finalEndDate); setEndTime(finalEndTime);
      setStep(0);
      setHoverTime(null); setHoverDateState(null);
    }
  }, [calView, step, startDate, startTime]);

  // ── Draft slots shown in calendar ──
  const drafts: DraftSlot[] = useMemo(() => {
    if (!startDate || !startTime) return [];

    if (step === 1 && calView !== 'month') {
      // Step 1: show start anchor + hover preview across columns
      const slots: DraftSlot[] = [];

      // Always show the anchor (30 min block)
      const [h, m] = startTime.split(':').map(Number);
      const endH = h + (m + 30 >= 60 ? 1 : 0);
      const endM = (m + 30) % 60;
      const anchorEnd = `${String(Math.min(endH, CAL_HOUR_END)).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      slots.push({ date: startDate, start: startTime, end: anchorEnd, label: '← start' });

      // If hover is on a different position, show live preview range
      if (hoverDate && hoverTime) {
        const startDt = new Date(`${startDate}T${startTime}:00`);
        const hoverDt = new Date(`${hoverDate}T${hoverTime}:00`);

        let fromDate = startDate, fromTime = startTime;
        let toDate = hoverDate, toTime = hoverTime;

        if (hoverDt < startDt) {
          fromDate = hoverDate; fromTime = hoverTime;
          toDate = startDate; toTime = startTime;
        }

        if (fromDate === toDate) {
          if (fromTime !== toTime) {
            // Remove anchor and replace with preview
            slots.length = 0;
            slots.push({ date: fromDate, start: fromTime, end: toTime, label: desk?.name ?? '' });
          }
        } else {
          // Multi-day range preview — replace anchor
          slots.length = 0;
          let cur = fromDate;
          while (cur <= toDate) {
            const isFirst = cur === fromDate;
            const isLast = cur === toDate;
            slots.push({
              date: cur,
              start: isFirst ? fromTime : '00:00',
              end: isLast ? toTime : '23:30',
              label: isFirst ? desk?.name ?? '' : '',
            });
            const next = calAddDays(dateStrToDate(cur), 1);
            cur = dateToDateStr(next);
          }
        }
      }

      return slots;
    }

    if (!endDate || !endTime) return [];

    if (startDate === endDate) {
      if (startTime >= endTime) return [];
      return [{ date: startDate, start: startTime, end: endTime, label: desk?.name ?? 'Desk' }];
    }

    const result: DraftSlot[] = [];
    let cur = startDate;
    while (cur <= endDate) {
      const isFirst = cur === startDate;
      const isLast = cur === endDate;
      result.push({
        date: cur,
        start: isFirst ? startTime : '00:00',
        end: isLast ? endTime : '23:59',
        label: desk?.name ?? 'Desk',
      });
      const next = calAddDays(dateStrToDate(cur), 1);
      cur = dateToDateStr(next);
    }
    return result;
  }, [startDate, startTime, endDate, endTime, step, calView, hoverDate, hoverTime, desk?.name]);

  // ── Hover tracking for live preview ──
  // We attach a mousemove listener to the calendar grid area
  const calGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step !== 1 || calView === 'month') return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!calGridRef.current) return;
      // Find which column day the mouse is over
      const cols = calGridRef.current.querySelectorAll('[data-cal-col]');
      for (let i = 0; i < cols.length; i++) {
        const col = cols[i] as HTMLElement;
        const rect = col.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX < rect.right) {
          const pct = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
          const hour = CAL_HOUR_START + pct * CAL_HOUR_RANGE;
          const snapped = snapHour(hour);
          const colDate = col.getAttribute('data-cal-col');
          if (colDate) {
            setHoverDateState(colDate);
            setHoverTime(hourToTimeStr(snapped));
          }
          return;
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [step, calView]);

  // ── Validity ──
  const isValid = useMemo(() => {
    if (!startDate || !endDate || !startTime || !endTime) return false;
    return new Date(`${endDate}T${endTime}:00`) > new Date(`${startDate}T${startTime}:00`);
  }, [startDate, endDate, startTime, endTime]);

  const dur = isValid && startDate && startTime && endDate && endTime
    ? durationLabel(startDate, startTime, endDate, endTime)
    : null;

  // ── Confirm ──
  const handleConfirm = async () => {
    if (!desk || !isValid || !startDate || !startTime || !endDate || !endTime) return;
    setSaving(true); setError(null);
    try {
      if (editingBooking) {
        await bookingApi.updateBooking(editingBooking.id, {
          start_time: new Date(`${startDate}T${startTime}:00`).toISOString(),
          end_time:   new Date(`${endDate}T${endTime}:00`).toISOString(),
        });
        onBookingUpdated?.();
        onClose();
      } else {
        await onConfirm(startDate, endDate, startTime, endTime);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save booking.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearSelection = () => {
    setStartDate(null); setStartTime(null);
    setEndDate(null); setEndTime(null);
    setStep(0); setHoverTime(null); setHoverDateState(null);
    setError(null);
  };

  if (!desk) return null;

  const hasSelection = !!(startDate && startTime && endDate && endTime);
  const isPicking = step === 1 && calView !== 'month';

  // ── Step labels per view ──
  const stepLabels = editingBooking
    ? calView === 'month'
      ? ['Start (fixed)', 'Click new end day']
      : ['Start (fixed)', 'Click new end time']
    : calView === 'month'
      ? ['Click start day', 'Click end day']
      : ['Click start time', 'Click end time'];

  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && !saving && onClose()}>
      <DialogSurface className={styles.surface}>
        <DialogBody className={styles.body}>
          <DialogTitle
            action={
              <Button appearance="subtle" icon={<Dismiss24Regular />} onClick={onClose} disabled={saving} />
            }
          >
            {editingBooking ? `Edit Booking — ${desk.name}` : `Book ${desk.name}`}
          </DialogTitle>

          <DialogContent className={styles.content}>

            {/* ── Selection summary bar ── */}
            <div className={`${styles.summaryBar} ${hasSelection ? styles.summaryBarActive : ''} ${isPicking ? styles.summaryBarPicking : ''}`}>
              {/* Desk chip */}
              <div className={styles.deskChip}>
                <div className={styles.deskDot} style={{ backgroundColor: desk.color ?? '#22c55e' }} />
                <Text weight="semibold" size={200}>{desk.name}</Text>
                <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>{roomName}</Text>
              </div>

              <div className={styles.summaryDivider} />

              {/* Range display */}
              <div className={styles.summaryRange}>
                {!startDate ? (
                  <span className={styles.summaryPlaceholder}>
                    {calView === 'month' ? 'Click a day to start' : 'Click a time to start'}
                  </span>
                ) : isPicking ? (
                  <>
                    <div className={styles.summaryDateBlock}>
                      <span className={styles.summaryLabel}>Start</span>
                      <span className={styles.summaryValue}>
                        {fmtDate(startDate)}{startTime ? `, ${fmtTime(startTime)}` : ''}
                      </span>
                    </div>
                    <span className={styles.summaryPickingHint}>
                      {editingBooking ? '→ click new end time' : '→ now click end time'}
                    </span>
                  </>
                ) : endDate ? (
                  <>
                    <div className={styles.summaryDateBlock}>
                      <span className={styles.summaryLabel}>Start</span>
                      <span className={styles.summaryValue}>
                        {fmtDate(startDate)}{calView !== 'month' && startTime ? `, ${fmtTime(startTime)}` : ''}
                      </span>
                    </div>
                    <span className={styles.summaryArrow}>→</span>
                    <div className={styles.summaryDateBlock}>
                      <span className={styles.summaryLabel}>End</span>
                      <span className={styles.summaryValue}>
                        {fmtDate(endDate)}{calView !== 'month' && endTime ? `, ${fmtTime(endTime)}` : ''}
                      </span>
                    </div>
                  </>
                ) : null}
              </div>

              {/* Duration + TZ */}
              {dur && (
                <div className={styles.durationChip}>
                  <Clock20Regular style={{ fontSize: '11px' }} />
                  {dur}
                </div>
              )}
              {TZ_LABEL && hasSelection && (
                <Text size={100} style={{ color: tokens.colorNeutralForeground3, whiteSpace: 'nowrap' }}>
                  {TZ_LABEL}
                </Text>
              )}

              {/* Actions */}
              <div className={styles.summaryActions}>
                {(hasSelection || isPicking) && (
                  <Button size="small" appearance="subtle" onClick={handleClearSelection} disabled={saving}>
                    Clear
                  </Button>
                )}
                <Button appearance="secondary" size="small" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  appearance="primary"
                  size="small"
                  icon={saving ? <Spinner size="tiny" /> : <CheckmarkCircle20Regular />}
                  onClick={handleConfirm}
                  disabled={saving || !isValid}
                >
                  {editingBooking ? 'Save Changes' : 'Book'}
                </Button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className={styles.errorBanner}>
                <Warning20Regular style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{error}</span>
              </div>
            )}

            {/* ── Calendar section ── */}
            <div className={styles.calSection}>

              {/* Toolbar */}
              <div className={styles.calToolbar}>
                <Button size="small" appearance="subtle" icon={<ChevronLeft20Regular />}
                  onClick={() => navigateCal(-1)} />
                <Button size="small" appearance="subtle" icon={<ChevronRight20Regular />}
                  onClick={() => navigateCal(1)} />
                <Text className={styles.calTitle}>{calTitle}</Text>
                {(['day', 'week', 'month'] as CalView[]).map(v => (
                  <Button
                    key={v} size="small"
                    appearance={calView === v ? 'primary' : 'subtle'}
                    icon={v === 'day'
                      ? <CalendarDay20Regular />
                      : v === 'week'
                      ? <CalendarWeekNumbers20Regular />
                      : <CalendarMonth20Regular />}
                    onClick={() => setCalView(v)}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </Button>
                ))}
              </div>

              {/* Step indicator */}
              <div className={styles.stepBar}>
                {stepLabels.map((label, i) => {
                  const isActive = step === i;
                  const isDone = (i === 0 && step === 1) || hasSelection;
                  return (
                    <React.Fragment key={i}>
                      {i > 0 && <span className={styles.stepArrow}>›</span>}
                      <div className={`${styles.step} ${isActive ? styles.stepActive : ''} ${isDone && !isActive ? styles.stepDone : ''}`}>
                        <span className={`${styles.stepBullet} ${isActive ? styles.stepBulletActive : ''} ${isDone && !isActive ? styles.stepBulletDone : ''}`}>
                          {isDone && !isActive ? '✓' : i + 1}
                        </span>
                        {label}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {loadingCal ? (
                <div className={styles.loadingWrap}><Spinner size="small" /></div>
              ) : (
                // Wrap the grid with a ref for hover tracking
                <div ref={calGridRef} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <CalendarGrid
                    view={calView}
                    anchor={calAnchor}
                    days={calView !== 'month' ? calDays : []}
                    bookingsByDay={bookingsByDay}
                    drafts={drafts}
                    interactive
                    clickMode={calView !== 'month'}
                    onInteract={handleCalInteract}
                    calColDateAttr={calView !== 'month' ? calDays.map(d => calDateStr(d)) : undefined}
                    onEditBooking={onEditBooking}
                  />
                </div>
              )}
            </div>

          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default BookingModal;