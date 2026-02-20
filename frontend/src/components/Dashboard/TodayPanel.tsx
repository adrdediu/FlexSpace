import React, { useState, useEffect, useCallback } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Spinner,
  Badge,
} from '@fluentui/react-components';
import {
  CalendarLtr20Regular,
  Delete20Regular,
  Edit20Regular,
  Clock20Regular,
  BuildingRegular,
  DoorRegular,
  Warning20Regular,
} from '@fluentui/react-icons';
import { createBookingApi, type Booking } from '../../services/bookingApi';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    gap: tokens.spacingVerticalM,
    overflow: 'hidden',
  },

  sectionHeader: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    flexShrink: 0,
  },

  // Stat row
  statsRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    flexShrink: 0,
  },
  statCard: {
    flex: 1,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    textAlign: 'center',
  },
  statValue: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorBrandForeground1,
    lineHeight: '1.2',
  },
  statLabel: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    marginTop: '2px',
  },

  // Booking cards
  bookingList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  bookingCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    position: 'relative',
  },
  bookingCardToday: {
    borderTopColor: tokens.colorNeutralStroke2,
    borderRightColor: tokens.colorNeutralStroke2,
    borderBottomColor: tokens.colorNeutralStroke2,
    borderLeftColor: tokens.colorBrandStroke1,
    borderLeftWidth: '3px',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  bookingCardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
  },
  bookingDeskName: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  bookingMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  bookingMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  todayBadgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    marginBottom: tokens.spacingVerticalXS,
  },

  bookingActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    marginTop: tokens.spacingVerticalXS,
  },

  // Empty
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForeground3,
    gap: tokens.spacingVerticalS,
    textAlign: 'center',
    padding: tokens.spacingVerticalL,
  },

  // Loading
  loadingState: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isToday(isoStr: string) {
  return isoStr.slice(0, 10) === todayStr();
}

function isFuture(isoStr: string) {
  return new Date(isoStr) > new Date();
}

function formatTime(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return ''; }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TodayPanelProps {
  /** Increment to force a reload */
  refreshToken?: number;
  /** Called when user cancels a booking */
  onBookingCancelled?: () => void;
  /** Called when user clicks a booking card — navigate to its room + highlight desk */
  onBookingClick?: (booking: Booking) => void;
  /** Called when user wants to edit a booking */
  onBookingEdit?: (booking: Booking) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const TodayPanel: React.FC<TodayPanelProps> = ({
  refreshToken,
  onBookingCancelled,
  onBookingClick,
  onBookingEdit,
}) => {
  const styles = useStyles();
  const { authenticatedFetch } = useAuth();
  const bookingApi = createBookingApi(authenticatedFetch);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      // Load upcoming bookings (next 30 days)
      const now = new Date();
      const future = new Date(now);
      future.setDate(now.getDate() + 30);
      const data = await bookingApi.getMyBookings({
        start: now.toISOString(),
        end:   future.toISOString(),
      });
      // Sort ascending by start_time
      data.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      setBookings(data);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBookings(); }, []);
  useEffect(() => { if (refreshToken !== undefined) loadBookings(); }, [refreshToken]);

  const handleCancel = async (booking: Booking) => {
    if (!confirm(`Cancel your booking of ${booking.desk.name} on ${formatDate(booking.start_time)}?`)) return;
    setCancellingId(booking.id);
    try {
      await bookingApi.cancelBooking(booking.id);
      setBookings(prev => prev.filter(b => b.id !== booking.id));
      onBookingCancelled?.();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  // ── Derived ──
  const todayBookings    = bookings.filter(b => isToday(b.start_time));
  const upcomingBookings = bookings.filter(b => !isToday(b.start_time));

  return (
    <div className={styles.root}>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{todayBookings.length}</div>
          <div className={styles.statLabel}>Today</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{bookings.length}</div>
          <div className={styles.statLabel}>Upcoming</div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <Spinner size="medium" />
        </div>
      ) : bookings.length === 0 ? (
        <div className={styles.empty}>
          <CalendarLtr20Regular style={{ fontSize: '36px' }} />
          <Text size={300} weight="semibold">No upcoming bookings</Text>
          <Text size={200}>Select a room on the map to book a desk</Text>
        </div>
      ) : (
        <div className={styles.bookingList}>

          {/* Today's bookings */}
          {todayBookings.length > 0 && (
            <>
              <div className={styles.sectionHeader}>Today</div>
              {todayBookings.map(booking => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  isToday
                  cancelling={cancellingId === booking.id}
                  onCancel={() => handleCancel(booking)}
                  onNavigate={onBookingClick ? () => onBookingClick(booking) : undefined}
                  onEdit={onBookingEdit ? () => onBookingEdit(booking) : undefined}
                />
              ))}
            </>
          )}

          {/* Upcoming */}
          {upcomingBookings.length > 0 && (
            <>
              <div className={styles.sectionHeader} style={{ marginTop: todayBookings.length > 0 ? tokens.spacingVerticalS : 0 }}>
                Upcoming
              </div>
              {upcomingBookings.map(booking => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  isToday={false}
                  cancelling={cancellingId === booking.id}
                  onCancel={() => handleCancel(booking)}
                  onNavigate={onBookingClick ? () => onBookingClick(booking) : undefined}
                  onEdit={onBookingEdit ? () => onBookingEdit(booking) : undefined}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Booking card subcomponent ────────────────────────────────────────────────

const BookingCard: React.FC<{
  booking: Booking;
  isToday: boolean;
  cancelling: boolean;
  onCancel: () => void;
  onNavigate?: () => void;
  onEdit?: () => void;
}> = ({ booking, isToday, cancelling, onCancel, onNavigate, onEdit }) => {
  const styles = useStyles();

  return (
    <div
      className={`${styles.bookingCard} ${isToday ? styles.bookingCardToday : ''}`}
      style={onNavigate ? { cursor: 'pointer' } : undefined}
      onClick={onNavigate}
    >
      <div className={styles.bookingCardHeader}>
        <div>
          {isToday && (
            <div className={styles.todayBadgeRow}>
              <Badge appearance="filled" color="brand" size="small">Today</Badge>
            </div>
          )}
          <div className={styles.bookingDeskName}>{booking.desk.name}</div>
        </div>
      </div>

      <div className={styles.bookingMeta}>
        <div className={styles.bookingMetaRow}>
          <Clock20Regular style={{ fontSize: '12px' }} />
          <span>
            {isToday
              ? `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}`
              : `${formatDate(booking.start_time)}, ${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}`
            }
          </span>
        </div>
        <div className={styles.bookingMetaRow}>
          <DoorRegular style={{ fontSize: '12px' }} />
          <span>{booking.room_name}</span>
        </div>
        <div className={styles.bookingMetaRow}>
          <BuildingRegular style={{ fontSize: '12px' }} />
          <span>{booking.location_name}</span>
        </div>
      </div>

      {/* Action buttons — stop propagation so card click doesn't fire too */}
      <div className={styles.bookingActions} onClick={e => e.stopPropagation()}>
        {onEdit && (
          <Button
            appearance="subtle"
            size="small"
            icon={<Edit20Regular />}
            onClick={onEdit}
            title="Edit booking"
          >
            Edit
          </Button>
        )}
        <Button
          appearance="subtle"
          size="small"
          icon={cancelling ? <Spinner size="tiny" /> : <Delete20Regular />}
          onClick={onCancel}
          disabled={cancelling}
          title="Cancel booking"
          style={{ color: tokens.colorPaletteRedForeground1 }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default TodayPanel;