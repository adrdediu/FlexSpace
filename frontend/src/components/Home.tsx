import React, {useCallback, useEffect, useState, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import { makeStyles, Button, Text } from '@fluentui/react-components';
import { useAuth } from '../contexts/AuthContext';
import websocketService from '../services/websocketService';
import { TopBar } from './TopBar';
import { StatusBar } from './StatusBar';
import { FloatingPanelGrid, FloatingPanel, ContentGrid, Card, Section } from './Layout';
import { SettingsDialog, ProfileDialog } from './Common';
import { type WsStatus, type NavSection } from '../types/common';
import { type Desk, type Room } from './Dashboard/types';

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
  const {logout, user} = useAuth();
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

  // Mock data for demonstration
  const mockLocations = [
    { id: 1, name: 'San Francisco Office', country: 'United States', rooms: 12, desks: 84, available: 45 },
    { id: 2, name: 'London Office', country: 'United Kingdom', rooms: 8, desks: 56, available: 23 },
    { id: 3, name: 'Tokyo Office', country: 'Japan', rooms: 6, desks: 42, available: 18 },
  ];

  const mockUpcomingBookings = [
    { id: 1, desk: 'Desk 15', room: 'Open Space', date: 'Tomorrow, 9:00 AM - 5:00 PM', location: 'San Francisco' },
    { id: 2, desk: 'Desk 8', room: 'Quiet Zone', date: 'Friday, 9:00 AM - 1:00 PM', location: 'San Francisco' },
  ];

  const renderDashboard = () => (
    <FloatingPanelGrid>
      {/* Quick Stats Panel */}
      <FloatingPanel
        title={`Welcome back, ${user?.first_name || user?.username || 'User'}!`}
        position="top-left"
        size="large"
        opacity="glass"
      >
        <Section spacing="none">
          <ContentGrid columns="2" gap="m">
            <Card variant="subtle" noPadding>
              <div style={{ padding: '16px', textAlign: 'center' }}>
                <div className={styles.statValue}>3</div>
                <div className={styles.statLabel}>Active Bookings</div>
              </div>
            </Card>
            <Card variant="subtle" noPadding>
              <div style={{ padding: '16px', textAlign: 'center' }}>
                <div className={styles.statValue}>45</div>
                <div className={styles.statLabel}>Available Desks</div>
              </div>
            </Card>
          </ContentGrid>
        </Section>
      </FloatingPanel>

      {/* Locations Panel */}
      <FloatingPanel
        title="Browse Locations"
        position="bottom-left"
        size="xl"
        opacity="glass"
        actions={<Button appearance="primary">Book Desk</Button>}
      >
        <ContentGrid columns="auto-fit" gap="m">
          {mockLocations.map(location => (
            <Card
              key={location.id}
              title={location.name}
              subtitle={location.country}
              variant="outlined"
              interactive
              onClick={() => console.log('Navigate to location:', location.id)}
            >
              <div className={styles.locationCardContent}>
                <Text size={200}>{location.rooms} rooms • {location.desks} desks</Text>
                <Text size={300} weight="semibold" style={{ color: 'var(--colorBrandForeground1)' }}>
                  {location.available} available
                </Text>
              </div>
            </Card>
          ))}
        </ContentGrid>
      </FloatingPanel>

      {/* Quick Actions Panel */}
      <FloatingPanel
        position="top-right"
        size="small"
        opacity="glass"
      >
        <Section spacing="none">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Button appearance="primary" style={{ width: '100%' }}>Book a Desk</Button>
            <Button appearance="subtle" style={{ width: '100%' }}>View Schedule</Button>
            <Button appearance="subtle" style={{ width: '100%' }}>Browse Rooms</Button>
          </div>
        </Section>
      </FloatingPanel>
    </FloatingPanelGrid>
  );

  const renderMyBookings = () => (
    <FloatingPanelGrid>
      {/* Active Booking Panel */}
      <FloatingPanel
        title="Active Now"
        position="top-left"
        size="medium"
        opacity="glass"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Text weight="semibold" size={400}>Desk 42 - Conference Room A</Text>
          <Text size={300}>Today, 9:00 AM - 5:00 PM</Text>
          <Text size={200}>Floor 3, San Francisco Office</Text>
        </div>
      </FloatingPanel>

      {/* Upcoming Bookings Panel */}
      <FloatingPanel
        title="Upcoming Bookings"
        position="bottom-left"
        size="large"
        opacity="glass"
        actions={<Button appearance="primary">New Booking</Button>}
      >
        <ContentGrid columns="1" gap="m">
          {mockUpcomingBookings.map(booking => (
            <Card
              key={booking.id}
              title={booking.desk}
              subtitle={booking.date}
              variant="outlined"
              footer={
                <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
                  <Button appearance="subtle" size="small">Modify</Button>
                  <Button appearance="subtle" size="small">Cancel</Button>
                </div>
              }
            >
              <Text size={200}>{booking.room} • {booking.location}</Text>
            </Card>
          ))}
        </ContentGrid>
      </FloatingPanel>

      {/* Quick Actions */}
      <FloatingPanel
        position="top-right"
        size="small"
        opacity="glass"
      >
        <Section spacing="none">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Button appearance="primary" style={{ width: '100%' }}>New Booking</Button>
            <Button appearance="subtle" style={{ width: '100%' }}>View Calendar</Button>
            <Button appearance="subtle" style={{ width: '100%' }}>History</Button>
          </div>
        </Section>
      </FloatingPanel>
    </FloatingPanelGrid>
  );

  const renderAdmin = () => (
    <FloatingPanelGrid>
      {/* Overview Stats */}
      <FloatingPanel
        title="System Overview"
        position="top-left"
        size="large"
        opacity="glass"
      >
        <ContentGrid columns="2" gap="m">
          <Card variant="filled" noPadding>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div className={styles.statValue}>156</div>
              <div className={styles.statLabel}>Users</div>
            </div>
          </Card>
          <Card variant="filled" noPadding>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div className={styles.statValue}>8</div>
              <div className={styles.statLabel}>Locations</div>
            </div>
          </Card>
          <Card variant="filled" noPadding>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div className={styles.statValue}>42</div>
              <div className={styles.statLabel}>Rooms</div>
            </div>
          </Card>
          <Card variant="filled" noPadding>
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div className={styles.statValue}>328</div>
              <div className={styles.statLabel}>Desks</div>
            </div>
          </Card>
        </ContentGrid>
      </FloatingPanel>

      {/* Managed Locations */}
      <FloatingPanel
        title="Managed Locations"
        position="bottom-left"
        size="xl"
        opacity="glass"
        actions={<Button appearance="primary">Add Location</Button>}
      >
        <ContentGrid columns="2" gap="m">
          <Card
            title="San Francisco Office"
            subtitle="8 user groups • 12 rooms"
            variant="outlined"
            actions={<Button appearance="subtle" size="small">Manage</Button>}
          >
            <Text size={200}>You are a Location Manager</Text>
          </Card>
          <Card
            title="London Office"
            subtitle="5 user groups • 8 rooms"
            variant="outlined"
            actions={<Button appearance="subtle" size="small">Manage</Button>}
          >
            <Text size={200}>You are a Location Manager</Text>
          </Card>
        </ContentGrid>
      </FloatingPanel>

      {/* Quick Actions */}
      <FloatingPanel
        title="Quick Actions"
        position="top-right"
        size="small"
        opacity="glass"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Button style={{ width: '100%' }}>Create Group</Button>
          <Button style={{ width: '100%' }}>Add Room</Button>
          <Button style={{ width: '100%' }}>Permissions</Button>
          <Button appearance="subtle" style={{ width: '100%' }}>Reports</Button>
        </div>
      </FloatingPanel>
    </FloatingPanelGrid>
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