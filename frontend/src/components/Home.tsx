import React, {useCallback, useEffect, useState, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import { makeStyles, Button, Text, Spinner } from '@fluentui/react-components';
import { useAuth } from '../contexts/AuthContext';
import websocketService from '../services/websocketService';
import { TopBar } from './TopBar';
import { StatusBar } from './StatusBar';
import { FloatingPanelGrid, FloatingPanel } from './Layout';
import { SettingsDialog, ProfileDialog } from './Common';
import { AdminDashboard } from './Admin';
import MyActivity from './Activity/MyActivity';
import { type WsStatus, type NavSection } from '../types/common';
import { type Desk, type Room } from './Dashboard/types';
import { RoomMapViewer } from './Dashboard/RoomMapViewer';
import { LocationBrowser } from './Dashboard/LocationBrowser';
import { TodayPanel } from './Dashboard/TodayPanel';
import { BookingsCalendar } from './Dashboard/BookingsCalendar';
import { type RoomWithDesks } from '../services/roomApi';
import { type Booking } from '../services/bookingApi';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection:'column',
    height:'100%',
    width:'100%',
    pointerEvents: 'none',
  },
  mainContent: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '14px',
    color: 'var(--colorNeutralForeground3)',
  },
  locationCardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
});

interface HomeProps {
  onMount?: () => void ;
}

const Home: React.FC<HomeProps> = ({ onMount }) => {
  const styles = useStyles();
  const {logout, user, authenticatedFetch} = useAuth();
  const navigate = useNavigate();
  
  const [globalWsStatus, setGlobalWsStatus] = useState<WsStatus>('connecting');
  const [lastPing, setLastPing] = useState<Date | null>(null);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  
  const [selectedDesk, setSelectedDesk] = useState<Desk | null>(null);
  const [showBookingsPanel, setShowBookingsPanel] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  
  const [deskStates, setDeskStates] = useState<Record<string, {
    locked?: boolean;
    lockedBy?: string | null;
    isBooked?: boolean;
    bookedBy?: string | null;
  }>>({});
  
  const [lastRoomBookingsUpdate, setLastRoomBookingsUpdate] = useState<{
    desk_id: number | string;
    action?: 'upsert' | 'delete' | 'mixed';
    bookings?: any[];
    deleted_ids?: (number | string)[];
  } | null>(null);
  
  const hasMounted = useRef(false);
  const wsConnected = useRef(false);
  
  const selectedDeskState = selectedDesk
    ? deskStates[String(selectedDesk.id)] ||{}
    : {};
    
  const updateDeskState = useCallback((
    deskId: string | number,
    patch: Partial <{
      locked: boolean;
      lockedBy: string | null;
      isBooked: boolean;
      bookedBy: string | null;
    }>
  ) => {
    setDeskStates(prev => {
      const key = String(deskId);
      const prevState = prev[key] || {};
      return { ...prev, [key]: {...prevState, ...patch}};
    });
  },[]);
  
  const handleRoomBookingsUpdate = useCallback((payload : {
    desk_id: number| string;
    action?: 'upsert'|'delete'|'mixed';
    bookings?: any[];
    deleted_ids?: (number | string)[];
  }) => {
    setLastRoomBookingsUpdate(payload);
  }, []);
  
  const handleRoomClick = useCallback((room: Room) => {
    setSelectedRoom(room);
  },[]);
  
  const handleCloseViewer = useCallback(() => {
    setSelectedRoom(null);
    setShowBookingsPanel(false);
    setSelectedDesk(null);
  },[]);
  
  const handleViewBookingsFromViewer = useCallback((desk: Desk) => {
    setSelectedDesk(desk);
    setShowBookingsPanel(true);
  },[]);
  
  const handleLogout = useCallback(async () => {
    setLoading(true);
    try {
      await logout();
      websocketService.disconnectAll();
      navigate('/login');
    } catch (error) {
      console.error("Logout error: ", error);
    } finally {
      setLoading(false);
    }
  }, [logout, navigate]);
  
  const handleSectionChange = useCallback((section: NavSection) => {
    setActiveSection(section);
  },[]);

  const handleSettingsClick = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const handleProfileClick = useCallback(() => {
    setProfileOpen(true);
  }, []);

  useEffect(() => {
    if(!hasMounted.current && onMount) {
      hasMounted.current = true;
      onMount();
    }
  },[onMount]);

  useEffect(() => {
    if(wsConnected.current) {
      return;
    }

    wsConnected.current = true;

    websocketService.connectToGlobal({
      onOpen: () => {
        setGlobalWsStatus('connected');

        try {
          const socket = websocketService.getConnection('global');
          if(socket) {
            socket.send(JSON.stringify({type: "ping"}));
          }
        } catch (error) {
          console.error("Failed to send ping: ", error);
        }
      },
      onMessage: (data) => {
        if(data.type === 'pong') {
          setLastPing(new Date());
        } else {
          //Some debug message
        }
      },
      onClose: (event) => {
        setGlobalWsStatus('disconnected');
        wsConnected.current = false;
      },
      onError: (error) => {
        console.error('Global WebSocket error:',error);
        setGlobalWsStatus('error');
      },
    });

    return () => {
      websocketService.closeConnection('global');
      wsConnected.current = false;
    }
  }, []);

  useEffect(() => {
    if(globalWsStatus !== 'connected') return;

    const pingInterval = setInterval(() => {
      try {
        const socket = websocketService.getConnection('global');
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({type: "ping"}));
        }
      } catch (error) {
        console.error("Failed to send periodic ping:",error)
      }
    },30000);

    return () => clearInterval(pingInterval);
  },[globalWsStatus]);

  // ── Dashboard state ──────────────────────────────────────────────────────────
  const [selectedRoomData, setSelectedRoomData] = useState<RoomWithDesks | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [bookingRefreshToken, setBookingRefreshToken] = useState(0);
  // Set when navigating from TodayPanel — passed to RoomMapViewer to auto-highlight/edit
  const [pendingDeskId, setPendingDeskId] = useState<number | null>(null);
  const [pendingEditBooking, setPendingEditBooking] = useState<Booking | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const handleRoomSelect = useCallback(async (roomId: number) => {
    setLoadingRoom(true);
    try {
      // Use public desks endpoint — no admin perms needed
      const res = await authenticatedFetch(`${API_BASE_URL}/rooms/${roomId}/desks/`);
      if (res.ok) {
        const data: RoomWithDesks = await res.json();
        setSelectedRoomData(data);
      }
    } catch (err) {
      console.error('Failed to load room:', err);
    } finally {
      setLoadingRoom(false);
    }
  }, [API_BASE_URL, authenticatedFetch]);

  const handleBookingChange = useCallback(() => {
    setBookingRefreshToken(t => t + 1);
  }, []);

  // Navigate from TodayPanel booking card → open the room and highlight the desk
  const handleTodayBookingClick = useCallback(async (booking: Booking) => {
    setPendingDeskId(booking.desk.id);
    setPendingEditBooking(null);
    await handleRoomSelect(booking.desk.room);
  }, [handleRoomSelect]);

  // Navigate from TodayPanel edit button → open room, highlight desk, open edit modal
  const handleTodayBookingEdit = useCallback(async (booking: Booking) => {
    setPendingDeskId(booking.desk.id);
    setPendingEditBooking(booking);
    await handleRoomSelect(booking.desk.room);
  }, [handleRoomSelect]);

  const renderDashboard = () => (
    <FloatingPanelGrid>

      {/* Left — My Bookings */}
      <FloatingPanel
        title={`Hi, ${user?.first_name || user?.username || 'there'}`}
        position="center-left"
        size="small"
        opacity="glass"
        style={{ top: '16px', bottom: '16px', height: 'calc(100% - 32px)', transform: 'none' }}
      >
        <TodayPanel
          refreshToken={bookingRefreshToken}
          onBookingCancelled={handleBookingChange}
          onBookingClick={handleTodayBookingClick}
          onBookingEdit={handleTodayBookingEdit}
        />
      </FloatingPanel>

      {/* Centre — Room map (only shown when a room is selected or loading) */}
      {(loadingRoom || selectedRoomData) && (
        <FloatingPanel
          position="center"
          size="custom"
          opacity="glass"
          noPadding={false}
          style={{
            left: '360px',
            right: '360px',
            top: '16px',
            bottom: '16px',
            width: 'auto',
            height: 'calc(100% - 32px)',
            transform: 'none',
          }}
        >
          {loadingRoom ? (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <Spinner size="large" label="Loading room…" />
            </div>
          ) : (
            <RoomMapViewer
              room={selectedRoomData!}
              onClose={() => { setSelectedRoomData(null); setPendingDeskId(null); setPendingEditBooking(null); }}
              onBookingChange={handleBookingChange}
              initialSelectedDeskId={pendingDeskId}
              initialEditingBooking={pendingEditBooking}
            />
          )}
        </FloatingPanel>
      )}

      {/* Right — Location browser */}
      <FloatingPanel
        title="Browse"
        position="center-right"
        size="small"
        opacity="glass"
        style={{ top: '16px', bottom: '16px', height: 'calc(100% - 32px)', transform: 'none' }}
      >
        <LocationBrowser
          selectedRoomId={selectedRoomData?.id}
          onRoomSelect={handleRoomSelect}
          refreshToken={bookingRefreshToken}
        />
      </FloatingPanel>

    </FloatingPanelGrid>
  );

  const renderMyBookings = () => (
    <FloatingPanelGrid>
      <FloatingPanel
        title="My Bookings"
        position="center"
        size="custom"
        opacity="glass"
        style={{
          left: '24px',
          right: '24px',
          top: '16px',
          bottom: '16px',
          width: 'auto',
          height: 'calc(100% - 32px)',
          transform: 'none',
        }}
      >
        <BookingsCalendar
          refreshToken={bookingRefreshToken}
          onBookingCancelled={handleBookingChange}
        />
      </FloatingPanel>
    </FloatingPanelGrid>
  );

  const renderActivity = () => (
    <MyActivity />
  );

  const renderAdmin = () => (
    <AdminDashboard />
  );

  return (
    <div className={styles.container}>
      <TopBar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        loading={loading}
        onLogout={handleLogout}
        onSettingsClick={handleSettingsClick}
        onProfileClick={handleProfileClick}
      />

      <div className={styles.mainContent}>
        {/* Globe background renders here from GlobalLayout */}
        {activeSection === 'dashboard' && renderDashboard()}
        {activeSection === 'bookings' && renderMyBookings()}
        {activeSection === 'activity' && renderActivity()}
        {activeSection === 'admin' && renderAdmin()}
      </div>

      <StatusBar status={globalWsStatus} lastPing={lastPing} />

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Profile Dialog */}
      <ProfileDialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onEdit={() => {
          setProfileOpen(false);
          setSettingsOpen(true);
        }}
      />
    </div>
  );
};

export default Home;