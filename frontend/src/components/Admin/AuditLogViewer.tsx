import React, { useState, useEffect, useCallback } from 'react';
import {
  makeStyles, tokens, Text, Spinner, Badge, Select, Input, Button,
} from '@fluentui/react-components';
import {
  CalendarLtr20Regular, Person20Regular, LockClosed20Regular, LockOpen20Regular,
  Checkmark20Regular, Dismiss20Regular, Edit20Regular, PersonAvailable20Regular,
  PersonProhibited20Regular, Wrench20Regular, ArrowEnter20Regular, ArrowExit20Regular,
  Filter20Regular, ArrowClockwise20Regular, Search20Regular,
} from '@fluentui/react-icons';
import { createAuditApi, type AuditLog, type AuditAction, type AuditLogFilters } from '../../services/auditApi';
import { createLocationApi } from '../../services/locationApi';
import { createFloorApi } from '../../services/floorApi';
import { createRoomApi, type RoomListItem } from '../../services/roomApi';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { formatAuditTimestamp, formatAuditShortTime } from '../Activity/auditTimeUtils';

const useStyles = makeStyles({
  container: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  filters: {
    display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalM, backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium, border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  filterRow: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalM, alignItems: 'flex-end' },
  filterRowLabel: {
    width: '100%', fontSize: tokens.fontSizeBase100, fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground4, textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  filterItem: {
    display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS,
    minWidth: '160px', flex: '1 1 160px', maxWidth: '220px',
  },
  filterLabel: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3, fontWeight: tokens.fontWeightSemibold },
  filterActions: { display: 'flex', gap: tokens.spacingHorizontalS, marginLeft: 'auto', alignSelf: 'flex-end' },
  divider: { borderTop: `1px solid ${tokens.colorNeutralStroke2}`, margin: `${tokens.spacingVerticalXS} 0` },
  table: { display: 'flex', flexDirection: 'column', borderRadius: tokens.borderRadiusMedium, border: `1px solid ${tokens.colorNeutralStroke2}`, overflow: 'hidden' },
  tableHeader: {
    display: 'grid', gridTemplateColumns: '170px 140px 1fr 170px',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground2, borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  tableHeaderCell: { fontSize: tokens.fontSizeBase200, fontWeight: tokens.fontWeightSemibold, color: tokens.colorNeutralForeground3, textTransform: 'uppercase', letterSpacing: '0.05em' },
  row: {
    display: 'grid', gridTemplateColumns: '170px 140px 1fr 170px',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalM}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`, alignItems: 'center',
    backgroundColor: tokens.colorNeutralBackground1,
    ':last-child': { borderBottom: 'none' }, ':hover': { backgroundColor: tokens.colorNeutralBackground2 },
  },
  actionCell: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS },
  snapshotCell: { display: 'flex', flexDirection: 'column', gap: '2px' },
  snapshotLine: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground2 },
  locationLine: { fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground4 },
  timestampCell: { display: 'flex', flexDirection: 'column', gap: '2px' },
  timestampUtc: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground2, whiteSpace: 'nowrap' },
  timestampLocal: { fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground4, whiteSpace: 'nowrap' },
  emptyState: { textAlign: 'center', padding: tokens.spacingVerticalXXL, color: tokens.colorNeutralForeground3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: tokens.spacingVerticalM },
  loadingState: { display: 'flex', justifyContent: 'center', padding: tokens.spacingVerticalXXL },
  count: { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 },
});

const ACTION_CONFIG: Record<AuditAction, { label: string; icon: React.ReactElement; color: 'success' | 'danger' | 'warning' | 'informative' | 'important' | 'subtle' }> = {
  booking_created:   { label: 'Booking Created',   icon: <Checkmark20Regular />,        color: 'success' },
  booking_cancelled: { label: 'Booking Cancelled', icon: <Dismiss20Regular />,          color: 'danger' },
  booking_updated:   { label: 'Booking Updated',   icon: <Edit20Regular />,             color: 'informative' },
  desk_locked:       { label: 'Desk Locked',       icon: <LockClosed20Regular />,       color: 'warning' },
  desk_unlocked:     { label: 'Desk Unlocked',     icon: <LockOpen20Regular />,         color: 'subtle' },
  desk_assigned:     { label: 'Desk Assigned',     icon: <PersonAvailable20Regular />,  color: 'important' },
  desk_unassigned:   { label: 'Desk Unassigned',   icon: <PersonProhibited20Regular />, color: 'subtle' },
  room_maintenance:  { label: 'Maintenance',       icon: <Wrench20Regular />,           color: 'warning' },
  user_login:        { label: 'Login',             icon: <ArrowEnter20Regular />,       color: 'subtle' },
  user_logout:       { label: 'Logout',            icon: <ArrowExit20Regular />,        color: 'subtle' },
};

const SnapshotSummary: React.FC<{ log: AuditLog; timeFormat: '12' | '24' }> = ({ log, timeFormat }) => {
  const styles = useStyles();
  const s = log.target_snapshot;
  const locationLine = s.location ? <Text className={styles.locationLine}>{s.location as string}</Text> : null;

  switch (log.action) {
    case 'booking_created': case 'booking_updated': case 'booking_cancelled':
      return (
        <div className={styles.snapshotCell}>
          <Text className={styles.snapshotLine}>{s.desk as string} · {s.room as string}</Text>
          <Text className={styles.snapshotLine}>{s.start_time ? formatAuditShortTime(s.start_time as string, timeFormat) : ''} → {s.end_time ? formatAuditShortTime(s.end_time as string, timeFormat) : ''}</Text>
          {s.booked_by && s.booked_by !== log.username_snapshot && <Text className={styles.snapshotLine}>Owner: {s.booked_by as string}</Text>}
          {locationLine}
        </div>
      );
    case 'desk_locked': case 'desk_unlocked':
      return <div className={styles.snapshotCell}><Text className={styles.snapshotLine}>{s.desk as string} · {s.room as string}</Text>{locationLine}</div>;
    case 'desk_assigned':
      return <div className={styles.snapshotCell}><Text className={styles.snapshotLine}>{s.desk as string} · {s.room as string}</Text><Text className={styles.snapshotLine}>→ {s.assigned_to as string}</Text>{locationLine}</div>;
    case 'desk_unassigned':
      return <div className={styles.snapshotCell}><Text className={styles.snapshotLine}>{s.desk as string} · {s.room as string}</Text><Text className={styles.snapshotLine}>Was: {s.was_assigned_to as string}</Text>{locationLine}</div>;
    case 'room_maintenance':
      return <div className={styles.snapshotCell}><Text className={styles.snapshotLine}>{s.room as string}</Text><Text className={styles.snapshotLine}>{s.maintenance ? 'Enabled' : 'Cleared'} by {s.by as string}</Text>{locationLine}</div>;
    case 'user_login': case 'user_logout':
      return <Text className={styles.snapshotLine}>{log.ip_address || '—'}</Text>;
    default:
      return <Text className={styles.snapshotLine}>—</Text>;
  }
};

function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false }) + ' UTC'; }
  catch { return iso; }
}

function formatTimestamp(iso: string): string {
  try { return new Date(iso).toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC', hour12: false }) + ' UTC'; }
  catch { return iso; }
}

export const AuditLogViewer: React.FC = () => {
  const styles = useStyles();
  const { authenticatedFetch, user } = useAuth();
  const auditApi    = createAuditApi(authenticatedFetch);
  const { preferences, formatTime, getTimezoneAbbreviation } = usePreferences();
  const locationApi = createLocationApi(authenticatedFetch);
  const floorApi    = createFloorApi(authenticatedFetch);
  const roomApi     = createRoomApi(authenticatedFetch);
  const isStaff = user?.is_staff || user?.is_superuser;

  const [logs,         setLogs]         = useState<AuditLog[]>([]);
  const [locations,    setLocations]    = useState<{ id: number; name: string }[]>([]);
  const [rooms,        setRooms]        = useState<RoomListItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [filters,      setFilters]      = useState<AuditLogFilters>({});
  const [usernameInput, setUsernameInput] = useState('');

  // Load locations once for staff
  useEffect(() => {
    if (!isStaff) return;
    locationApi.getLocations()
      .then(data => setLocations(data.map(l => ({ id: l.id, name: l.name }))))
      .catch(console.error);
  }, [isStaff]);

  // When location changes, load rooms via floors (cascading)
  useEffect(() => {
    if (!filters.location_id) { setRooms([]); return; }
    setLoadingRooms(true);
    floorApi.getFloorsByLocation(Number(filters.location_id))
      .then(async floors => {
        const allRooms: RoomListItem[] = [];
        await Promise.all(floors.map(async floor => {
          const floorRooms = await roomApi.getRooms(floor.id);
          allRooms.push(...floorRooms);
        }));
        allRooms.sort((a, b) => a.floor_name.localeCompare(b.floor_name) || a.name.localeCompare(b.name));
        setRooms(allRooms);
      })
      .catch(console.error)
      .finally(() => setLoadingRooms(false));
  }, [filters.location_id]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try { setLogs(await auditApi.getLogs(filters)); }
    catch (err) { console.error('Failed to load audit logs:', err); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleLocationChange = (locationId: string) => {
    setFilters(prev => ({ ...prev, location_id: locationId ? Number(locationId) : undefined, room_id: undefined }));
  };

  const handleClearFilters = () => { setFilters({}); setUsernameInput(''); setRooms([]); };

  const hasFilters = Object.values(filters).some(v => v !== undefined) || usernameInput;

  return (
    <div className={styles.container}>
      <div className={styles.filters}>

        {/* Row 1 — Location + Room (staff only, cascading) */}
        {isStaff && (
          <div className={styles.filterRow}>
            <span className={styles.filterRowLabel}>Location & Room</span>

            <div className={styles.filterItem}>
              <span className={styles.filterLabel}>Location</span>
              <Select value={filters.location_id?.toString() || ''} onChange={(_, d) => handleLocationChange(d.value)}>
                <option value="">All locations</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </div>

            <div className={styles.filterItem}>
              <span className={styles.filterLabel}>
                Room {loadingRooms && <Spinner size="tiny" style={{ marginLeft: 4 }} />}
              </span>
              <Select
                value={filters.room_id?.toString() || ''}
                disabled={!filters.location_id || loadingRooms}
                onChange={(_, d) => setFilters(prev => ({ ...prev, room_id: d.value ? Number(d.value) : undefined }))}
              >
                <option value="">All rooms</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.floor_name} · {r.name}</option>)}
              </Select>
            </div>
          </div>
        )}

        {isStaff && <div className={styles.divider} />}

        {/* Row 2 — Action + Date + Username */}
        <div className={styles.filterRow}>
          <span className={styles.filterRowLabel}>Action, Date & User</span>

          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>Action</span>
            <Select value={filters.action || ''} onChange={(_, d) => setFilters(prev => ({ ...prev, action: (d.value as AuditAction) || undefined }))}>
              <option value="">All actions</option>
              {(Object.keys(ACTION_CONFIG) as AuditAction[]).map(a => (
                <option key={a} value={a}>{ACTION_CONFIG[a].label}</option>
              ))}
            </Select>
          </div>

          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>From</span>
            <Input type="date" value={filters.start?.split('T')[0] || ''}
              onChange={(_, d) => setFilters(prev => ({ ...prev, start: d.value ? `${d.value}T00:00:00` : undefined }))} />
          </div>

          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>To</span>
            <Input type="date" value={filters.end?.split('T')[0] || ''}
              onChange={(_, d) => setFilters(prev => ({ ...prev, end: d.value ? `${d.value}T23:59:59` : undefined }))} />
          </div>

          {isStaff && (
            <div className={styles.filterItem}>
              <span className={styles.filterLabel}>Username</span>
              <Input placeholder="Search user…" value={usernameInput}
                onChange={(_, d) => setUsernameInput(d.value)}
                onKeyDown={e => e.key === 'Enter' && setFilters(prev => ({ ...prev, username: usernameInput || undefined }))}
                contentAfter={
                  <Button appearance="transparent" size="small" icon={<Search20Regular />}
                    onClick={() => setFilters(prev => ({ ...prev, username: usernameInput || undefined }))} />
                }
              />
            </div>
          )}

          <div className={styles.filterActions}>
            {hasFilters && (
              <Button appearance="subtle" icon={<Dismiss20Regular />} onClick={handleClearFilters}>Clear</Button>
            )}
            <Button appearance="primary" icon={<ArrowClockwise20Regular />} onClick={loadLogs}>Refresh</Button>
          </div>
        </div>
      </div>

      {/* Count */}
      {!loading && (
        <Text className={styles.count}>
          {logs.length} {logs.length === 1 ? 'entry' : 'entries'}{hasFilters ? ' (filtered)' : ''}
        </Text>
      )}

      {/* Table */}
      {loading ? (
        <div className={styles.loadingState}><Spinner size="medium" label="Loading audit log…" /></div>
      ) : logs.length === 0 ? (
        <div className={styles.emptyState}>
          <Filter20Regular style={{ fontSize: '40px' }} />
          <Text size={300} weight="semibold">No entries found</Text>
          <Text size={200}>Try adjusting the filters.</Text>
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span className={styles.tableHeaderCell}>Action</span>
            <span className={styles.tableHeaderCell}>User</span>
            <span className={styles.tableHeaderCell}>Details</span>
            <span className={styles.tableHeaderCell}>When</span>
          </div>
          {logs.map(log => {
            const config = ACTION_CONFIG[log.action] ?? { label: log.action_display, icon: <CalendarLtr20Regular />, color: 'subtle' as const };
            return (
              <div key={log.id} className={styles.row}>
                <div className={styles.actionCell}>
                  <Badge appearance="tint" color={config.color} icon={config.icon}>{config.label}</Badge>
                </div>
                <div className={styles.actionCell}>
                  <Person20Regular style={{ fontSize: '16px', flexShrink: 0 }} />
                  <Text size={300}>{log.username_snapshot}</Text>
                </div>
                <SnapshotSummary log={log} timeFormat={preferences?.time_format ?? '24'} />
                {(() => {
                  const ts = formatAuditTimestamp(log.timestamp, formatTime, getTimezoneAbbreviation, preferences?.time_format ?? '24');
                  return (
                    <div className={styles.timestampCell}>
                      <Text className={styles.timestampUtc}>{ts.utc} UTC</Text>
                      {ts.local && ts.localTz !== 'UTC' && (
                        <Text className={styles.timestampLocal}>{ts.local} {ts.localTz}</Text>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AuditLogViewer;