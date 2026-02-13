import React from 'react';
import { makeStyles, tokens, mergeClasses } from '@fluentui/react-components';

const useStyles = makeStyles({
  pageContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground3,
    overflow: 'hidden',
  },
  pageHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    pointerEvents: 'auto',
    '@media (min-width: 768px)': {
      paddingLeft: tokens.spacingHorizontalXXL,
      paddingRight: tokens.spacingHorizontalXXL,
      paddingTop: tokens.spacingVerticalXL,
      paddingBottom: tokens.spacingVerticalXL,
    },
  },
  headerTop: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    '@media (min-width: 768px)': {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  },
  headerTitleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  headerTitle: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    margin: 0,
    '@media (min-width: 768px)': {
      fontSize: tokens.fontSizeBase600,
    },
  },
  headerSubtitle: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground3,
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center',
  },
  headerTabs: {
    marginTop: tokens.spacingVerticalS,
  },
  pageContent: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'auto',
    padding: tokens.spacingVerticalL,
    pointerEvents: 'auto',
    '@media (min-width: 768px)': {
      paddingLeft: tokens.spacingHorizontalXXL,
      paddingRight: tokens.spacingHorizontalXXL,
      paddingTop: tokens.spacingVerticalXL,
      paddingBottom: tokens.spacingVerticalXL,
    },
  },
  pageContentNoPadding: {
    padding: 0,
  },
  pageContentCustomPadding: {
    // Override with custom padding via style prop
  },
});

export interface PageContainerProps {
  /**
   * Page title displayed in the header
   */
  title?: string;
  
  /**
   * Optional subtitle or description
   */
  subtitle?: string;
  
  /**
   * Action buttons or controls for the header
   */
  actions?: React.ReactNode;
  
  /**
   * Optional tabs or navigation within the page
   */
  tabs?: React.ReactNode;
  
  /**
   * Main content of the page
   */
  children: React.ReactNode;
  
  /**
   * Remove default padding from content area
   */
  noPadding?: boolean;
  
  /**
   * Custom padding for content area (overrides default)
   */
  customPadding?: string;
  
  /**
   * Hide the header completely
   */
  noHeader?: boolean;
  
  /**
   * Additional className for the container
   */
  className?: string;
  
  /**
   * Additional className for the content area
   */
  contentClassName?: string;
  
  /**
   * Custom styles for the container
   */
  style?: React.CSSProperties;
  
  /**
   * Custom styles for the content area
   */
  contentStyle?: React.CSSProperties;
}

/**
 * PageContainer - A flexible, responsive container for all major sections
 * 
 * Provides consistent layout structure with:
 * - Responsive header with title, subtitle, and actions
 * - Optional tabs/navigation
 * - Scrollable content area
 * - Mobile-friendly spacing and layout
 * 
 * @example
 * ```tsx
 * <PageContainer
 *   title="Dashboard"
 *   subtitle="Manage your workspace"
 *   actions={<Button>Add Location</Button>}
 * >
 *   <YourContent />
 * </PageContainer>
 * ```
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  title,
  subtitle,
  actions,
  tabs,
  children,
  noPadding = false,
  customPadding,
  noHeader = false,
  className,
  contentClassName,
  style,
  contentStyle,
}) => {
  const styles = useStyles();

  const contentClasses = mergeClasses(
    styles.pageContent,
    noPadding && styles.pageContentNoPadding,
    customPadding && styles.pageContentCustomPadding,
    contentClassName
  );

  const finalContentStyle = customPadding
    ? { ...contentStyle, padding: customPadding }
    : contentStyle;

  return (
    <div className={mergeClasses(styles.pageContainer, className)} style={style}>
      {!noHeader && (title || subtitle || actions || tabs) && (
        <div className={styles.pageHeader}>
          {(title || subtitle || actions) && (
            <div className={styles.headerTop}>
              {(title || subtitle) && (
                <div className={styles.headerTitleSection}>
                  {title && <h1 className={styles.headerTitle}>{title}</h1>}
                  {subtitle && <p className={styles.headerSubtitle}>{subtitle}</p>}
                </div>
              )}
              {actions && <div className={styles.headerActions}>{actions}</div>}
            </div>
          )}
          {tabs && <div className={styles.headerTabs}>{tabs}</div>}
        </div>
      )}
      <div className={contentClasses} style={finalContentStyle}>
        {children}
      </div>
    </div>
  );
};

export default PageContainer;