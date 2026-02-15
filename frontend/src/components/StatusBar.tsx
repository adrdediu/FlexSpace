import React, { useState, useEffect } from 'react';
import {Text,makeStyles, tokens, mergeClasses} from '@fluentui/react-components';
import {
    CheckmarkCircleRegular,
    ErrorCircleRegular,
    ArrowSyncRegular,
    DismissRegular,
    Clock20Regular
} from '@fluentui/react-icons';
import {type WsStatus} from '../types/common';
import { usePreferences } from '../contexts/PreferencesContext';

const useStyles = makeStyles({
    statusBar: {
        padding: '8px 16px',
        backgroundColor: tokens.colorNeutralBackground1,
        borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '12px',
        zIndex: 10,
        position: 'relative',
        pointerEvents:'all'
    },
    connectionStatus: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        borderRadius: '16px',
        fontSize: '12px',
    },
    connected: {
        backgroundColor: 'rgba(72,39,175,0.1)',
        color: tokens.colorPaletteRoyalBlueForeground2,
    },
    disconnected: {
        backgroundColor: 'rgba(201,37,175,0.1)',
        color: tokens.colorPaletteRedForeground1,
    },
    connecting: {
        backgroundColor: 'rgba(0,120,212,0.1)',
        color: tokens.colorPaletteBlueBackground2,
    },
    error: {
        backgroundColor: 'rgba(232, 134, 0, 0.1)',
        color: tokens.colorPaletteDarkOrangeForeground3,
    },
    currentTime: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: tokens.colorNeutralForeground2,
    },
    divider: {
        width: '1px',
        height: '16px',
        backgroundColor: tokens.colorNeutralStroke2,
    },
});

interface StatusBarProps {
    status: WsStatus;
    lastPing: Date | null;
}

export const StatusBar: React.FC<StatusBarProps> =({status,lastPing}) => {
    const styles = useStyles();
    const { formatTime, formatDate, getTimezoneAbbreviation } = usePreferences();
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update current time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const getStatusIcon = (status: WsStatus) => {
        switch(status) {
            case 'connected': return <CheckmarkCircleRegular/>
            case 'disconnected': return <DismissRegular/>
            case 'error': return <ErrorCircleRegular/>
            case 'connecting': return <ArrowSyncRegular/>
        }
    };

    const getStatusText = (status:WsStatus): string => {
        switch(status) {
            case 'connected': return "Connected";
            case 'disconnected': return "Disconnected";
            case 'error': return "Connection Error";
            case 'connecting': return "Connecting...";
        }
        return "Status Type Error";
    };

    const timezoneAbbr = getTimezoneAbbreviation(currentTime);

    return(
        <div className={styles.statusBar}>
            {/* Current Time */}
            <div className={styles.currentTime}>
                <Clock20Regular />
                <Text size={200}>
                    {formatDate(currentTime)} {formatTime(currentTime)} {timezoneAbbr && `(${timezoneAbbr})`}
                </Text>
            </div>

            <div className={styles.divider} />

            {/* Connection Status */}
            <div className={mergeClasses(styles.connectionStatus, styles[status])}>
                {getStatusIcon(status)}
                <Text>{getStatusText(status)}</Text>
            </div>

            {lastPing && (
                <>
                    <div className={styles.divider} />
                    <Text size={100}>
                        Last update: {formatTime(lastPing)}
                    </Text>
                </>
            )}
        </div>
    )
}