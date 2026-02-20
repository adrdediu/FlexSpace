import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Spinner,
  Badge,
  Input,
} from '@fluentui/react-components';
import {
  BuildingRegular,
  DoorRegular,
  ChevronRight20Regular,
  ChevronLeft20Regular,
  Search20Regular,
  Warning20Regular,
  LockClosed16Regular,
  ArrowClockwise20Regular,
} from '@fluentui/react-icons';
import { createCountriesApi } from '../../services/countriesApi';
import { createFloorApi, type Floor } from '../../services/floorApi';
import { useAuth } from '../../contexts/AuthContext';
import { type RoomWithDesks } from '../../services/roomApi';
import websocketService from '../../services/webSocketService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    gap: tokens.spacingVerticalS,
    overflow: 'hidden',
  },

  // Breadcrumb
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  breadcrumbItem: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorBrandForeground1,
    cursor: 'pointer',
    ':hover': { textDecoration: 'underline' },
  },
  breadcrumbCurrent: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    fontWeight: tokens.fontWeightSemibold,
  },
  breadcrumbSep: {
    color: tokens.colorNeutralForeground4,
    fontSize: tokens.fontSizeBase100,
  },

  // Search
  searchRow: {
    flexShrink: 0,
  },

  // Floor tabs
  floorTabs: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  floorTab: {
    fontSize: tokens.fontSizeBase200,
    minWidth: 'auto',
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
  },

  // Scrollable list
  list: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },

  // Cards
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
    transition: 'all 0.12s ease',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      borderTopColor: tokens.colorNeutralStroke1,
      borderRightColor: tokens.colorNeutralStroke1,
      borderBottomColor: tokens.colorNeutralStroke1,
      borderLeftColor: tokens.colorNeutralStroke1,
      boxShadow: tokens.shadow4,
    },
  },
  cardActive: {
    backgroundColor: tokens.colorBrandBackground2,
    borderTopColor: tokens.colorBrandStroke1,
    borderRightColor: tokens.colorBrandStroke1,
    borderBottomColor: tokens.colorBrandStroke1,
    borderLeftColor: tokens.colorBrandStroke1,
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
  },
  cardIcon: {
    width: '32px',
    height: '32px',
    borderRadius: tokens.borderRadiusMedium,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: '16px',
  },
  cardIconLocation: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  cardIconLocationActive: {
    backgroundColor: tokens.colorNeutralForegroundOnBrand,
    color: tokens.colorBrandBackground,
  },
  cardIconRoom: {
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
  },
  cardIconRoomActive: {
    backgroundColor: tokens.colorNeutralForegroundOnBrand,
    color: tokens.colorBrandBackground,
  },
  cardIconRoomAvailable: {
    backgroundColor: tokens.colorPaletteGreenBackground3,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  cardIconRoomAvailableActive: {
    backgroundColor: tokens.colorNeutralForegroundOnBrand,
    color: tokens.colorPaletteGreenForeground3,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardMeta: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    marginTop: '1px',
  },
  cardRight: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    flexShrink: 0,
  },

  // Empty / loading
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForeground3,
    gap: tokens.spacingVerticalS,
    textAlign: 'center',
    padding: tokens.spacingVerticalXL,
  },
  loadingState: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Public API helpers ────────────────────────────────────────────────────────

interface PublicLocation {
  id: number;
  name: string;
  country_name?: string;
  lat?: number;
  lng?: number;
  floor_count: number;
  room_count: number;
}

interface PublicRoom {
  id: number;
  name: string;
  description: string;
  floor: number;
  floor_name: string;
  location_name: string;
  map_image?: string;
  desk_count: number;
  available_desk_count: number;
  can_book: boolean;
  is_under_maintenance: boolean;
  maintenance_by_name: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

type View = 'locations' | 'rooms';

interface LocationBrowserProps {
  /** Currently selected room (to highlight it in the list) */
  selectedRoomId?: number;
  /** Called when user picks a room — parent should load full room detail */
  onRoomSelect: (roomId: number) => void;
  /** Refresh token — increment to force a reload of the current view */
  refreshToken?: number;
}

export const LocationBrowser: React.FC<LocationBrowserProps> = ({
  selectedRoomId,
  onRoomSelect,
  refreshToken,
}) => {
  const styles = useStyles();
  const { authenticatedFetch } = useAuth();

  const [view, setView] = useState<View>('locations');
  const [locations, setLocations] = useState<PublicLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<PublicLocation | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const floorApi = createFloorApi(authenticatedFetch);

  // ── Location WS — connect when a location is selected ──
  useEffect(() => {
    if (!selectedLocation) return;
    const locId = selectedLocation.id;

    websocketService.connectToLocation(locId, {
      onMessage: (data: any) => {
        if (data.type === 'room_maintenance') {
          setRooms(prev => prev.map(r =>
            r.id === data.room_id
              ? { ...r, is_under_maintenance: data.enabled, maintenance_by_name: data.enabled ? (data.by ?? '') : '' }
              : r
          ));
        } else if (data.type === 'room_availability') {
          setRooms(prev => prev.map(r =>
            r.id === data.room_id
              ? { ...r, available_desk_count: data.available_desk_count }
              : r
          ));
        }
      },
    });

    return () => websocketService.closeConnection(`location_${locId}`);
  }, [selectedLocation?.id]);

  // ── Load locations ──
  const loadLocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/locations/`);
      const data: PublicLocation[] = await res.json();
      setLocations(data);
    } catch (err) {
      console.error('Failed to load locations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLocations(); }, []);

  // ── Reload when refreshToken changes ──
  useEffect(() => {
    if (refreshToken === undefined) return;
    if (view === 'locations') loadLocations();
    else if (selectedLocation && selectedFloorId) loadRooms(selectedLocation.id, selectedFloorId);
  }, [refreshToken]);

  // ── Load floors when location chosen ──
  const handleLocationClick = async (loc: PublicLocation) => {
    setSelectedLocation(loc);
    setSearch('');
    setLoading(true);
    try {
      const data = await floorApi.getFloorsByLocation(loc.id);
      setFloors(data);
      const firstFloor = data[0];
      if (firstFloor) {
        setSelectedFloorId(firstFloor.id);
        await loadRooms(loc.id, firstFloor.id);
      } else {
        setRooms([]);
      }
    } catch (err) {
      console.error('Failed to load floors:', err);
    } finally {
      setLoading(false);
      setView('rooms');
    }
  };

  // ── Load rooms for a floor ──
  const loadRooms = async (locationId: number, floorId: number) => {
    setLoading(true);
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/rooms/?floor=${floorId}`);
      const data: PublicRoom[] = await res.json();
      setRooms(data);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFloorChange = (floorId: number) => {
    setSelectedFloorId(floorId);
    if (selectedLocation) loadRooms(selectedLocation.id, floorId);
  };

  const handleBack = () => {
    setView('locations');
    setSelectedLocation(null);
    setFloors([]);
    setRooms([]);
    setSearch('');
  };

  // ── Filter ──
  const filteredLocations = locations.filter(l =>
    !search || l.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredRooms = rooms.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.root}>

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        {view === 'rooms' && (
          <>
            <span className={styles.breadcrumbItem} onClick={handleBack}>
              All Locations
            </span>
            <ChevronRight20Regular className={styles.breadcrumbSep} />
            <span className={styles.breadcrumbCurrent}>
              {selectedLocation?.name}
            </span>
          </>
        )}
        {view === 'locations' && (
          <span className={styles.breadcrumbCurrent}>All Locations</span>
        )}
      </div>

      {/* Search */}
      <div className={styles.searchRow}>
        <Input
          placeholder={view === 'locations' ? 'Search locations…' : 'Search rooms…'}
          value={search}
          onChange={(_, d) => setSearch(d.value)}
          contentBefore={<Search20Regular />}
          size="small"
          style={{ width: '100%' }}
        />
      </div>

      {/* Floor tabs (rooms view only) */}
      {view === 'rooms' && floors.length > 1 && (
        <div className={styles.floorTabs}>
          {floors.map(floor => (
            <Button
              key={floor.id}
              size="small"
              appearance={selectedFloorId === floor.id ? 'primary' : 'subtle'}
              className={styles.floorTab}
              onClick={() => handleFloorChange(floor.id)}
            >
              {floor.name}
            </Button>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className={styles.loadingState}>
          <Spinner size="medium" />
        </div>
      ) : view === 'locations' ? (
        filteredLocations.length === 0 ? (
          <div className={styles.empty}>
            <BuildingRegular style={{ fontSize: '36px' }} />
            <Text size={300}>No locations found</Text>
          </div>
        ) : (
          <div className={styles.list}>
            {filteredLocations.map(loc => (
              <div
                key={loc.id}
                className={styles.card}
                onClick={() => handleLocationClick(loc)}
              >
                <div className={`${styles.cardIcon} ${styles.cardIconLocation}`}>
                  <BuildingRegular />
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardTitle}>{loc.name}</div>
                  <div className={styles.cardMeta}>
                    {loc.country_name}
                    {' · '}
                    {loc.floor_count} {loc.floor_count === 1 ? 'floor' : 'floors'}
                    {' · '}
                    {loc.room_count} {loc.room_count === 1 ? 'room' : 'rooms'}
                  </div>
                </div>
                <ChevronRight20Regular style={{ color: tokens.colorNeutralForeground3 }} />
              </div>
            ))}
          </div>
        )
      ) : (
        filteredRooms.length === 0 ? (
          <div className={styles.empty}>
            <DoorRegular style={{ fontSize: '36px' }} />
            <Text size={300}>No rooms on this floor</Text>
          </div>
        ) : (
          <div className={styles.list}>
            {filteredRooms.map(room => {
              const isActive = selectedRoomId === room.id;
              const hasAvailable = room.available_desk_count > 0 && !room.is_under_maintenance;

              return (
                <div
                  key={room.id}
                  className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
                  onClick={() => room.can_book && !room.is_under_maintenance && onRoomSelect(room.id)}
                  style={{ cursor: (!room.can_book || room.is_under_maintenance) ? 'default' : 'pointer' }}
                >
                  <div className={`${styles.cardIcon} ${isActive ? (hasAvailable ? styles.cardIconRoomAvailableActive : styles.cardIconRoomActive) : (hasAvailable ? styles.cardIconRoomAvailable : styles.cardIconRoom)}`}>
                    <DoorRegular />
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardTitle}>{room.name}</div>
                    <div className={styles.cardMeta}>
                      {room.is_under_maintenance
                        ? <>
                            <span style={{ fontWeight: 600, color: tokens.colorPaletteMarigoldForeground1 }}>Under Maintenance</span>
                            {room.maintenance_by_name && ` · issued by ${room.maintenance_by_name}`}
                            {'. Please contact them.'}
                          </>
                        : (room.desk_count != null
                            ? `${room.available_desk_count ?? 0} of ${room.desk_count} desks available`
                            : 'Loading…')
                      }
                    </div>
                  </div>
                  <div className={styles.cardRight}>
                    {room.is_under_maintenance && (
                      <Warning20Regular style={{ color: tokens.colorPaletteMarigoldForeground1 }} />
                    )}
                    {!room.can_book && !room.is_under_maintenance && (
                      <LockClosed16Regular style={{ color: tokens.colorNeutralForeground3 }} />
                    )}
                    {room.available_desk_count > 0 && !room.is_under_maintenance && (
                      <Badge appearance="filled" color="success" size="small">
                        {room.available_desk_count}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

export default LocationBrowser;