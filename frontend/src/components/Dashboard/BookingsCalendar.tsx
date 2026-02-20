import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  makeStyles, tokens, Text, Button, Spinner, Tooltip,
  Popover, PopoverTrigger, PopoverSurface,
} from '@fluentui/react-components';
import {
  ChevronLeft20Regular, ChevronRight20Regular,
  Delete20Regular, Edit20Regular, Clock20Regular, DoorRegular, BuildingRegular,
  CalendarLtr20Regular, CalendarDay20Regular,
  CalendarWeekNumbers20Regular, CalendarMonth20Regular,
} from '@fluentui/react-icons';
import { createBookingApi, type Booking } from '../../services/bookingApi';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';

// ─── View modes ───────────────────────────────────────────────────────────────
type ViewMode = 'day' | 'week' | 'month';

// ─── Shared calendar helpers ──────────────────────────────────────────────────
export function calStartOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
export function calStartOfWeek(d: Date): Date {
  const dow = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((dow + 6) % 7));
  return calStartOfDay(mon);
}
export function calStartOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function calAddDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
export function calIsSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}
export function calIsToday(d: Date): boolean { return calIsSameDay(d, new Date()); }
/** Format a local Date to YYYY-MM-DD without UTC conversion (avoids off-by-one for timezones ahead of UTC). */
export function calDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function calFormatTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}
/** Hook-based formatter — respects user's time_format preference. */
function useFormatTime() {
  const { formatTime } = usePreferences();
  return (iso: string) => { try { return formatTime(new Date(iso)); } catch { return ''; } };
}
export function calFormatShortDate(d: Date): string {
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export const CAL_HOUR_START = 7;
export const CAL_HOUR_END   = 21;
export const CAL_HOUR_RANGE = CAL_HOUR_END - CAL_HOUR_START;
export const CAL_CELL_H     = 56; // px per hour

export function calTopPct(iso: string): number {
  const d = new Date(iso);
  const h = d.getHours() + d.getMinutes() / 60;
  return Math.max(0, Math.min(100, ((h - CAL_HOUR_START) / CAL_HOUR_RANGE) * 100));
}
export function calHeightPct(s: string, e: string): number {
  const diffH = (new Date(e).getTime() - new Date(s).getTime()) / 3_600_000;
  return Math.max(1.5, (diffH / CAL_HOUR_RANGE) * 100);
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS    = Array.from({ length: CAL_HOUR_RANGE + 1 }, (_, i) => CAL_HOUR_START + i);

/** Expand bookings into a day-keyed map, spreading multi-day bookings across every day they cover. */
export function expandBookingsByDay(
  bookings: Booking[],
  myUsername?: string
): Map<string, Array<{ booking: Booking; isOwn: boolean; dayStart: string; dayEnd: string }>> {
  const map = new Map<string, Array<{ booking: Booking; isOwn: boolean; dayStart: string; dayEnd: string }>>();

  bookings.forEach(b => {
    const isOwn = !!myUsername && b.username === myUsername;
    const start = new Date(b.start_time);
    const end   = new Date(b.end_time);
    // Walk from start day to end day
    let cur = calStartOfDay(start);
    const endDay = calStartOfDay(end);
    while (cur <= endDay) {
      const key = calDateStr(cur);
      const isFirst = calIsSameDay(cur, start);
      const isLast  = calIsSameDay(cur, end);
      // Per-day display times: clamp to the actual booking times on boundary days
      const dayStart = isFirst ? b.start_time : `${key}T00:00:00`;
      const dayEnd   = isLast  ? b.end_time   : `${key}T23:59:59`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ booking: b, isOwn, dayStart, dayEnd });
      cur = calAddDays(cur, 1);
    }
  });

  return map;
}


function snapHour(h: number): number { return Math.round(h * 2) / 2; }

function hourToTimeStr(h: number): string {
  const clamped = Math.max(CAL_HOUR_START, Math.min(CAL_HOUR_END, snapHour(h)));
  const hh = Math.floor(clamped);
  const mm  = clamped % 1 === 0.5 ? 30 : 0;
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
}

function pxToHour(y: number, colHeight: number): number {
  const pct = Math.max(0, Math.min(1, y / colHeight));
  return CAL_HOUR_START + pct * CAL_HOUR_RANGE;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
export const useCalStyles = makeStyles({
  root: {
    display: 'flex', flexDirection: 'column', height: '100%',
    overflow: 'hidden', gap: tokens.spacingVerticalS,
  },
  toolbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM, flexShrink: 0, flexWrap: 'wrap',
  },
  toolbarLeft:  { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS },
  titleText: {
    fontSize: tokens.fontSizeBase300, fontWeight: tokens.fontWeightSemibold,
    minWidth: '148px', textAlign: 'center',
  },
  body: { flex: 1, overflowY: 'auto', overflowX: 'hidden' },

  // ── Column headers ──
  colHeaderRow: {
    display: 'grid', gridTemplateColumns: '52px 1fr',
    flexShrink: 0, borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  colHeader: { display: 'flex', flex: 1, borderLeft: `1px solid ${tokens.colorNeutralStroke2}` },
  colHeaderCell: {
    flex: 1, padding: `${tokens.spacingVerticalXS} 4px`,
    textAlign: 'center', fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2, fontWeight: tokens.fontWeightSemibold,
  },
  colHeaderToday: { color: tokens.colorBrandForeground1 },
  todayCircle: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '24px', height: '24px', borderRadius: '50%',
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    fontSize: tokens.fontSizeBase300, fontWeight: tokens.fontWeightBold,
  },

  // ── Time grid ──
  timeGrid: {
    display: 'grid', gridTemplateColumns: '52px 1fr',
    minHeight: `${CAL_HOUR_RANGE * CAL_CELL_H}px`,
  },
  timeGutter: { display: 'flex', flexDirection: 'column' },
  timeLabel: {
    height: `${CAL_CELL_H}px`, display: 'flex', alignItems: 'flex-start',
    paddingTop: '2px', paddingRight: '6px',
    fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3,
    textAlign: 'right', justifyContent: 'flex-end', boxSizing: 'border-box',
  },
  dayColumns: { display: 'flex', flex: 1, position: 'relative' },
  dayCol: { flex: 1, position: 'relative', borderLeft: `1px solid ${tokens.colorNeutralStroke2}` },
  dayColInteractive: { cursor: 'pointer' },
  hourLine: {
    position: 'absolute', left: 0, right: 0, height: '1px',
    backgroundColor: tokens.colorNeutralStroke2, pointerEvents: 'none',
  },
  halfHourLine: {
    position: 'absolute', left: 0, right: 0, height: '1px',
    backgroundColor: tokens.colorNeutralStroke1, pointerEvents: 'none', opacity: 0.5,
  },

  // ── Events ──
  eventBlock: {
    position: 'absolute', left: '3px', right: '3px',
    borderRadius: tokens.borderRadiusSmall, padding: '3px 6px',
    overflow: 'hidden', cursor: 'pointer',
    backgroundColor: tokens.colorBrandBackground,
    borderLeft: `3px solid ${tokens.colorBrandBackgroundPressed}`,
    boxSizing: 'border-box', minHeight: '18px',
    transition: 'filter 0.1s',
    ':hover': { filter: 'brightness(0.88)' },
  },
  eventBlockOther: {
    backgroundColor: tokens.colorPaletteRedBackground3,
    borderLeft: `3px solid ${tokens.colorPaletteRedBorderActive}`,
  },
  eventBlockDraft: {
    backgroundColor: tokens.colorPaletteTealBorderActive,
    borderLeft: `3px solid ${tokens.colorPaletteTealForeground2}`,
    border: `2px dashed ${tokens.colorPaletteTealForeground2}`,
    opacity: 0.85, cursor: 'default',
    transition: 'none',
  },
  // Own booking in BookingModal clickMode — user can click to shorten
  eventBlockOwnClickMode: {
    cursor: 'ns-resize',
    opacity: 0.82,
    outline: `2px dashed ${tokens.colorNeutralForegroundOnBrand}`,
    outlineOffset: '-3px',
    ':hover': { opacity: 1, filter: 'brightness(0.92)' },
  },
  // Another user's booking in BookingModal clickMode — blocks the click
  eventBlockBlocked: {
    cursor: 'not-allowed',
    opacity: 0.75,
  },
  eventTitle:      { fontSize: '11px', fontWeight: tokens.fontWeightSemibold, color: tokens.colorNeutralForegroundOnBrand, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.3' },
  eventTitleOther: { color: tokens.colorNeutralForegroundOnBrand },
  eventTitleDraft: { color: tokens.colorNeutralForegroundOnBrand },
  eventMeta:       { fontSize: '10px', color: tokens.colorNeutralForegroundOnBrand, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.3', opacity: 0.85 },
  eventMetaOther:  { color: tokens.colorNeutralForegroundOnBrand },
  nowLine: {
    position: 'absolute', left: 0, right: 0, height: '2px',
    backgroundColor: tokens.colorPaletteRedForeground1, zIndex: 10, pointerEvents: 'none',
  },
  nowDot: {
    position: 'absolute', left: '-5px', top: '-4px',
    width: '10px', height: '10px', borderRadius: '50%',
    backgroundColor: tokens.colorPaletteRedForeground1,
  },

  // ── Time tooltip while dragging ──
  dragTooltip: {
    position: 'absolute', left: '50%', transform: 'translateX(-50%)',
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusSmall,
    padding: '2px 6px', fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    pointerEvents: 'none', zIndex: 20,
    whiteSpace: 'nowrap', boxShadow: tokens.shadow4,
  },

  // ── Month ──
  monthGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  monthDayHeader: {
    padding: '4px 6px', fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold, color: tokens.colorNeutralForeground3,
    textAlign: 'center', borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  monthCell: {
    minHeight: '88px', borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    padding: '4px 5px', display: 'flex', flexDirection: 'column', gap: '2px',
  },
  monthCellInteractive: {
    cursor: 'pointer',
    ':hover': { backgroundColor: tokens.colorNeutralBackground3 },
  },
  monthCellOtherMonth: { backgroundColor: tokens.colorNeutralBackground2 },
  monthCellToday:      { backgroundColor: tokens.colorBrandBackground2 },
  monthCellPending: {
    backgroundColor: tokens.colorPaletteTealBackground2,
    outline: `2px solid ${tokens.colorPaletteTealBorderActive}`,
    outlineOffset: '-2px',
  },
  monthCellInRange: { backgroundColor: tokens.colorPaletteTealBackground2 },
  monthDayNum: {
    fontSize: tokens.fontSizeBase200, fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2, marginBottom: '2px',
    width: '22px', height: '22px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '50%', flexShrink: 0,
  },
  monthDayNumToday: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  monthEvent: {
    fontSize: '10px', padding: '1px 5px', borderRadius: '3px',
    backgroundColor: tokens.colorBrandBackground, color: tokens.colorNeutralForegroundOnBrand,
    borderLeft: `2px solid ${tokens.colorBrandBackgroundPressed}`,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px',
    ':hover': { filter: 'brightness(0.9)' },
  },
  monthEventOther: {
    backgroundColor: tokens.colorPaletteRedBackground3,
    color: tokens.colorNeutralForegroundOnBrand,
    borderLeft: `2px solid ${tokens.colorPaletteRedBorderActive}`,
  },
  monthEventDraft: {
    backgroundColor: tokens.colorPaletteTealBorderActive,
    color: tokens.colorNeutralForegroundOnBrand,
    borderLeft: `2px dashed ${tokens.colorPaletteTealForeground2}`,
  },
  monthEventDeleteBtn: {
    background: 'none', border: 'none', padding: '0', margin: '0',
    cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0,
    color: 'inherit', opacity: 0.8, lineHeight: 1,
    ':hover': { opacity: 1 },
  },
  monthEventLabel: {
    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  monthMore: { fontSize: '10px', color: tokens.colorNeutralForeground3, paddingLeft: '4px' },
  monthHint: {
    fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3,
    textAlign: 'center', padding: `${tokens.spacingVerticalXS} 0`,
    flexShrink: 0, fontStyle: 'italic',
  },

  // ── Popup ──
  eventPopup: {
    display: 'flex', flexDirection: 'column', gap: '4px',
    padding: tokens.spacingVerticalS, minWidth: '190px',
  },
  popupTitle: { fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase300 },
  popupRow: {
    display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS,
    fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground2,
  },

  // ── Empty / loading ──
  empty: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    color: tokens.colorNeutralForeground3, gap: tokens.spacingVerticalS,
    textAlign: 'center', padding: tokens.spacingVerticalXL, minHeight: '160px',
  },
  loadingWrap: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '160px',
  },
});

// ─── EventPopup ───────────────────────────────────────────────────────────────

const EventPopup: React.FC<{
  booking: Booking; isOwn: boolean;
  onCancel?: () => void; cancelling: boolean;
  onEdit?: () => void;
}> = ({ booking, isOwn, onCancel, cancelling, onEdit }) => {
  const s = useCalStyles();
  const fmt = useFormatTime();
  return (
    <div className={s.eventPopup}>
      <div className={s.popupTitle}>{booking.desk.name}</div>
      <div className={s.popupRow}>
        <Clock20Regular style={{ fontSize: '13px', flexShrink: 0 }} />
        {fmt(booking.start_time)} – {fmt(booking.end_time)}
      </div>
      <div className={s.popupRow}>
        <DoorRegular style={{ fontSize: '13px', flexShrink: 0 }} />
        {booking.room_name}
      </div>
      <div className={s.popupRow}>
        <BuildingRegular style={{ fontSize: '13px', flexShrink: 0 }} />
        {booking.location_name}
      </div>
      {!isOwn && (
        <div className={s.popupRow} style={{ color: tokens.colorPaletteRedForeground1, fontSize: '10px' }}>
          Booked by {booking.username}
        </div>
      )}
      {isOwn && onEdit && (
        <Button
          appearance="subtle" size="small"
          icon={<Edit20Regular />}
          onClick={onEdit}
          style={{ marginTop: '4px' }}
        >
          Edit booking
        </Button>
      )}
      {isOwn && onCancel && (
        <Button
          appearance="subtle" size="small"
          icon={cancelling ? <Spinner size="tiny" /> : <Delete20Regular />}
          onClick={onCancel} disabled={cancelling}
          style={{ color: tokens.colorPaletteRedForeground1 }}
        >
          Cancel booking
        </Button>
      )}
    </div>
  );
};

// ─── CalendarGrid ─────────────────────────────────────────────────────────────

export interface DraftSlot {
  date: string;   // YYYY-MM-DD
  start: string;  // HH:MM
  end: string;    // HH:MM
  label: string;
}

export interface CalendarInteraction {
  startDate: string; endDate: string;
  startTime: string; endTime: string;
}

export interface CalendarGridProps {
  view: ViewMode;
  anchor: Date;
  days: Date[];
  bookingsByDay: Map<string, Array<{ booking: Booking; isOwn: boolean; dayStart?: string; dayEnd?: string }>>;
  drafts?: DraftSlot[];
  interactive?: boolean;
  /** When true: single click fires onInteract with a point (startDate=endDate, startTime=endTime).
   *  The caller manages the two-step click-click logic.
   *  When false (default): drag to select fires onInteract with full range. */
  clickMode?: boolean;
  /** When true, free-slot column clicks are blocked — used when a shorten/edit
   *  selection is already committed and waiting for Save or Cancel. */
  clickLocked?: boolean;
  /** Optional array of date strings to attach as data-cal-col attributes on each day column (for external hover tracking). */
  calColDateAttr?: string[];
  onInteract?: (sel: CalendarInteraction) => void;
  onCancelBooking?: (b: Booking) => void;
  onEditBooking?: (b: Booking) => void;
  cancellingId?: number | null;
  /**
   * When set (edit mode in BookingModal), event blocks for THIS booking ID become
   * click-transparent so the user can click through them to pick a new time.
   * All other booking blocks remain non-interactive in clickMode.
   */
  editingBookingId?: number | null;
  /**
   * Called in clickMode when the user clicks their own booking block.
   * BookingModal uses this to enter shortening mode (pre-fill start, pick new end).
   */
  onOwnBookingClick?: (booking: Booking) => void;
}

// Internal drag state (lives in a ref — no re-renders during drag)
interface DragState {
  active: boolean;
  startColIdx: number;   // which day column drag started in
  startHour: number;     // raw snapped hour at mousedown
  curColIdx: number;
  curHour: number;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  view, anchor, days, bookingsByDay,
  drafts = [], interactive = false, clickMode = false, clickLocked = false, calColDateAttr,
  onInteract, onCancelBooking, onEditBooking, cancellingId,
  editingBookingId = null, onOwnBookingClick,
}) => {
  const s = useCalStyles();
  const fmt = useFormatTime();
  const [now, setNow] = useState(new Date());

  // ── Past-time guards (Bug 1) ──
  // Returns true if the calendar date is strictly before today (whole-day check)
  const isPastDate = useCallback((d: Date): boolean => {
    const today = calStartOfDay(new Date());
    return calStartOfDay(d) < today;
  }, []);

  // Returns true if date+hour combination is before current moment (30-min snapped)
  const isPastHour = useCallback((d: Date, snappedHour: number): boolean => {
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate(),
      Math.floor(snappedHour), snappedHour % 1 === 0.5 ? 30 : 0, 0, 0);
    return target < new Date();
  }, []);

  // ── Live preview of the in-progress drag (rendered via React state) ──
  const [liveDrafts, setLiveDrafts] = useState<DraftSlot[]>([]);

  // ── Month: pending first-click date + hover preview ──
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [hoverDate,   setHoverDate]   = useState<string | null>(null);

  // ── Drag refs — no setState on every mousemove ──
  const dragRef  = useRef<DragState>({ active: false, startColIdx: 0, startHour: 0, curColIdx: 0, curHour: 0 });
  const colRefs  = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Clear live drafts when view changes or interactive is toggled off
  useEffect(() => { setLiveDrafts([]); setPendingDate(null); setHoverDate(null); }, [view, interactive]);

  // ── Pixel → column index ──
  const getColIdxFromX = useCallback((clientX: number): number => {
    for (let i = 0; i < colRefs.current.length; i++) {
      const el = colRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX < r.right) return i;
    }
    // Clamp to edges
    const first = colRefs.current[0]?.getBoundingClientRect();
    const last  = colRefs.current[colRefs.current.length - 1]?.getBoundingClientRect();
    if (first && clientX < first.left) return 0;
    if (last  && clientX > last.right) return colRefs.current.length - 1;
    return 0;
  }, []);

  const getHourFromY = useCallback((clientY: number, colIdx: number): number => {
    const el = colRefs.current[colIdx];
    if (!el) return CAL_HOUR_START;
    const r = el.getBoundingClientRect();
    return pxToHour(clientY - r.top, r.height);
  }, []);

  // ── Build DraftSlot[] from drag state ──
  const buildDraftSlots = useCallback((
    startColIdx: number, startHour: number,
    curColIdx: number,   curHour: number
  ): DraftSlot[] => {
    // Normalise direction
    let fromCol = startColIdx, toCol = curColIdx;
    let fromHour = startHour,  toHour = curHour;

    // Same column — if dragging up, swap times (min 30 min)
    if (fromCol === toCol) {
      if (fromHour > toHour) [fromHour, toHour] = [toHour, fromHour];
      if (toHour - fromHour < 0.5) toHour = fromHour + 0.5;
      const date = days[fromCol] ? calDateStr(days[fromCol]) : undefined;
      if (!date) return [];
      return [{ date, start: hourToTimeStr(fromHour), end: hourToTimeStr(toHour), label: '' }];
    }

    // Multi-column — ensure left→right order
    if (fromCol > toCol) {
      [fromCol, toCol] = [toCol, fromCol];
      [fromHour, toHour] = [toHour, fromHour];
    }

    const result: DraftSlot[] = [];
    for (let ci = fromCol; ci <= toCol; ci++) {
      const date = days[ci] ? calDateStr(days[ci]) : undefined;
      if (!date) continue;
      const isFirst = ci === fromCol;
      const isLast  = ci === toCol;
      result.push({
        date,
        start: isFirst ? hourToTimeStr(fromHour) : '00:00',
        end:   isLast  ? hourToTimeStr(toHour)   : '23:30',
        label: '',
      });
    }
    return result;
  }, [days]);

  // ── Mouse handlers ──
  const handleColClick = useCallback((e: React.MouseEvent, colIdx: number) => {
    if (!interactive || !clickMode || !onInteract) return;
    const date = days[colIdx] ? calDateStr(days[colIdx]) : undefined;
    if (!date) return;

    const rawHour = getHourFromY(e.clientY, colIdx);
    const snappedHour = snapHour(rawHour);

    const colEvts = bookingsByDay.get(date) ?? [];
    const toH = (iso: string) => { const d = new Date(iso); return d.getHours() + d.getMinutes() / 60; };

    // Check if click lands inside the booking currently being edited.
    const isInsideEditingBooking = editingBookingId != null && colEvts.some(({ booking }) =>
      booking.id === editingBookingId &&
      rawHour >= toH(booking.start_time) &&
      rawHour < toH(booking.end_time)
    );

    // clickLocked: selection committed, waiting for Save/Cancel.
    // Block free-slot clicks entirely — but always allow clicks on the editing
    // booking itself so the user can re-click to adjust their choice.
    if (clickLocked && !isInsideEditingBooking) return;

    // Reject past-time clicks on free slots. Inside the editing booking's own
    // block the user is adjusting an existing interval — allow it. Everywhere else
    // (including other columns on today) the normal past-time wall applies.
    if (!isInsideEditingBooking && days[colIdx] && isPastHour(days[colIdx], snappedHour)) return;

    // Block clicks inside any booked interval — own or other — unless this is
    // the exact booking currently being edited (pointerEvents:none, falls through).
    for (const { booking, isOwn } of colEvts) {
      const bStart = toH(booking.start_time);
      const bEnd   = toH(booking.end_time);
      if (rawHour >= bStart && rawHour < bEnd) {
        if (isOwn && booking.id === editingBookingId) continue;
        return;
      }
    }

    const timeStr = hourToTimeStr(snappedHour);
    onInteract({ startDate: date, endDate: date, startTime: timeStr, endTime: timeStr });
  }, [interactive, clickMode, clickLocked, getHourFromY, days, onInteract, isPastHour, bookingsByDay, onOwnBookingClick, editingBookingId]);

  const handleColMouseDown = useCallback((e: React.MouseEvent, colIdx: number) => {
    if (!interactive || e.button !== 0 || clickMode) return;
    e.preventDefault();

    const hour = snapHour(getHourFromY(e.clientY, colIdx));
    // Bug 1: reject drag starts in the past
    if (days[colIdx] && isPastHour(days[colIdx], hour)) return;
    dragRef.current = { active: true, startColIdx: colIdx, startHour: hour, curColIdx: colIdx, curHour: hour + 0.5 };

    const slots = buildDraftSlots(colIdx, hour, colIdx, hour + 0.5);
    setLiveDrafts(slots);

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current.active) return;
      const ci   = getColIdxFromX(ev.clientX);
      const rawHour = snapHour(getHourFromY(ev.clientY, ci));
      // Clamp the cursor position: if the hovered column is in the past,
      // snap to "now" so the selection never extends into past time.
      const colDay = days[ci];
      const hour = (colDay && isPastHour(colDay, rawHour))
        ? snapHour(new Date().getHours() + new Date().getMinutes() / 60)
        : rawHour;
      dragRef.current.curColIdx = ci;
      dragRef.current.curHour   = hour;
      setLiveDrafts(buildDraftSlots(
        dragRef.current.startColIdx, dragRef.current.startHour, ci, hour
      ));
    };

    const onUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      if (!dragRef.current.active) return;
      dragRef.current.active = false;

      const dr = dragRef.current;
      const ci  = getColIdxFromX(ev.clientX);
      const endH = snapHour(getHourFromY(ev.clientY, ci));
      const slots = buildDraftSlots(dr.startColIdx, dr.startHour, ci, endH);

      if (slots.length === 0 || !onInteract) { setLiveDrafts([]); return; }

      // Compute canonical start/end from built slots
      const first = slots[0];
      const last  = slots[slots.length - 1];

      // If single-column drag ended up with same start/end snap, ensure 30 min
      let st = first.start, et = last.end;
      if (first.date === last.date && st >= et) et = hourToTimeStr(snapHour(getHourFromY(ev.clientY, ci)) + 0.5);

      onInteract({ startDate: first.date, endDate: last.date, startTime: st, endTime: et });
      setLiveDrafts(slots);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  }, [interactive, clickMode, getColIdxFromX, getHourFromY, buildDraftSlots, onInteract, isPastHour]);

  // ── Month click-click ──
  const handleMonthCellClick = useCallback((dateKey: string, d: Date) => {
    if (!interactive || !onInteract) return;
    // Bug 1: reject clicks on past dates
    if (isPastDate(d)) return;
    if (!pendingDate) {
      // First click — set pending
      setPendingDate(dateKey);
    } else {
      // Second click — commit range (always min→max)
      const [d1, d2] = pendingDate <= dateKey
        ? [pendingDate, dateKey]
        : [dateKey, pendingDate];
      setPendingDate(null);
      setHoverDate(null);
      // If the start date is today, snap startTime to the next 30-min boundary
      // so the booking is never in the past.
      const todayKey = calDateStr(calStartOfDay(new Date()));
      let startTime = '00:00';
      if (d1 === todayKey) {
        const now = new Date();
        const rawH = now.getHours() + now.getMinutes() / 60;
        const snapped = Math.ceil(rawH * 2) / 2; // round UP to next 30-min
        const hh = Math.floor(snapped) % 24;
        const mm = snapped % 1 === 0.5 ? 30 : 0;
        startTime = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      }
      onInteract({ startDate: d1, endDate: d2, startTime, endTime: '23:59' });
    }
  }, [interactive, pendingDate, onInteract, isPastDate]);

  // ── Now line ──
  const nowTopPct = Math.max(0, Math.min(100,
    ((now.getHours() + now.getMinutes() / 60 - CAL_HOUR_START) / CAL_HOUR_RANGE) * 100
  ));

  const renderHourLines = () =>
    HOURS.map((h, i) => (
      <React.Fragment key={h}>
        <div className={s.hourLine} style={{ top: `${(i / CAL_HOUR_RANGE) * 100}%` }} />
        {i < CAL_HOUR_RANGE && (
          <div className={s.halfHourLine} style={{ top: `${((i + 0.5) / CAL_HOUR_RANGE) * 100}%` }} />
        )}
      </React.Fragment>
    ));

  const renderNowLine = (d: Date) => {
    if (!calIsSameDay(d, now)) return null;
    const h = now.getHours() + now.getMinutes() / 60;
    if (h < CAL_HOUR_START || h > CAL_HOUR_END) return null;
    return (
      <div className={s.nowLine} style={{ top: `${nowTopPct}%` }}>
        <div className={s.nowDot} />
      </div>
    );
  };

  // Merge external drafts + live drag drafts (live takes priority)
  const activeDrafts = liveDrafts.length > 0 ? liveDrafts : drafts;

  const renderDraftBlocks = (d: Date) => {
    const key = calDateStr(d);

    // Helper: convert HH:MM string to decimal hours
    const toH = (t: string) => { const [h, m] = t.split(':').map(Number); return h + m / 60; };

    return activeDrafts
      .filter(dr => dr.date === key)
      .map((dr, i) => {
        // Clamp displayed start/end to the visible grid window
        const rawStart = toH(dr.start);
        const rawEnd   = toH(dr.end);
        const visStart = Math.max(rawStart, CAL_HOUR_START);
        const visEnd   = Math.min(rawEnd,   CAL_HOUR_END);

        // Skip blocks entirely outside the visible range
        if (visEnd <= visStart) return null;

        const topP    = ((visStart - CAL_HOUR_START) / CAL_HOUR_RANGE) * 100;
        const heightP = Math.max(1.5, ((visEnd - visStart) / CAL_HOUR_RANGE) * 100);

        // Label: show actual (unclamped) time range so user sees e.g. "00:00 – 23:59"
        const timeRange = `${dr.start} – ${dr.end}`;

        return (
          <div key={`draft-${i}`}
            className={`${s.eventBlock} ${s.eventBlockDraft}`}
            style={{ top: `${topP}%`, height: `${heightP}%` }}
          >
            <div className={`${s.eventTitle} ${s.eventTitleDraft}`}>
              {dr.label || timeRange}
            </div>
            {dr.label && (
              <div className={`${s.eventMeta} ${s.eventMetaOther}`}>{timeRange}</div>
            )}
            {liveDrafts.length > 0 && i === 0 && (
              <div className={s.dragTooltip} style={{ top: '-18px' }}>
                {dr.start}
              </div>
            )}
          </div>
        );
      })
      .filter(Boolean);
  };

  const renderMonthDraftBlocks = (d: Date) => {
    const key = calDateStr(d);
    return (liveDrafts.length > 0 ? liveDrafts : drafts)
      .filter(dr => dr.date === key && dr.start < dr.end)
      .map((dr, i) => (
        <div key={`draft-${i}`} className={`${s.monthEvent} ${s.monthEventDraft}`}>
          <span className={s.monthEventLabel}>
            {dr.start}–{dr.end}{dr.label ? ` ${dr.label}` : ''}
          </span>
        </div>
      ));
  };

  const renderTimeGutter = () => (
    <div className={s.timeGutter}>
      {HOURS.map(h => (
        <div key={h} className={s.timeLabel}>
          {String(h).padStart(2,'0')}:00
        </div>
      ))}
    </div>
  );

  // ── Month view ──────────────────────────────────────────────────────────────
  if (view === 'month') {
    const gridStart = calStartOfWeek(calStartOfMonth(anchor));
    const cells = Array.from({ length: 42 }, (_, i) => calAddDays(gridStart, i));
    return (
      <div className={s.body}>
        {interactive && (
          <div className={s.monthHint}>
            {pendingDate
              ? 'Now click the end date'
              : 'Click a day to start selecting a range'}
          </div>
        )}
        <div className={s.monthGrid}>
          {WEEKDAYS.map(d => <div key={d} className={s.monthDayHeader}>{d}</div>)}
          {cells.map((d, i) => {
            const inMonth  = d.getMonth() === anchor.getMonth();
            const todayDay = calIsToday(d);
            const key      = calDateStr(d);
            const evts     = bookingsByDay.get(key) ?? [];
            const visible  = evts.slice(0, 3);
            const overflow = evts.length - visible.length;
            const isPending = pendingDate === key;
            // Range highlight: use lexicographic string comparison (ISO dates sort correctly)
            // Show between pendingDate and hoverDate (or committed end) as user moves mouse
            const rangeEnd   = hoverDate ?? pendingDate;
            const rangeStart = pendingDate;
            const isInRange  = rangeStart !== null && rangeEnd !== null && rangeStart !== rangeEnd &&
              key > (rangeStart < rangeEnd ? rangeStart : rangeEnd) &&
              key < (rangeStart < rangeEnd ? rangeEnd : rangeStart);
            const isRangeEnd = rangeEnd !== null && rangeEnd !== rangeStart && key === rangeEnd && pendingDate !== null;

            const isPast = interactive && isPastDate(d);
            // Suppress range-highlight colouring on past cells
            const showInRange  = isInRange  && !isPast;
            const showRangeEnd = isRangeEnd && !isPast;
            return (
              <div
                key={i}
                className={[
                  s.monthCell,
                  !inMonth        ? s.monthCellOtherMonth  : '',
                  todayDay        ? s.monthCellToday        : '',
                  isPending       ? s.monthCellPending      : '',
                  showInRange     ? s.monthCellInRange      : '',
                  showRangeEnd    ? s.monthCellPending      : '',
                  interactive && !isPast ? s.monthCellInteractive : '',
                ].join(' ')}
                style={isPast ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                onClick={!isPast ? () => handleMonthCellClick(key, d) : undefined}
                onMouseEnter={interactive && pendingDate && !isPast ? () => setHoverDate(key) : undefined}
                onMouseLeave={interactive && pendingDate ? () => setHoverDate(null) : undefined}
              >
                <div className={`${s.monthDayNum} ${todayDay ? s.monthDayNumToday : ''}`}>
                  {d.getDate()}
                </div>
                {renderMonthDraftBlocks(d)}
                  {visible.map(({ booking, isOwn, dayStart, dayEnd }) => (
                  <Popover key={`${booking.id}-${key}`} positioning="below-start" withArrow openOnHover={false}>
                    <PopoverTrigger disableButtonEnhancement>
                      <div className={`${s.monthEvent} ${!isOwn ? s.monthEventOther : ''}`}
                        onClick={e => e.stopPropagation()}>
                        <span className={s.monthEventLabel}>
                          {fmt(dayStart ?? booking.start_time)}–{fmt(dayEnd ?? booking.end_time)} {booking.desk.name}
                        </span>
                        {isOwn && onCancelBooking && (
                          cancellingId === booking.id
                            ? <Spinner size="tiny" />
                            : (
                              <button
                                className={s.monthEventDeleteBtn}
                                title="Cancel booking"
                                onClick={e => { e.stopPropagation(); onCancelBooking(booking); }}
                              >
                                <Delete20Regular style={{ fontSize: '11px' }} />
                              </button>
                            )
                        )}
                      </div>
                    </PopoverTrigger>
                    <PopoverSurface style={{ padding: 0 }}>
                      <EventPopup booking={booking} isOwn={isOwn}
                        onEdit={isOwn && onEditBooking ? () => onEditBooking(booking) : undefined}
                        onCancel={isOwn && onCancelBooking ? () => onCancelBooking(booking) : undefined}
                        cancelling={cancellingId === booking.id} />
                    </PopoverSurface>
                  </Popover>
                ))}
                {overflow > 0 && <div className={s.monthMore}>+{overflow} more</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Day / Week view ─────────────────────────────────────────────────────────
  const isMulti = days.length > 1;
  return (
    <>
      {isMulti && (
        <div className={s.colHeaderRow}>
          <div style={{ width: '52px' }} />
          <div className={s.colHeader}>
            {days.map((d, i) => {
              const today = calIsToday(d);
              return (
                <div key={i} className={`${s.colHeaderCell} ${today ? s.colHeaderToday : ''}`}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {WEEKDAYS[(d.getDay() + 6) % 7]}
                  </div>
                  {today
                    ? <span className={s.todayCircle}>{d.getDate()}</span>
                    : <span style={{ fontSize: tokens.fontSizeBase300 }}>{d.getDate()}</span>
                  }
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className={s.body}>
        <div className={s.timeGrid}>
          {renderTimeGutter()}
          <div className={s.dayColumns}>
            {days.map((d, i) => {
              const key  = calDateStr(d);
              const evts = bookingsByDay.get(key) ?? [];
              const colIsPast = interactive && isPastDate(d);
              return (
                <div
                  key={i}
                  ref={el => { colRefs.current[i] = el; }}
                  className={`${s.dayCol} ${interactive && !colIsPast ? s.dayColInteractive : ''}`}
                  style={{
                    ...(i === 0 ? { borderLeft: 'none' } : {}),
                    ...(colIsPast ? { opacity: 0.45, cursor: 'not-allowed' } : {}),
                  }}
                  data-cal-col={calColDateAttr?.[i] ?? calDateStr(d)}
                  onMouseDown={interactive && !clickMode && !colIsPast ? (e) => handleColMouseDown(e, i) : undefined}
                  onClick={interactive && clickMode && !colIsPast ? (e) => handleColClick(e, i) : undefined}
                >
                  {renderHourLines()}
                  {renderNowLine(d)}
                  {renderDraftBlocks(d)}
                  {evts.map(({ booking, isOwn, dayStart, dayEnd }) => {
                    // Use per-day clamped times if available, else fall back to booking times
                    const evtStart = dayStart ?? booking.start_time;
                    const evtEnd   = dayEnd   ?? booking.end_time;
                    // Clamp to visible grid window
                    const toH = (iso: string) => { const d = new Date(iso); return d.getHours() + d.getMinutes() / 60; };
                    const visStart = Math.max(toH(evtStart), CAL_HOUR_START);
                    const visEnd   = Math.min(toH(evtEnd),   CAL_HOUR_END);
                    if (visEnd <= visStart) return null;
                    const topP    = ((visStart - CAL_HOUR_START) / CAL_HOUR_RANGE) * 100;
                    const heightP = Math.max(1.5, ((visEnd - visStart) / CAL_HOUR_RANGE) * 100);
                    // canEdit: clicking the event block opens the full edit modal (non-clickMode only)
                    const canEdit = isOwn && !!onEditBooking && !clickMode;

                    // The booking currently being re-timed in the modal → fully transparent
                    const isEditingThis = clickMode && editingBookingId === booking.id;

                    // Derive per-block pointer-events and class:
                    // • isEditingThis      → transparent, user clicks through to pick new time
                    // • clickMode + own    → intercept click to enter shortening mode
                    // • clickMode + other  → intercept click to BLOCK it (slot is taken)
                    // • normal view        → standard interactive behaviour
                    let blockPointerEvents: 'none' | 'auto' = 'auto';
                    let extraClass = '';
                    let blockOpacity: number | undefined;

                    if (dragRef.current.active) {
                      blockPointerEvents = 'none';
                    } else if (isEditingThis) {
                      blockPointerEvents = 'none';
                      blockOpacity = 0.4;
                      extraClass = s.eventBlockDraft;
                    } else if (clickMode && isOwn) {
                      // Own block is clickable: receives the click directly.
                      // The onClick on the block fires onOwnBookingClick (sets edit mode).
                      blockPointerEvents = 'auto';
                      extraClass = s.eventBlockOwnClickMode;
                    } else if (clickMode && !isOwn) {
                      // Blocks the click — another user's slot is taken
                      extraClass = s.eventBlockBlocked;
                    }

                    // Tooltip content: blocked slot gets an "unavailable" message
                    const popupContent = (clickMode && !isOwn)
                      ? (
                        <div style={{ padding: '6px 10px', minWidth: '160px' }}>
                          <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                            {fmt(booking.start_time)}–{fmt(booking.end_time)}
                          </div>
                          <div style={{ fontSize: '11px', color: tokens.colorPaletteRedForeground1 }}>
                            Booked by {booking.username}
                          </div>
                          <div style={{ fontSize: '11px', color: tokens.colorNeutralForeground3, marginTop: '2px', fontStyle: 'italic' }}>
                            This slot is unavailable
                          </div>
                        </div>
                      )
                      : (
                        <EventPopup booking={booking} isOwn={isOwn}
                          onEdit={isOwn && onEditBooking && !clickMode ? () => onEditBooking(booking) : undefined}
                          onCancel={isOwn && onCancelBooking && !clickMode ? () => onCancelBooking(booking) : undefined}
                          cancelling={cancellingId === booking.id} />
                      );

                    // In clickMode, own-booking blocks must NOT be wrapped in a Tooltip —
                    // Fluent's Tooltip trigger intercepts pointer events before the inner div
                    // receives them, breaking the onClick. We render them bare (the "click to
                    // shorten" label inside the block is the affordance). Other-users' blocked
                    // blocks still need the Tooltip so the "unavailable" message appears.
                    const blockDiv = (
                      <div
                        key={`${booking.id}-${calDateStr(d)}`}
                        className={`${s.eventBlock} ${!isOwn ? s.eventBlockOther : ''} ${extraClass}`}
                        style={{
                          top: `${topP}%`,
                          height: `${heightP}%`,
                          pointerEvents: blockPointerEvents,
                          opacity: blockOpacity,
                          cursor: canEdit ? 'pointer' : undefined,
                        }}
                        onClick={
                          isEditingThis
                            ? undefined
                          : clickMode && isOwn && onOwnBookingClick
                            // Own booking in modal: fire edit callback, stop propagation
                            // so the column click doesn't also fire (which would call onInteract
                            // and immediately set a new start time, overwriting the edit setup).
                            ? (e) => { e.stopPropagation(); onOwnBookingClick(booking); }
                          : clickMode && !isOwn
                            ? (e) => { e.stopPropagation(); }
                          : canEdit
                            ? (e) => { e.stopPropagation(); onEditBooking!(booking); }
                          : undefined
                        }
                      >
                        <div className={`${s.eventTitle} ${!isOwn ? s.eventTitleOther : ''}`}>{booking.desk.name}</div>
                        <div className={`${s.eventMeta} ${!isOwn ? s.eventMetaOther : ''}`}>
                          {fmt(booking.start_time)}–{fmt(booking.end_time)}
                        </div>
                        {!isOwn && !clickMode && (
                          <div className={`${s.eventMeta} ${s.eventMetaOther}`}>{booking.username}</div>
                        )}
                        {clickMode && isOwn && !isEditingThis && (
                          <div className={`${s.eventMeta}`} style={{ fontStyle: 'italic', opacity: 0.8 }}>click to edit</div>
                        )}
                        {clickMode && !isOwn && (
                          <div className={`${s.eventMeta} ${s.eventMetaOther}`}>{booking.username}</div>
                        )}
                      </div>
                    );

                    // Wrap in Tooltip only when it adds value and won't intercept our clicks
                    if (clickMode && isOwn && !isEditingThis) {
                      // Own block in modal: no tooltip — the block itself is the affordance
                      return blockDiv;
                    }
                    return (
                    <Tooltip key={`${booking.id}-${calDateStr(d)}`}
                      content={popupContent}
                      relationship="description" positioning="below-start" withArrow>
                      {blockDiv}
                    </Tooltip>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

// ─── BookingsCalendar (My Bookings view) ──────────────────────────────────────

interface BookingsCalendarProps {
  refreshToken?: number;
  onBookingCancelled?: () => void;
}

export const BookingsCalendar: React.FC<BookingsCalendarProps> = ({
  refreshToken, onBookingCancelled,
}) => {
  const s = useCalStyles();
  const { authenticatedFetch, user } = useAuth();
  const bookingApi = createBookingApi(authenticatedFetch);
  const fmt = useFormatTime();

  const [view, setView]       = useState<ViewMode>('week');
  const [anchor, setAnchor]   = useState<Date>(calStartOfDay(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]  = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const days: Date[] = useMemo(() => {
    if (view === 'day')  return [anchor];
    if (view === 'week') {
      const s = calStartOfWeek(anchor);
      return Array.from({ length: 7 }, (_, i) => calAddDays(s, i));
    }
    const s = calStartOfWeek(calStartOfMonth(anchor));
    return Array.from({ length: 42 }, (_, i) => calAddDays(s, i));
  }, [view, calDateStr(anchor)]);

  const fetchStart = days[0];
  const fetchEnd   = calAddDays(days[days.length - 1], 1);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bookingApi.getMyBookings({ start: fetchStart.toISOString(), end: fetchEnd.toISOString() });
      setBookings(data);
    } catch { } finally { setLoading(false); }
  }, [fetchStart.toISOString(), fetchEnd.toISOString()]);

  useEffect(() => { loadBookings(); }, [loadBookings]);
  useEffect(() => { if (refreshToken !== undefined) loadBookings(); }, [refreshToken]);

  const handleCancel = async (booking: Booking) => {
    if (!confirm(`Cancel booking for ${booking.desk.name}?`)) return;
    setCancellingId(booking.id);
    try {
      await bookingApi.cancelBooking(booking.id);
      setBookings(prev => prev.filter(b => b.id !== booking.id));
      onBookingCancelled?.();
    } catch (err: any) { alert(err.message || 'Failed to cancel'); }
    finally { setCancellingId(null); }
  };

  const navigate = (dir: -1 | 1) => setAnchor(prev => {
    if (view === 'day')  return calAddDays(prev, dir);
    if (view === 'week') return calAddDays(prev, dir * 7);
    return new Date(prev.getFullYear(), prev.getMonth() + dir, 1);
  });

  const goToday = () => {
    const t = calStartOfDay(new Date());
    setAnchor(view === 'week' ? calStartOfWeek(t) : t);
  };

  const title = useMemo(() => {
    if (view === 'day')  return calFormatShortDate(anchor);
    if (view === 'week') {
      const start = calStartOfWeek(anchor);
      const end   = calAddDays(start, 6);
      const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      return `${start.toLocaleDateString([], opts)} – ${end.toLocaleDateString([], { ...opts, year: 'numeric' })}`;
    }
    return anchor.toLocaleDateString([], { month: 'long', year: 'numeric' });
  }, [view, anchor]);

  const bookingsByDay = useMemo(() => expandBookingsByDay(bookings, user?.username), [bookings, user?.username]);

  return (
    <div className={s.root}>
      <div className={s.toolbar}>
        <div className={s.toolbarLeft}>
          <Button size="small" appearance="subtle" onClick={goToday}>Today</Button>
          <Button size="small" appearance="subtle" icon={<ChevronLeft20Regular />} onClick={() => navigate(-1)} />
          <Button size="small" appearance="subtle" icon={<ChevronRight20Regular />} onClick={() => navigate(1)} />
          <Text className={s.titleText}>{title}</Text>
        </div>
        <div className={s.toolbarRight}>
          {(['day', 'week', 'month'] as ViewMode[]).map(v => (
            <Button key={v} size="small"
              appearance={view === v ? 'primary' : 'subtle'}
              icon={v === 'day' ? <CalendarDay20Regular /> : v === 'week' ? <CalendarWeekNumbers20Regular /> : <CalendarMonth20Regular />}
              onClick={() => setView(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={s.loadingWrap}><Spinner size="medium" /></div>
      ) : bookings.length === 0 && view !== 'month' ? (
        <div className={s.empty}>
          <CalendarLtr20Regular style={{ fontSize: '36px' }} />
          <Text size={300} weight="semibold">No bookings in this period</Text>
          <Text size={200}>Select a room on the map to book a desk</Text>
        </div>
      ) : (
        <CalendarGrid
          view={view}
          anchor={anchor}
          days={view === 'month' ? [] : days}
          bookingsByDay={bookingsByDay}
          onCancelBooking={handleCancel}
          cancellingId={cancellingId}
        />
      )}
    </div>
  );
};

export default BookingsCalendar;