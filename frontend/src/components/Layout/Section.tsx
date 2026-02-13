import React from 'react';
import { makeStyles, tokens, mergeClasses } from '@fluentui/react-components';

const useStyles = makeStyles({
  section: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  sectionHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    marginBottom: tokens.spacingVerticalL,
    '@media (min-width: 768px)': {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  },
  sectionTitleArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
  },
  sectionTitle: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    margin: 0,
  },
  sectionDescription: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground3,
    margin: 0,
  },
  sectionActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: tokens.spacingVerticalS,
    '@media (min-width: 768px)': {
      marginTop: 0,
    },
  },
  sectionContent: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  // Spacing variants
  spacingXS: {
    marginBottom: tokens.spacingVerticalL,
  },
  spacingS: {
    marginBottom: tokens.spacingVerticalXL,
  },
  spacingM: {
    marginBottom: tokens.spacingVerticalXXL,
  },
  spacingL: {
    marginBottom: tokens.spacingVerticalXXXL,
  },
  spacingNone: {
    marginBottom: 0,
  },
  // Background variants
  backgroundDefault: {
    backgroundColor: 'transparent',
  },
  backgroundSubtle: {
    backgroundColor: tokens.colorNeutralBackground2,
    padding: tokens.spacingVerticalL,
    borderRadius: tokens.borderRadiusMedium,
    '@media (min-width: 768px)': {
      padding: tokens.spacingVerticalXL,
    },
  },
  backgroundCard: {
    backgroundColor: tokens.colorNeutralBackground1,
    padding: tokens.spacingVerticalL,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow4,
    '@media (min-width: 768px)': {
      padding: tokens.spacingVerticalXL,
    },
  },
  // Divider
  withDivider: {
    paddingBottom: tokens.spacingVerticalXL,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    marginBottom: tokens.spacingVerticalXL,
  },
});

export type SectionSpacing = 'xs' | 's' | 'm' | 'l' | 'none';
export type SectionBackground = 'default' | 'subtle' | 'card';

export interface SectionProps {
  /**
   * Section title
   */
  title?: string;
  
  /**
   * Section description
   */
  description?: string;
  
  /**
   * Action buttons or controls for the header
   */
  actions?: React.ReactNode;
  
  /**
   * Section content
   */
  children: React.ReactNode;
  
  /**
   * Bottom spacing
   */
  spacing?: SectionSpacing;
  
  /**
   * Background style
   */
  background?: SectionBackground;
  
  /**
   * Add bottom divider
   */
  divider?: boolean;
  
  /**
   * Additional className
   */
  className?: string;
  
  /**
   * Custom styles
   */
  style?: React.CSSProperties;
  
  /**
   * Additional className for content area
   */
  contentClassName?: string;
  
  /**
   * Custom styles for content area
   */
  contentStyle?: React.CSSProperties;
}

/**
 * Section - Organizes content into logical sections
 * 
 * Use for grouping related content with optional titles,
 * descriptions, and actions. Supports various spacing and
 * background options.
 * 
 * @example
 * ```tsx
 * <Section
 *   title="Recent Activity"
 *   description="Your recent bookings and activity"
 *   actions={<Button>View All</Button>}
 *   spacing="m"
 * >
 *   <ContentGrid columns="2">
 *     <Card>...</Card>
 *     <Card>...</Card>
 *   </ContentGrid>
 * </Section>
 * ```
 */
export const Section: React.FC<SectionProps> = ({
  title,
  description,
  actions,
  children,
  spacing = 's',
  background = 'default',
  divider = false,
  className,
  style,
  contentClassName,
  contentStyle,
}) => {
  const styles = useStyles();

  const sectionClasses = mergeClasses(
    styles.section,
    spacing === 'xs' && styles.spacingXS,
    spacing === 's' && styles.spacingS,
    spacing === 'm' && styles.spacingM,
    spacing === 'l' && styles.spacingL,
    spacing === 'none' && styles.spacingNone,
    background === 'default' && styles.backgroundDefault,
    background === 'subtle' && styles.backgroundSubtle,
    background === 'card' && styles.backgroundCard,
    divider && styles.withDivider,
    className
  );

  const contentClasses = mergeClasses(styles.sectionContent, contentClassName);

  return (
    <section className={sectionClasses} style={style}>
      {(title || description || actions) && (
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleArea}>
            {title && <h2 className={styles.sectionTitle}>{title}</h2>}
            {description && <p className={styles.sectionDescription}>{description}</p>}
          </div>
          {actions && <div className={styles.sectionActions}>{actions}</div>}
        </div>
      )}
      <div className={contentClasses} style={contentStyle}>
        {children}
      </div>
    </section>
  );
};

export default Section;