import React, { type ReactNode, useEffect, useRef, useImperativeHandle, forwardRef, useState} from 'react';
import SpinningGlobe, { type SpinningGlobeRef,type  HighlightedCountry, type Location} from '../Globe/SpinningGlobe';
import {createContext, useContext} from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FloatingResetViewButton } from '../FloatingResetViewButton';




interface GlobeContextType {
  globeRef: React.RefObject<SpinningGlobeRef>;
  isGlobeReady: boolean;
  focusOnLocation: (location: Location) => void;
  resetView: () => void;
  focusedLocation: Location | null;
  isFocused: boolean;
  highlightedCountries: HighlightedCountry[];
  locations: Location[];
}

const GlobeContext = createContext<GlobeContextType | null>(null);


export const useGlobe = () => {
  const context = useContext(GlobeContext);
  if (!context) {
    throw new Error('useGlobe must be used within a GlobalLayout');
  }
  return context;
}

interface GlobalLayoutProps {
  children: ReactNode;
  isAuthenticated: boolean;
  themeMode: string;
  onGlobeReady?: () => void;
}

const GlobalLayout = forwardRef<
 {
   updateAuthState: (isAuthenticated: boolean) => void;
   isGlobeReady:boolean;
 },
 GlobalLayoutProps
>(({ children, isAuthenticated, themeMode, onGlobeReady}, ref) => {
  const globeRef = useRef<SpinningGlobeRef>(null);
  const prevAuthRef = useRef(isAuthenticated);
  const prevThemeRef = useRef(themeMode);
  const [isGlobeReady, setIsGlobeReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [highlightedCountries, setHighlightedCountries] = useState<HighlightedCountry[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  
  const [focusedLocation, setFocusedLocation] = useState<Location | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  const handleGlobeFocus = (location: Location | null) => {
    setFocusedLocation(location);
    setIsFocused(!!location);
  };
  
  const {authenticatedFetch} = useAuth();
  
  const fetchGlobeData = async () => {
    if(!isAuthenticated) {
      setHighlightedCountries([]);
      setLocations([]);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const countriesResponse = await authenticatedFetch('/api/countries');
      if(countriesResponse.ok) {
        const countriesData = await countriesResponse.json();
        setHighlightedCountries(countriesData || []);
      } else {
        console.error('Failed to fetch countries data', countriesResponse.status);
      }
      
      const locationsResponse = await authenticatedFetch('/api/locations')
      if (locationsResponse.ok){
        const locationsData = await locationsResponse.json();
        setLocations(locationsData || []);
      } else{
        console.error('Failed to fetch locations data', locationsResponse.status);
      }
    } catch (error) {
      console.error('Error fetching globe data: ',error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGlobeReady = () => {
    setIsGlobeReady(true);
    if(onGlobeReady){
      onGlobeReady();
    }
  };
  
  const focusOnLocation = (location: Location) => {
    if(globeRef.current) {
      setFocusedLocation(location);
      setIsFocused(true);
      globeRef.current.focusOnLocation(location);
    }
  };
  
  const resetView = () => {
    if (globeRef.current) {
      setFocusedLocation(null);
      setIsFocused(false);
      globeRef.current.resetView();
    }
  };
  
  useImperativeHandle(ref, () => ({
    updateAuthState: (newIsAuthenticated:boolean) => {
      if(globeRef.current) {
        globeRef.current.updateExtendedMode(newIsAuthenticated);
      }
      prevAuthRef.current = newIsAuthenticated;
      if(newIsAuthenticated !== isAuthenticated) {
        fetchGlobeData();
      }
    },
    isGlobeReady
  }));
  
  useEffect(() => {
    if(prevAuthRef.current !== isAuthenticated && globeRef.current) {
      globeRef.current.updateExtendedMode(isAuthenticated);
      fetchGlobeData();
    }
    prevAuthRef.current = isAuthenticated
  }, [isAuthenticated]);
  
  useEffect(() => {
    if(prevThemeRef.current !== themeMode && globeRef.current) {
      globeRef.current.updateTheme(themeMode);
    }
    prevThemeRef.current = themeMode;
  }, [themeMode]);
  
  useEffect(() => {
    fetchGlobeData();
  }, []);
  
  const globeContextValue: GlobeContextType = {
    globeRef,
    isGlobeReady,
    focusOnLocation,
    resetView,
    focusedLocation,
    isFocused,
    highlightedCountries,
    locations
  };
  
  return (
    <GlobeContext.Provider value={globeContextValue}>
      <div 
       className="app-container"
       style={{position: 'relative', minHeight:'100vh', display:'flex', flexDirection:'column'}}
      >
        <div
          className="background-globe"
          style={{
            position:'fixed',
            inset: 0,
            zIndex: 0
          }}
        >
          <SpinningGlobe
            ref={globeRef}
            autoRotateSpeed={0.0005}
            showArcs
            arcCount={0}
            extended={isAuthenticated}
            highlightedCountries={highlightedCountries}
            locations={locations}
            glowIntensity={0.15}
            fillOpacity={0.3}
            onReady={handleGlobeReady}
            isFocused={isFocused}
            onFocus={handleGlobeFocus}
          />
        </div>
        
        <div
         className="content"
         style={{
           position:'relative',
           zIndex:1,
           flex:1,
           display:'flex',
           flexDirection:'column',
           width: '100%',
           height: '100%',
           pointerEvents: 'none'
         }}
        >
          {children}
        </div>
        
        {isFocused && (
          <FloatingResetViewButton resetView={resetView} />
        )}
      </div>
    </GlobeContext.Provider>
  );
});

export default GlobalLayout;