import React from 'react';
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  makeStyles,
  tokens,
  mergeClasses,
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  dialogSurface: {
    maxWidth: '90vw',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
  },
  dialogSurfaceSmall: {
    width: '400px',
    '@media (max-width: 768px)': {
      width: '90vw',
    },
  },
  dialogSurfaceMedium: {
    width: '600px',
    '@media (max-width: 768px)': {
      width: '90vw',
    },
  },
  dialogSurfaceLarge: {
    width: '800px',
    '@media (max-width: 768px)': {
      width: '90vw',
    },
  },
  dialogSurfaceExtraLarge: {
    width: '1000px',
    '@media (max-width: 1100px)': {
      width: '90vw',
    },
  },
  dialogSurfaceFull: {
    width: '90vw',
  },
  dialogBody: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  dialogHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: tokens.spacingVerticalM,
  },
  dialogTitle: {
    margin: 0,
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  dialogSubtitle: {
    margin: 0,
    marginTop: tokens.spacingVerticalXS,
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground3,
  },
  dialogContent: {
    flex: 1,
    overflow: 'auto',
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
  },
  dialogContentNoPadding: {
    padding: 0,
  },
  dialogActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    justifyContent: 'flex-end',
    paddingTop: tokens.spacingVerticalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  dialogActionsNoSeparator: {
    borderTop: 'none',
  },
  closeButton: {
    minWidth: 'auto',
  },
});

export type ModalSize = 'small' | 'medium' | 'large' | 'xl' | 'full';

export interface ModalAction {
  /**
   * Action button label
   */
  label: string;
  
  /**
   * Click handler
   */
  onClick: () => void;
  
  /**
   * Button appearance
   */
  appearance?: 'primary' | 'secondary' | 'subtle' | 'transparent';
  
  /**
   * Disable the button
   */
  disabled?: boolean;
  
  /**
   * Show loading state
   */
  loading?: boolean;
  
  /**
   * Icon for the button
   */
  icon?: React.ReactElement;
}

export interface ModalProps {
  /**
   * Modal open state
   */
  open: boolean;
  
  /**
   * Close handler
   */
  onClose: () => void;
  
  /**
   * Modal title
   */
  title?: string;
  
  /**
   * Modal subtitle/description
   */
  subtitle?: string;
  
  /**
   * Modal content
   */
  children: React.ReactNode;
  
  /**
   * Modal size
   */
  size?: ModalSize;
  
  /**
   * Action buttons at the bottom
   */
  actions?: ModalAction[];
  
  /**
   * Hide the close X button
   */
  noCloseButton?: boolean;
  
  /**
   * Remove padding from content
   */
  noPadding?: boolean;
  
  /**
   * Remove separator above actions
   */
  noActionsSeparator?: boolean;
  
  /**
   * Prevent closing on backdrop click
   */
  preventBackdropClose?: boolean;
  
  /**
   * Prevent closing on Escape key
   */
  preventEscapeClose?: boolean;
  
  /**
   * Additional className for surface
   */
  className?: string;
  
  /**
   * Custom styles for surface
   */
  style?: React.CSSProperties;
  
  /**
   * Additional className for content
   */
  contentClassName?: string;
  
  /**
   * Custom styles for content
   */
  contentStyle?: React.CSSProperties;
}

/**
 * Modal - A generic, reusable modal dialog component
 * 
 * Provides a flexible modal with customizable size, actions, and content.
 * Built on top of Fluent UI Dialog component.
 * 
 * @example
 * ```tsx
 * <Modal
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Confirm Action"
 *   subtitle="Are you sure you want to proceed?"
 *   size="small"
 *   actions={[
 *     { label: 'Cancel', onClick: () => setIsOpen(false), appearance: 'secondary' },
 *     { label: 'Confirm', onClick: handleConfirm, appearance: 'primary' }
 *   ]}
 * >
 *   <p>This action cannot be undone.</p>
 * </Modal>
 * ```
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = 'medium',
  actions,
  noCloseButton = false,
  noPadding = false,
  noActionsSeparator = false,
  preventBackdropClose = false,
  preventEscapeClose = false,
  className,
  style,
  contentClassName,
  contentStyle,
}) => {
  const styles = useStyles();

  const sizeClass = {
    'small': styles.dialogSurfaceSmall,
    'medium': styles.dialogSurfaceMedium,
    'large': styles.dialogSurfaceLarge,
    'xl': styles.dialogSurfaceExtraLarge,
    'full': styles.dialogSurfaceFull,
  }[size];

  const surfaceClassName = mergeClasses(
    styles.dialogSurface,
    sizeClass,
    className
  );

  const contentClasses = mergeClasses(
    styles.dialogContent,
    noPadding && styles.dialogContentNoPadding,
    contentClassName
  );

  const actionsClasses = mergeClasses(
    styles.dialogActions,
    noActionsSeparator && styles.dialogActionsNoSeparator
  );

  const handleOpenChange = (_event: any, data: { open: boolean }) => {
    if (!data.open) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      modalType="modal"
    >
      <DialogSurface className={surfaceClassName} style={style}>
        <DialogBody className={styles.dialogBody}>
          {(title || subtitle || !noCloseButton) && (
            <div className={styles.dialogHeader}>
              <div style={{ flex: 1 }}>
                {title && <DialogTitle className={styles.dialogTitle}>{title}</DialogTitle>}
                {subtitle && <p className={styles.dialogSubtitle}>{subtitle}</p>}
              </div>
              {!noCloseButton && (
                <Button
                  appearance="subtle"
                  icon={<Dismiss24Regular />}
                  onClick={onClose}
                  className={styles.closeButton}
                  aria-label="Close"
                />
              )}
            </div>
          )}

          <DialogContent className={contentClasses} style={contentStyle}>
            {children}
          </DialogContent>

          {actions && actions.length > 0 && (
            <DialogActions className={actionsClasses}>
              {actions.map((action, index) => (
                <Button
                  key={index}
                  appearance={action.appearance || 'secondary'}
                  onClick={action.onClick}
                  disabled={action.disabled || action.loading}
                  icon={action.icon}
                >
                  {action.loading ? 'Loading...' : action.label}
                </Button>
              ))}
            </DialogActions>
          )}
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default Modal;