import React from 'react';
import { makeStyles, Button, tokens } from "@fluentui/react-components";
import { WeatherMoon24Regular, WeatherSunny24Regular, Settings24Regular } from "@fluentui/react-icons";
import { useTheme } from '../contexts/ThemeContext';

const useStyles = makeStyles({
  floatingToggle: {
    position:'fixed',
    bottom:'20px',
    left:'20px',
    zIndex:'1000',
    width:'48px',
    height:'48px',
    borderRadius:'50%',
    display:'flex',
    justifyContent:'center',
    alignItems:'center',
    boxShadow:tokens.shadow16,
    backgroundColor:tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    transition: 'transform 0.2s ease, background-color 0.3s ease',
    padding: 0,
    minWidth: '48px',
    ':hover':{
      transform:'scale(1.1)',
      backgroundColor:tokens.colorNeutralBackground2,
    },
    ':active': {
      transform: 'scale(0.95)',
    }
  },
  icon: {
    color:tokens.colorBrandForeground1,
    fontSize:'20px',
  }
});

export const FloatingThemeToggle: React.FC = () => {
  const { themeMode, effectiveMode, toggleTheme} = useTheme();
  const styles = useStyles();
  
  const getIcon = () => {
    if (themeMode === 'auto') {
      return <Settings24Regular className={styles.icon} />;
    }
    return effectiveMode === 'dark' 
      ? <WeatherSunny24Regular className={styles.icon} />
      : <WeatherMoon24Regular className={styles.icon} />;
  };

  const getLabel = () => {
    if (themeMode === 'light') return 'Switch to dark mode';
    if (themeMode === 'dark') return 'Switch to auto mode';
    return 'Switch to light mode';
  };
  
  return (
    <Button
      className={styles.floatingToggle}
      appearance="subtle"
      icon={getIcon()}
      aria-label={getLabel()}
      onClick={toggleTheme}
      title={`${themeMode === 'auto' ? 'Auto (System)' : themeMode} theme`}
    />
  );
};