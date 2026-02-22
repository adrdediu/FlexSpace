import React, { useEffect, useState, useMemo } from 'react';
import { makeStyles, tokens, Text, Spinner } from '@fluentui/react-components';
import {
  ClockRegular,
  BuildingRegular,
  CalendarCheckmarkRegular,
  ArrowTrendingRegular,
  FlashRegular,
  DoorRegular,
} from '@fluentui/react-icons';
import { createBookingApi, type Booking } from '../../services/bookingApi';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';

// ─── Styles ───────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    flexShrink: 0,
  },

  // ── Next booking banner ──
  nextBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorBrandBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorBrandStroke1}`,
    flexShrink: 0,
  },
  nextBannerIcon: {
    color: tokens.colorBrandForeground1,
    flexShrink: 0,
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
  },
  nextBannerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    flex: 1,
    minWidth: 0,
  },
  nextBannerLabel: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorBrandForeground2,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: tokens.fontWeightSemibold,
  },
  nextBannerValue: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  nextBannerMeta: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  nextBannerCountdown: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorBrandForeground1,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },

  // ── Ongoing banner ──
  ongoingBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorPaletteGreenBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorPaletteGreenBorderActive}`,
    flexShrink: 0,
  },
  ongoingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: tokens.colorPaletteGreenForeground1,
    flexShrink: 0,
    boxShadow: `0 0 0 3px ${tokens.colorPaletteGreenBackground2}`,
    animation: 'pulse 2s infinite',
  },
  ongoingLabel: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorPaletteGreenForeground2,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: tokens.fontWeightSemibold,
  },
  ongoingValue: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  ongoingMeta: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  ongoingEnds: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorPaletteGreenForeground1,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    marginLeft: 'auto',
  },

  // ── Stats grid ──
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: tokens.spacingHorizontalS,
    '@media (min-width: 900px)': {
      gridTemplateColumns: 'repeat(6, 1fr)',
    },
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    minWidth: 0,
  },
  statCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    color: tokens.colorNeutralForeground3,
  },
  statCardIcon: {
    fontSize: '12px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
  statCardLabel: {
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: tokens.fontWeightSemibold,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  statCardValue: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorNeutralForeground1,
    lineHeight: '1.15',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  statCardSub: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacingVerticalM,
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfWeek(d: Date): Date {
  const dow = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((dow + 6) % 7));
  return startOfDay(mon);
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function durationHours(b: Booking): number {
  return (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 3_600_000;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Now';
  const totalMins = Math.floor(ms / 60_000);
  const days  = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins  = totalMins % 60;
  if (days > 0)  return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatTimeRemaining(ms: number): string {
  const totalMins = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMins / 60);
  const mins  = totalMins % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m left`;
  if (hours > 0) return `${hours}h left`;
  return `${mins}m left`;
}

function formatHours(h: number): string {
  if (h === 0) return '0h';
  const wh = Math.floor(h);
  const wm = Math.round((h - wh) * 60);
  if (wm === 0) return `${wh}h`;
  return `${wh}h ${wm}m`;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Component ────────────────────────────────────────────────────────────────

interface BookingStatsPanelProps {
  refreshToken?: number;
}

export const BookingStatsPanel: React.FC<BookingStatsPanelProps> = ({ refreshToken }) => {
  const styles = useStyles();
  const { authenticatedFetch } = useAuth();
  const bookingApi = createBookingApi(authenticatedFetch);
  const { formatTime: prefFormatTime } = usePreferences();
  const fmt = (iso: string) => { try { return prefFormatTime(new Date(iso)); } catch { return ''; } };

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Tick every minute so countdown stays live
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Fetch past 30 days + next 60 days for rich stats
  useEffect(() => {
    setLoading(true);
    const past   = new Date(now); past.setDate(past.getDate() - 30);
    const future = new Date(now); future.setDate(future.getDate() + 60);
    bookingApi.getMyBookings({ start: past.toISOString(), end: future.toISOString() })
      .then(data => setBookings(data))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [refreshToken]);

  // ── Derived stats ──
  const stats = useMemo(() => {
    const weekStart  = startOfWeek(now);
    const weekEnd    = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
    const monthStart = startOfMonth(now);
    const monthEnd   = endOfMonth(now);

    // Ongoing right now
    const ongoing = bookings.find(b =>
      new Date(b.start_time) <= now && new Date(b.end_time) > now
    ) ?? null;

    // Next upcoming booking
    const next = bookings
      .filter(b => new Date(b.start_time) > now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0] ?? null;

    // This week — only count past portion of ongoing + future bookings fully in week
    const weekBookings = bookings.filter(b => {
      const s = new Date(b.start_time);
      const e = new Date(b.end_time);
      return s < weekEnd && e > weekStart;
    });
    const hoursThisWeek = weekBookings.reduce((sum, b) => {
      const s = Math.max(new Date(b.start_time).getTime(), weekStart.getTime());
      const e = Math.min(new Date(b.end_time).getTime(), weekEnd.getTime());
      return sum + Math.max(0, (e - s) / 3_600_000);
    }, 0);

    // This month
    const monthBookings = bookings.filter(b => {
      const s = new Date(b.start_time);
      const e = new Date(b.end_time);
      return s < monthEnd && e > monthStart;
    });
    const hoursThisMonth = monthBookings.reduce((sum, b) => {
      const s = Math.max(new Date(b.start_time).getTime(), monthStart.getTime());
      const e = Math.min(new Date(b.end_time).getTime(), monthEnd.getTime());
      return sum + Math.max(0, (e - s) / 3_600_000);
    }, 0);

    // Total upcoming (future only)
    const upcomingCount = bookings.filter(b => new Date(b.end_time) > now).length;

    // Most used location (by booking count, past 30 days)
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentBookings = bookings.filter(b => new Date(b.start_time) >= thirtyDaysAgo && new Date(b.end_time) <= now);
    const locationCounts: Record<string, number> = {};
    recentBookings.forEach(b => {
      locationCounts[b.location_name] = (locationCounts[b.location_name] ?? 0) + 1;
    });
    const favouriteLocation = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Most used desk (by hours, past 30 days)
    const deskHours: Record<string, { name: string; room: string; hours: number }> = {};
    recentBookings.forEach(b => {
      const key = String(b.desk.id);
      if (!deskHours[key]) deskHours[key] = { name: b.desk.name, room: b.room_name, hours: 0 };
      deskHours[key].hours += durationHours(b);
    });
    const favouriteDesk = Object.values(deskHours)
      .sort((a, b) => b.hours - a.hours)[0] ?? null;

    // Busiest day of week (past 30 days, by number of bookings)
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    recentBookings.forEach(b => {
      dayCounts[new Date(b.start_time).getDay()]++;
    });
    const busiestDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
    const busiestDay = Math.max(...dayCounts) > 0 ? WEEKDAY_NAMES[busiestDayIdx] : null;

    return {
      ongoing,
      next,
      hoursThisWeek,
      hoursThisMonth,
      upcomingCount,
      favouriteLocation,
      favouriteDesk,
      busiestDay,
      weekBookingsCount: weekBookings.filter(b => new Date(b.start_time) >= now || (new Date(b.start_time) < now && new Date(b.end_time) > now)).length,
    };
  }, [bookings, now]);

  if (loading) {
    return (
      <div className={styles.loadingRow}>
        <Spinner size="tiny" />
      </div>
    );
  }

  const nextMs = stats.next ? new Date(stats.next.start_time).getTime() - now.getTime() : null;
  const ongoingMs = stats.ongoing ? new Date(stats.ongoing.end_time).getTime() - now.getTime() : null;

  return (
    <div className={styles.root}>

      {/* ── Ongoing booking ── */}
      {stats.ongoing && (
        <div className={styles.ongoingBanner}>
          <div className={styles.ongoingDot} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1, minWidth: 0 }}>
            <span className={styles.ongoingLabel}>Active now</span>
            <span className={styles.ongoingValue}>{stats.ongoing.desk.name}</span>
            <span className={styles.ongoingMeta}>
              {stats.ongoing.room_name} · {stats.ongoing.location_name}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px', flexShrink: 0 }}>
            <span className={styles.ongoingEnds}>
              {ongoingMs != null ? formatTimeRemaining(ongoingMs) : ''}
            </span>
            <span style={{ fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3 }}>
              until {fmt(stats.ongoing.end_time)}
            </span>
          </div>
        </div>
      )}

      {/* ── Next booking ── */}
      {!stats.ongoing && stats.next && (
        <div className={styles.nextBanner}>
          <div className={styles.nextBannerIcon}>
            <FlashRegular />
          </div>
          <div className={styles.nextBannerContent}>
            <span className={styles.nextBannerLabel}>Next booking</span>
            <span className={styles.nextBannerValue}>{stats.next.desk.name}</span>
            <span className={styles.nextBannerMeta}>
              {stats.next.room_name} · {stats.next.location_name} · {fmt(stats.next.start_time)}–{fmt(stats.next.end_time)}
            </span>
          </div>
          <span className={styles.nextBannerCountdown}>
            {nextMs != null ? formatCountdown(nextMs) : ''}
          </span>
        </div>
      )}

      {/* ── Stats grid ── */}
      <div className={styles.statsGrid}>

        <StatCard
          icon={<ClockRegular />}
          label="This week"
          value={formatHours(stats.hoursThisWeek)}
          sub={`${stats.weekBookingsCount} booking${stats.weekBookingsCount !== 1 ? 's' : ''}`}
        />

        <StatCard
          icon={<CalendarCheckmarkRegular />}
          label="This month"
          value={formatHours(stats.hoursThisMonth)}
          sub="hours booked"
        />

        <StatCard
          icon={<FlashRegular />}
          label="Upcoming"
          value={String(stats.upcomingCount)}
          sub={`booking${stats.upcomingCount !== 1 ? 's' : ''}`}
        />

        <StatCard
          icon={<BuildingRegular />}
          label="Top location"
          value={stats.favouriteLocation ?? '—'}
          sub="last 30 days"
          compact
        />

        <StatCard
          icon={<DoorRegular />}
          label="Fav desk"
          value={stats.favouriteDesk?.name ?? '—'}
          sub={stats.favouriteDesk ? stats.favouriteDesk.room : 'no history'}
          compact
        />

        <StatCard
          icon={<ArrowTrendingRegular />}
          label="Busiest day"
          value={stats.busiestDay ?? '—'}
          sub="last 30 days"
        />

      </div>
    </div>
  );
};

// ─── StatCard subcomponent ────────────────────────────────────────────────────

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  compact?: boolean;
}> = ({ icon, label, value, sub, compact }) => {
  const styles = useStyles();
  return (
    <div className={styles.statCard}>
      <div className={styles.statCardHeader}>
        <span className={styles.statCardIcon}>{icon}</span>
        <span className={styles.statCardLabel}>{label}</span>
      </div>
      <Text
        className={styles.statCardValue}
        style={compact ? { fontSize: tokens.fontSizeBase300 } : undefined}
        title={value}
      >
        {value}
      </Text>
      <span className={styles.statCardSub}>{sub}</span>
    </div>
  );
};

export default BookingStatsPanel;