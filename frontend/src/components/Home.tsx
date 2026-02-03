
import React, {useCallback, useEffect, useState, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import { makeStyles } from '@fluentui/react-components';
import { useAuth } from '../contexts/AuthContext';
import websocketService from '../services/websocketService';
//import { TopBar } from './TopBar';
import { StatusBar } from './StatusBar';
import { type WsStatus, type NavSection } from '../types/common';
//import Dashboard from './Dashboard/DashboardUI';
import { type Desk, type Room } from './Dashboard/types';
//import {RoomViewer} fron './Dashboard/RoomViewer';
//import { BookingPanel} from './Dashboard/BookingPanel';
//import UserBookings from './Dashboard/UserBookings';

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
  }
});

interface HomeProps {
  onMount?: () => void ;
}

const Home: React.FC<HomeProps> = ({ onMount }) => {
  const styles = useStyles();
  const {logout} = useAuth();
  const navigate = useNavigate();
  
  const [globalWsStatus, setGlobalWsStatus] = useState<WsStatus>('connecting');
  const [lastPing, setLastPing] = useState<Date | null>(null);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  
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

  return (
    <div className={styles.container}>
      {/* <TopBar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        loading={loading}
        onLogout={handleLogout}
      /> */}

      <div className={styles.mainContent}>
        {/* {activeSection === 'dashboard' && (
          <Dashboard onRoomClick={handleRoomClick}/>
        )}

        {activeSection === 'bookings' && (
          <UserBookings />
        )}

        {selectedRoom && (
          <RoomViewer
            room={selectedRoom}
            onClose={handleCloseViewer}
            onViewBookings={handleViewBookingsFromViewer}
            highlightedDeskId={selectedDesk?.id}
            onDeskStateUpdate={updateDeskState}
            onRoomBookingsUpdate={handleRoomBookingsUpdate}
          />
        )}

        {showBookingsPanel && selectedDesk && (
          <BookingPanel
            desk={selectedDesk}
            onClose={() => {
              setShowBookingsPanel(false);
              setSelectedDesk(null);
            }}
            updateDeskState={updateDeskState}
            roomBookingUpdate={lastRoomBookingsUpdate}
            deskLocked={selectedDeskState.locked}
            deskLockedBy={selectedDeskState.lockedBy ?? null}
            deskBooked={selectedDeskState.isBooked}
            deskBookedBy={selectedDeskState.bookedBy ?? null}
          />
        )} */}
      </div>

      <StatusBar status={globalWsStatus} lastPing={lastPing} />
    </div>
  );
};

export default Home;