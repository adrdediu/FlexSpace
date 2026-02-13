import React from 'react';
import { makeStyles, mergeClasses } from '@fluentui/react-components';

const useStyles = makeStyles({
  panelGrid: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
  },
});

export interface FloatingPanelGridProps {
  /**
   * Panel children (FloatingPanel components)
   */
  children: React.ReactNode;
  
  /**
   * Additional className
   */
  className?: string;
  
  /**
   * Custom styles
   */
  style?: React.CSSProperties;
}

/**
 * FloatingPanelGrid - Container for organizing multiple FloatingPanel components
 * 
 * Provides the coordinate system for absolutely positioned panels while
 * allowing globe interaction where panels don't exist.
 * 
 * @example
 * ```tsx
 * <FloatingPanelGrid>
 *   <FloatingPanel position="top-left" size="medium">
 *     <Stats />
 *   </FloatingPanel>
 *   <FloatingPanel position="bottom-right" size="small">
 *     <QuickActions />
 *   </FloatingPanel>
 * </FloatingPanelGrid>
 * ```
 */
export const FloatingPanelGrid: React.FC<FloatingPanelGridProps> = ({
  children,
  className,
  style,
}) => {
  const styles = useStyles();

  return (
    <div className={mergeClasses(styles.panelGrid, className)} style={style}>
      {children}
    </div>
  );
};

export default FloatingPanelGrid;