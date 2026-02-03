import React from 'react';
import {makeStyles, Button, tokens} from '@fluentui/react-components';
import {ArrowClockwise24Regular} from '@fluentui/react-icons';

const useStyles = makeStyles ({
    floatingReset: {
        position:'fixed',
        bottom: '20px',
        left:'80px',
        zIndex: 1000,
        width:'48px',
        height:'48px',
        borderRadius: '50%',
        display:'flex',
        justifyContent:'center',
        alignItems: 'center',
        boxShadow: tokens.shadow16,
        backgroundColor: tokens.colorNeutralBackground1,
        border: `1px solid ${tokens.colorNeutralStroke1}`,
        transition: 'transform 0.2s ease, background-color 0.3s ease',
        padding:0,
        minWidth: '48px',
        ':hover': {
            transform: 'scale(1.1)',
            backgroundColor: tokens.colorNeutralBackground2,
        },
        ':active': {
            transform: 'scale(0.95)',
        }
    },
    icon: {
        color: tokens.colorBrandForeground1,
        fontSize: '20px',
    }
});

interface FloatingResetViewButtonProps {
    resetView: () => void;
}

export const FloatingResetViewButton: React.FC<FloatingResetViewButtonProps> = ({resetView}) => {
    const styles = useStyles();

    return (
        <Button
            className={styles.floatingReset}
            appearance="subtle"
            icon={<ArrowClockwise24Regular className={styles.icon} />}
            aria-label="Reset view"
            onClick={resetView}
            title="Reset view"
        />
    )
}