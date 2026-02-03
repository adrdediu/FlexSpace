import React from 'react';
import {Text,makeStyles, tokens} from '@fluentui/react-components';
import {
    CheckmarkCircleRegular,
    ErrorCircleRegular,
    ArrowSyncRegular,
    DismissRegular
} from '@fluentui/react-icons';
import {type WsStatus} from '../types/common';

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
});

interface StatusBarProps {
    status: WsStatus;
    lastPing: Date | null;
}

export const StatusBar: React.FC<StatusBarProps> =({status,lastPing}) => {
    const styles = useStyles();

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

    return(
        <div className={styles.statusBar}>
            <div className={`${styles.connectionStatus} ${styles[status]}`}>
                {getStatusIcon(status)}
                <Text>{getStatusText(status)}</Text>
            </div>

            {lastPing && (
                <Text size={100}>
                    Last update: {lastPing.toLocaleTimeString()}
                </Text>
            )}
        </div>
    )
}