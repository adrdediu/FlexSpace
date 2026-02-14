import React from 'react';
import { makeStyles, tokens, mergeClasses } from '@fluentui/react-components';

const useStyles = makeStyles({
  floatingPanel: {
    position: 'absolute',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow16,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'transform 0.3s ease, opacity 0.3s ease',
  },
  // Position variants
  positionTopLeft: {
    top: tokens.spacingVerticalXL,
    left: tokens.spacingHorizontalXL,
  },
  positionTopRight: {
    top: tokens.spacingVerticalXL,
    right: tokens.spacingHorizontalXL,
  },
  positionBottomLeft: {
    bottom: tokens.spacingVerticalXL,
    left: tokens.spacingHorizontalXL,
  },
  positionBottomRight: {
    bottom: tokens.spacingVerticalXL,
    right: tokens.spacingHorizontalXL,
  },
  positionCenter: {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  },
  positionCenterLeft: {
    top: '50%',
    left: tokens.spacingHorizontalXL,
    transform: 'translateY(-50%)',
  },
  positionCenterRight: {
    top: '50%',
    right: tokens.spacingHorizontalXL,
    transform: 'translateY(-50%)',
  },
  // Size variants
  sizeSmall: {
    width: '320px',
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: 'calc(100vh - 128px - 64px)',
  },
  sizeMedium: {
    width: '480px',
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: 'calc(100vh - 128px - 64px)',
  },
  sizeLarge: {
    width: '640px',
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: 'calc(100vh - 128px - 64px)',
  },
  sizeExtraLarge: {
    width: '800px',
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: 'calc(100vh - 128px - 64px)',
  },
  sizeFull: {
    width: 'calc(100vw - 64px)',
    maxWidth: '1200px',
    maxHeight: 'calc(100vh - 128px - 64px)',
  },
  sizeCustom: {
    // Will be overridden by style prop
  },
  // Mobile small
  sizeSmallMobile: {
    '@media (max-width: 768px)': {
      width: 'calc(100vw - 32px)',
      maxHeight: 'calc(100vh - 96px - 64px)',
    },
  },
  // Mobile medium
  sizeMediumMobile: {
    '@media (max-width: 768px)': {
      width: 'calc(100vw - 32px)',
      maxHeight: 'calc(100vh - 96px - 64px)',
    },
  },
  // Mobile large
  sizeLargeMobile: {
    '@media (max-width: 768px)': {
      width: 'calc(100vw - 32px)',
      maxHeight: 'calc(100vh - 96px - 64px)',
    },
  },
  // Mobile extra large
  sizeExtraLargeMobile: {
    '@media (max-width: 768px)': {
      width: 'calc(100vw - 32px)',
      maxHeight: 'calc(100vh - 96px - 64px)',
    },
  },
  // Mobile full
  sizeFullMobile: {
    '@media (max-width: 768px)': {
      width: 'calc(100vw - 32px)',
      maxHeight: 'calc(100vh - 96px - 64px)',
    },
  },
  // Position mobile overrides
  positionTopLeftMobile: {
    '@media (max-width: 768px)': {
      top: tokens.spacingVerticalL,
      left: tokens.spacingHorizontalL,
    },
  },
  positionTopRightMobile: {
    '@media (max-width: 768px)': {
      top: tokens.spacingVerticalL,
      right: tokens.spacingHorizontalL,
    },
  },
  positionBottomLeftMobile: {
    '@media (max-width: 768px)': {
      bottom: tokens.spacingVerticalL,
      left: tokens.spacingHorizontalL,
    },
  },
  positionBottomRightMobile: {
    '@media (max-width: 768px)': {
      bottom: tokens.spacingVerticalL,
      right: tokens.spacingHorizontalL,
    },
  },
  positionCenterLeftMobile: {
    '@media (max-width: 768px)': {
      left: tokens.spacingHorizontalL,
    },
  },
  positionCenterRightMobile: {
    '@media (max-width: 768px)': {
      right: tokens.spacingHorizontalL,
    },
  },
  // Opacity variants - using tokens for proper theme support
  opacitySolid: {
    backgroundColor: tokens.colorNeutralBackground1,
  },
  opacityGlass: {
    backgroundColor: tokens.colorNeutralBackground1,
    opacity: 0.95,
  },
  opacityTranslucent: {
    backgroundColor: tokens.colorNeutralBackground1,
    opacity: 0.85,
  },
  // Content
  panelHeader: {
    padding: tokens.spacingVerticalL,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelHeaderNoSeparator: {
    borderBottom: 'none',
  },
  panelTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    margin: 0,
  },
  panelActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center',
  },
  panelBody: {
    flex: 1,
    overflow: 'auto',
    padding: tokens.spacingVerticalL,
    minHeight: '200px',
  },
  panelBodyNoPadding: {
    padding: 0,
  },
  panelFooter: {
    padding: tokens.spacingVerticalL,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: tokens.spacingHorizontalS,
  },
  panelFooterNoSeparator: {
    borderTop: 'none',
  },
});

export type PanelPosition = 
  | 'top-left' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-right' 
  | 'center' 
  | 'center-left' 
  | 'center-right';

export type PanelSize = 'small' | 'medium' | 'large' | 'xl' | 'full' | 'custom';
export type PanelOpacity = 'solid' | 'glass' | 'translucent';

export interface FloatingPanelProps {
  /**
   * Panel title
   */
  title?: string;
  
  /**
   * Action buttons or controls for the header
   */
  actions?: React.ReactNode;
  
  /**
   * Footer content (buttons, etc.)
   */
  footer?: React.ReactNode;
  
  /**
   * Main content
   */
  children: React.ReactNode;
  
  /**
   * Panel position
   */
  position?: PanelPosition;
  
  /**
   * Panel size
   */
  size?: PanelSize;
  
  /**
   * Background opacity style
   */
  opacity?: PanelOpacity;
  
  /**
   * Remove padding from body
   */
  noPadding?: boolean;
  
  /**
   * Remove separator from header
   */
  noHeaderSeparator?: boolean;
  
  /**
   * Remove separator from footer
   */
  noFooterSeparator?: boolean;
  
  /**
   * Additional className
   */
  className?: string;
  
  /**
   * Custom styles (use for custom size)
   */
  style?: React.CSSProperties;
  
  /**
   * Additional className for body
   */
  bodyClassName?: string;
  
  /**
   * Custom styles for body
   */
  bodyStyle?: React.CSSProperties;
}

/**
 * FloatingPanel - A floating panel that overlays the globe background
 * 
 * Designed to work with the interactive 3D globe, providing a glass-morphism
 * effect with backdrop blur.
 * 
 * @example
 * ```tsx
 * <FloatingPanel
 *   title="Quick Stats"
 *   position="top-left"
 *   size="medium"
 *   opacity="glass"
 * >
 *   <YourContent />
 * </FloatingPanel>
 * ```
 */
export const FloatingPanel: React.FC<FloatingPanelProps> = ({
  title,
  actions,
  footer,
  children,
  position = 'top-left',
  size = 'medium',
  opacity = 'glass',
  noPadding = false,
  noHeaderSeparator = false,
  noFooterSeparator = false,
  className,
  style,
  bodyClassName,
  bodyStyle,
}) => {
  const styles = useStyles();

  const positionClass = {
    'top-left': styles.positionTopLeft,
    'top-right': styles.positionTopRight,
    'bottom-left': styles.positionBottomLeft,
    'bottom-right': styles.positionBottomRight,
    'center': styles.positionCenter,
    'center-left': styles.positionCenterLeft,
    'center-right': styles.positionCenterRight,
  }[position];

  const sizeClass = {
    'small': styles.sizeSmall,
    'medium': styles.sizeMedium,
    'large': styles.sizeLarge,
    'xl': styles.sizeExtraLarge,
    'full': styles.sizeFull,
    'custom': styles.sizeCustom,
  }[size];

  const opacityClass = {
    'solid': styles.opacitySolid,
    'glass': styles.opacityGlass,
    'translucent': styles.opacityTranslucent,
  }[opacity];

  const panelClasses = mergeClasses(
    styles.floatingPanel,
    positionClass,
    sizeClass,
    opacityClass,
    // Mobile position overrides
    position === 'top-left' && styles.positionTopLeftMobile,
    position === 'top-right' && styles.positionTopRightMobile,
    position === 'bottom-left' && styles.positionBottomLeftMobile,
    position === 'bottom-right' && styles.positionBottomRightMobile,
    position === 'center-left' && styles.positionCenterLeftMobile,
    position === 'center-right' && styles.positionCenterRightMobile,
    // Mobile size overrides
    size === 'small' && styles.sizeSmallMobile,
    size === 'medium' && styles.sizeMediumMobile,
    size === 'large' && styles.sizeLargeMobile,
    size === 'xl' && styles.sizeExtraLargeMobile,
    size === 'full' && styles.sizeFullMobile,
    className
  );

  const bodyClasses = mergeClasses(
    styles.panelBody,
    noPadding && styles.panelBodyNoPadding,
    bodyClassName
  );

  const headerClasses = mergeClasses(
    styles.panelHeader,
    noHeaderSeparator && styles.panelHeaderNoSeparator
  );

  const footerClasses = mergeClasses(
    styles.panelFooter,
    noFooterSeparator && styles.panelFooterNoSeparator
  );

  return (
    <div className={panelClasses} style={style}>
      {(title || actions) && (
        <div className={headerClasses}>
          {title && <h3 className={styles.panelTitle}>{title}</h3>}
          {actions && <div className={styles.panelActions}>{actions}</div>}
        </div>
      )}

      <div className={bodyClasses} style={bodyStyle}>
        {children}
      </div>

      {footer && (
        <div className={footerClasses}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default FloatingPanel;