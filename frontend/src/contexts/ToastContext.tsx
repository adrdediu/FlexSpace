import React, {createContext, useContext, useCallback, useState} from 'react';
import {
    makeStyles,
    tokens,
    shorthands,
} from '@fluentui/react-components';
import {
    CheckmarkCircleFilled,
    ErrorCircleFilled,
    WarningFilled,
    InfoFilled,
    DismissRegular,
} from '@fluentui/react-icons';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
    id:string;
    type: ToastType;
    message: string;
    title?: string;
    duration: number;
}

interface ToastContextType {
    showToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
    dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const useStyles = makeStyles({
    toasterContainer: {
        position:'fixed',
        top:'16px',
        left:'50%',
        transform: 'translateX(-50%)',
        display:'flex',
        flexDirection:'column',
        alignItems:'center',
        gap:'8px',
        zIndex: 100000,
        pointerEvents:'none',
        width:'auto',
        maxWidth: '80vw',
    },
    toast: {
        minWidth: '320px',
        maxWidth: '500px',
        padding: '16px 20px',
        borderRadius: tokens.borderRadiusLarge,
        boxShadow: tokens.shadow28,
        backdropFilter: 'blur(10px)',
        border: `1px solid ${tokens.colorTransparentStroke}`,
        pointerEvents: 'all',
        position:'relative',
        animationDuration: '300ms',
        animationTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1)',
        animationFillMode: 'both',
        animationName: {
            from: {
                opacity: 0,
                transform: 'translateY(-20px) scale(0.95)',
            },
            to: {
                opacity: 1,
                transform: 'translateY(0) scale(1)',
            }
        }
    },
    toastExit: {
        animationName: {
            from: {
                opacity:1,
                transform: 'translateY(0) scale(1)',
            },
            to: {
                opacity: 0,
                transform:'translateY(-20px) scale(0.95)',
            }
        },
        animationDuration:'200ms',
    },
    successToast: {
        backgroundColor: tokens.colorPaletteGreenBackground1,
        borderLeft: `4px solid ${tokens.colorPaletteGreenBorder2}`,
    },
    errorToast: {
        backgroundColor: tokens.colorPaletteRedBackground1,
        borderLeft: `4px solid ${tokens.colorPaletteRedBorder2}`,
    },
    warningToast: {
        backgroundColor: tokens.colorPaletteYellowBackground1,
        borderLeft: `4px solid ${tokens.colorPaletteYellowBorder2}`,
    },
    infoToast: {
        backgroundColor: tokens.colorNeutralBackground1,
        borderLeft: `4px solid ${tokens.colorBrandStroke1}`,
    },
    toastContent: {
        display:'flex',
        alignItems:'flex-start',
        gap:'12px',
    },
    icon: {
        fontSize: '24px',
        flexShrink: 0,
    },
    successIcon: {
        color: tokens.colorPaletteGreenForeground2,
    },
    errorIcon: {
        color: tokens.colorPaletteRedForeground2,
    },
    warningIcon: {
        color: tokens.colorPaletteYellowForeground2,
    },
    infoIcon: {
        color: tokens.colorBrandForeground1,
    },
    textContent: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontWeight: 600,
        fontSize: tokens.fontSizeBase400,
        lineHeight: tokens.lineHeightBase400,
        color: tokens.colorNeutralForeground1,
    },
    message: {
        fontSize: tokens.fontSizeBase300,
        lineHeight: tokens.lineHeightBase300,
        color: tokens.colorNeutralForeground2,
        marginTop: '4px',
    },
    dismissButon: {
        minWidth: 'auto',
        padding: '4px',
        marginLeft: '8px',
    },
    progressBar: {
        position:'absolute',
        bottom:0,
        left:0,
        height:'3px',
        backgroundColor:'currentColor',
        opacity: 0.3,
        borderRadius: `0 0 ${tokens.borderRadiusLarge} ${tokens.borderRadiusLarge}`,
        animationName: {
            from: {width: '100%'},
            to: {width: '0%'},
        },
        animationTimingFunction:'linear',
    },
})

export const ToastProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const styles = useStyles();
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback(
        (type: ToastType, message: string, title?: string, duration: number = 3000) => {
            const id = `toast-${Date.now()}-${Math.random()}`;
            const newToast: ToastItem = {id, type, message, title, duration};

            setToasts((prev) => [...prev, newToast]);

            setTimeout(() => {
                dismissToast(id);
            },duration);
        },[]);
    
    const dismissToast = useCallback((id:string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const getDefaultTitle = (type: ToastType): string => {
        switch(type) {
            case 'success': return 'Success !';
            case 'error': return 'Error !';
            case 'warning': return 'Warning!';
            case 'info': return 'Info';
        }
    };

    const getIconComponent = (type: ToastType) => {
        switch(type) {
            case 'success': return CheckmarkCircleFilled;
            case 'error': return ErrorCircleFilled;
            case 'warning': return WarningFilled;
            case 'info': return InfoFilled;
        }
    };

    const getIconClass = (type: ToastType) => {
        switch(type) {
            case 'success': return styles.successIcon;
            case 'error': return styles.errorIcon;
            case 'warning': return styles.warningIcon;
            case 'info': return styles.infoIcon; 
        }
    }

    const getToastClass = (type: ToastType) => {
        switch(type) {
            case 'success': return styles.successToast;
            case 'error': return styles.errorToast;
            case 'warning': return styles.warningToast;
            case 'info': return styles.infoToast; 
        }
    };

    return (
        <ToastContext.Provider value={{showToast, dismissToast}}>
            <div className={styles.toasterContainer}>
                {toasts.map((toast) => {
                    const IconComponent = getIconComponent(toast.type);
                    const iconClass = getIconClass(toast.type);
                    const toastClass = getToastClass(toast.type);

                    return (
                        <div
                            key={toast.id}
                            className={`${styles.toast} ${toastClass}`}
                        >
                            <div className={styles.toastContent}>
                                <IconComponent className={`${styles.icon} ${iconClass}`}/>

                                <div className={styles.textContent}>
                                    <div className={styles.title}>
                                        {toast.title || getDefaultTitle(toast.type)}
                                    </div>
                                    {toast.message && (
                                        <div className={styles.message}>
                                            {toast.message}
                                        </div>
                                    )} 
                                </div>

                                <button
                                    className={styles.dismissButon}
                                    onClick={() => dismissToast(toast.id)}
                                    aria-label="Dismiss"
                                    style= {{
                                        background:'transparent',
                                        border:'none',
                                        cursor:'pointer',
                                        color: tokens.colorNeutralForeground3,
                                        display:'flex',
                                        alignItems:'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <DismissRegular style={{fontSize: 16}}/>
                                </button>
                            </div>

                            <div
                                className={styles.progressBar}
                                style={{ animationDuration: `${toast.duration}ms`}}
                            />
                        </div>
                    )
                })}
            </div>

            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if(!context){
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}