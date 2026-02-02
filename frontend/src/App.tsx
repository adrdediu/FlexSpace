
import React, {useEffect, useRef, useState, useCallback} from 'react';
import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom';
import {FluentProvider, Nav, Spinner, makeStyles} from '@fluentui/react-components';
import {AuthProvider, useAuth} from './contexts/AuthContext';
import {ThemeProvider, useTheme} from './contexts/ThemeContext';
import {ToastProvider} from './contexts/ToastContext';
import {FloatingThemeToggle} from './components/FloatingThemeToggle';
import Login from './components/Login';
import Home from './components/Home';
import GlobalLayout from './components/GlobalLayout';

const useStyles = makeStyles({
  appContainer: {
    display:'flex',
    flexDirection:'column',
    flex:1,
    position:'relative',
    minHeight:'100vh',
    height: '100%',
  },
  routesContainer: {
    display: 'flex',
    flexDirection:'column',
    flex:'1',
    width:'100%',
    height:'100%',
    position:'relative',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.5s ease-in-out',
  }
});

const ThemedApp: React.FC = () => {
  const {theme} = useTheme();
  const styles = useStyles();

  return (
    <FluentProvider theme = {theme} >
      <div className={styles.appContainer}>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <AppRoutesWithAuth />
              <FloatingThemeToggle />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </div>
    </FluentProvider>
  );
};

const AppRoutesWithAuth: React.FC = () => {
  const {isAuthenticated, loading: authLoading} = useAuth();
  const {theme, themeMode} = useTheme();
  const styles = useStyles();

  const [isGlobeReady,setIsGlobeReady] = useState(false);
  const [routeComponentMounted, setRouteComponentMounted] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(1);

  const globeLayoutRef = useRef<any>(null);
  const IsInitialMount = useRef(true);
  const overlayRemovedRef = useRef(false);
  const previousAuthState = useRef<boolean | null>(null);

  const handleGlobeReady = useCallback(() => {
    setIsGlobeReady(true);
  },[]);

  const handleComponentMount = useCallback(() => {
    setRouteComponentMounted(true);
  },[]);

  useEffect(() => {
    if(IsInitialMount.current) {
      IsInitialMount.current = false;
      previousAuthState.current = isAuthenticated;
      return;
    }
    if(previousAuthState.current !== isAuthenticated) {
      
      if(globeLayoutRef.current?.updatedAuthState) {
        globeLayoutRef.current.updateAuthState(isAuthenticated);
      }

      previousAuthState.current = isAuthenticated;
    }
  },[isAuthenticated]);

  useEffect(() => {
    if(overlayRemovedRef.current) {
      return;
    }
    const allReady = !authLoading && isGlobeReady && routeComponentMounted;

    if(allReady && overlayVisible) {
      overlayRemovedRef.current = true;

      const timer = setTimeout (() => {
        const initialLoader = document.getElementById('initial-loader');
        if(initialLoader) {
          initialLoader.style.opacity = '0';
          setTimeout(() => {
            if(initialLoader.parentNode) {
              initialLoader.parentNode.removeChild(initialLoader);
            }
          }, 500);
        }

        setOverlayOpacity(0);
        setTimeout(() => {
          setOverlayVisible(false);
        },500);
      },300);

      return () => clearTimeout(timer);
    }
  },[authLoading,isGlobeReady,routeComponentMounted,overlayVisible]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if(overlayVisible && !overlayRemovedRef.current) {
        overlayRemovedRef.current = true;

        const initialLoader = document.getElementById('initial-loader');
        if(initialLoader) {
          initialLoader.style.opacity = '0';
          setTimeout(() => {
            if(initialLoader.parentNode) {
              initialLoader.parentNode.removeChild(initialLoader);
            }
          },500);
        }

        setOverlayOpacity(0);
        setTimeout(() => {
          setOverlayVisible(false);
        },500);
      }
    },5000);

    return () => clearTimeout(timeoutId);
  },[]);

  const getLoadingMessage = () => {
    if (authLoading) return 'Authenticating...';
    if (!isGlobeReady) return 'Loading globe...';
    if (!routeComponentMounted) return 'Loading interface...';
    return 'Initializing...';
  };

  return (
    <div className={styles.routesContainer}>
      <GlobalLayout
        ref={globeLayoutRef}
        isAuthenticated={isAuthenticated}
        thememode={themeMode}
        onGlobeReady={handleGlobeReady}
      >
        <Routes>
          <Route
            path="/login"
            element={
              authLoading ? (
                <div />
              ) : isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <Login onMount={handleComponentMount} />
              )
            }
          />
          <Route
            path="/"
            element = {
              authLoading ? (
                <div />
              ) : isAuthenticated ? (
                <Home onMount={handleComponentMount} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path='*' element={<Navigate to="/" replace />}/>
        </Routes>
      </GlobalLayout>

      {overlayVisible && (
        <div
          className={styles.overlay}
          style={{
            backgroundColor: theme.colorNeutralBackground1,
            opacity: overlayOpacity,
            pointerEvents: overlayOpacity > 0 ? 'auto': 'none',
          }}
        >
          <Spinner
            size="large"
            label={getLoadingMessage()}
            labelPosition='below'
            appearance='primary'
          />
      </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
};

export default App;