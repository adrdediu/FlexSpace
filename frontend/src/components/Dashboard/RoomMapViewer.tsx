import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Tooltip,
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
  Warning20Regular,
  CalendarAdd20Regular,
  CalendarCancel20Regular,
} from '@fluentui/react-icons';
import { type RoomWithDesks } from '../../services/roomApi';
import { createBookingApi } from '../../services/bookingApi';
import { useAuth } from '../../contexts/AuthContext';
import websocketService from '../../services/webSocketService';
import { BookingModal } from './BookingModal';

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
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
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
      ? `${desk.name} — your booking (click to book another slot)`
      : `${desk.name} — booked now, click to book in advance`;
  return `${desk.name} — available`;
}

function canBook(desk: DeskLiveState, myUserId?: number): boolean {
  if (desk.is_locked && desk.locked_by_id !== myUserId) return false;
  if (desk.is_permanent && desk.permanent_assignee && desk.permanent_assignee !== myUserId) return false;
  return true;
}

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
  const [editingBooking, setEditingBooking] = useState<import('../../services/bookingApi').Booking | null>(null);
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
    setEditingBooking(null);
    setBookingDesk(desk);
    setBookingModalOpen(true);
  };

  // ── Edit an existing booking from the calendar ──
  const handleEditBooking = (booking: import('../../services/bookingApi').Booking) => {
    const desk = desks.find(d => d.id === booking.desk.id);
    if (!desk) return;
    openingBookingRef.current = true;
    setEditingBooking(booking);
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
    setEditingBooking(null);
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
                                {desk.is_booked
                                  ? desk.booked_by_id === myUserId
                                    ? 'Book Another Slot'
                                    : `Book in Advance`
                                  : 'Book Desk'}
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
        desk={bookingDesk ? { id: bookingDesk.id, name: bookingDesk.name, color: '#22c55e' } : null}
        roomName={room.name}
        onClose={handleCloseBookingModal}
        onConfirm={handleConfirmBooking}
        myUsername={user?.username}
        bookingApi={bookingApi}
        editingBooking={editingBooking}
        onBookingUpdated={() => { handleCloseBookingModal(); onBookingChange?.(); }}
        onEditBooking={handleEditBooking}
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