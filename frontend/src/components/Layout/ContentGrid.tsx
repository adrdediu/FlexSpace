import React from 'react';
import { makeStyles, tokens, mergeClasses } from '@fluentui/react-components';

const useStyles = makeStyles({
  grid: {
    display: 'grid',
    gap: tokens.spacingVerticalL,
    width: '100%',
  },
  // Single column (mobile default)
  grid1Col: {
    gridTemplateColumns: '1fr',
  },
  // Two columns
  grid2Col: {
    gridTemplateColumns: 'repeat(1, 1fr)',
    '@media (min-width: 768px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
  },
  // Three columns
  grid3Col: {
    gridTemplateColumns: 'repeat(1, 1fr)',
    '@media (min-width: 768px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
    '@media (min-width: 1024px)': {
      gridTemplateColumns: 'repeat(3, 1fr)',
    },
  },
  // Four columns
  grid4Col: {
    gridTemplateColumns: 'repeat(1, 1fr)',
    '@media (min-width: 768px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
    '@media (min-width: 1024px)': {
      gridTemplateColumns: 'repeat(4, 1fr)',
    },
  },
  // Auto fit (as many as will fit)
  gridAutoFit: {
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  },
  // Auto fill
  gridAutoFill: {
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  },
  // Sidebar layout (1/3 - 2/3)
  gridSidebar: {
    gridTemplateColumns: '1fr',
    '@media (min-width: 1024px)': {
      gridTemplateColumns: '300px 1fr',
    },
  },
  // Sidebar layout (2/3 - 1/3)
  gridSidebarRight: {
    gridTemplateColumns: '1fr',
    '@media (min-width: 1024px)': {
      gridTemplateColumns: '1fr 300px',
    },
  },
  // Custom gap sizes
  gapXS: {
    gap: tokens.spacingVerticalS,
  },
  gapS: {
    gap: tokens.spacingVerticalM,
  },
  gapM: {
    gap: tokens.spacingVerticalL,
  },
  gapL: {
    gap: tokens.spacingVerticalXL,
  },
  gapXL: {
    gap: tokens.spacingVerticalXXL,
  },
});

export type GridColumns = '1' | '2' | '3' | '4' | 'auto-fit' | 'auto-fill' | 'sidebar' | 'sidebar-right';
export type GridGap = 'xs' | 's' | 'm' | 'l' | 'xl';

export interface ContentGridProps {
  /**
   * Number of columns or layout type
   */
  columns?: GridColumns;
  
  /**
   * Gap size between grid items
   */
  gap?: GridGap;
  
  /**
   * Custom grid template columns (overrides columns prop)
   */
  gridTemplateColumns?: string;
  
  /**
   * Grid items
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
 * ContentGrid - Responsive grid layout component
 * 
 * Automatically adapts to screen size with sensible breakpoints.
 * Use for creating card grids, dashboard layouts, and complex UIs.
 * 
 * @example
 * ```tsx
 * <ContentGrid columns="3" gap="m">
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </ContentGrid>
 * ```
 */
export const ContentGrid: React.FC<ContentGridProps> = ({
  columns = '1',
  gap = 'm',
  gridTemplateColumns,
  children,
  className,
  style,
}) => {
  const styles = useStyles();

  const columnClass = {
    '1': styles.grid1Col,
    '2': styles.grid2Col,
    '3': styles.grid3Col,
    '4': styles.grid4Col,
    'auto-fit': styles.gridAutoFit,
    'auto-fill': styles.gridAutoFill,
    'sidebar': styles.gridSidebar,
    'sidebar-right': styles.gridSidebarRight,
  }[columns];

  const gapClass = {
    'xs': styles.gapXS,
    's': styles.gapS,
    'm': styles.gapM,
    'l': styles.gapL,
    'xl': styles.gapXL,
  }[gap];

  const classes = mergeClasses(
    styles.grid,
    columnClass,
    gapClass,
    className
  );

  const finalStyle = gridTemplateColumns
    ? { ...style, gridTemplateColumns }
    : style;

  return (
    <div className={classes} style={finalStyle}>
      {children}
    </div>
  );
};

export default ContentGrid;