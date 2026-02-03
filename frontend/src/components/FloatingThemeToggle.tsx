import React from 'react';
import { makeStyles, Button, tokens } from "@fluentui/react-components";
import { WeatherMoon24Regular, WeatherSunny24Regular } from "@fluentui/react-icons";
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
  const { themeMode, toggleTheme} = useTheme();
  const styles = useStyles();
  
  return (
    <Button
      className={styles.floatingToggle}
      appearance="subtle"
      icon={
        themeMode === 'dark'
          ? <WeatherSunny24Regular className={styles.icon} />
          : <WeatherMoon24Regular className={styles.icon} />
      }
      aria-label={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}
      onClick={toggleTheme}
      title={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}
    />
  );
};