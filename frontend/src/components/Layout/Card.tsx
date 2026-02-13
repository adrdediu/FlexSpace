import React from 'react';
import { makeStyles, tokens, mergeClasses } from '@fluentui/react-components';

const useStyles = makeStyles({
  card: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow4,
    overflow: 'hidden',
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
  },
  cardInteractive: {
    cursor: 'pointer',
    ':hover': {
      boxShadow: tokens.shadow8,
      transform: 'translateY(-2px)',
    },
    ':active': {
      transform: 'translateY(0)',
    },
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalM,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  cardHeaderNoBorder: {
    borderBottom: 'none',
    paddingBottom: tokens.spacingVerticalL,
  },
  cardTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    margin: 0,
  },
  cardSubtitle: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginTop: tokens.spacingVerticalXXS,
  },
  cardTitleSection: {
    display: 'flex',
    flexDirection: 'column',
  },
  cardActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center',
  },
  cardBody: {
    padding: tokens.spacingVerticalL,
    flex: 1,
  },
  cardBodyNoPadding: {
    padding: 0,
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacingVerticalL,
    paddingTop: tokens.spacingVerticalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  cardFooterNoBorder: {
    borderTop: 'none',
    paddingTop: tokens.spacingVerticalL,
  },
  // Variants
  cardElevated: {
    boxShadow: tokens.shadow8,
  },
  cardSubtle: {
    boxShadow: tokens.shadow2,
  },
  cardOutlined: {
    boxShadow: 'none',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  cardFilled: {
    backgroundColor: tokens.colorNeutralBackground3,
    boxShadow: 'none',
  },
  // Padding variants
  paddingS: {
    padding: tokens.spacingVerticalM,
  },
  paddingM: {
    padding: tokens.spacingVerticalL,
  },
  paddingL: {
    padding: tokens.spacingVerticalXL,
  },
  paddingNone: {
    padding: 0,
  },
});

export type CardVariant = 'default' | 'elevated' | 'subtle' | 'outlined' | 'filled';
export type CardPadding = 's' | 'm' | 'l' | 'none';

export interface CardProps {
  /**
   * Card title
   */
  title?: string;
  
  /**
   * Card subtitle or description
   */
  subtitle?: string;
  
  /**
   * Action buttons or controls for the header
   */
  actions?: React.ReactNode;
  
  /**
   * Footer content
   */
  footer?: React.ReactNode;
  
  /**
   * Main content
   */
  children: React.ReactNode;
  
  /**
   * Visual variant
   */
  variant?: CardVariant;
  
  /**
   * Padding size for body
   */
  padding?: CardPadding;
  
  /**
   * Remove padding from body
   */
  noPadding?: boolean;
  
  /**
   * Remove border from header
   */
  noHeaderBorder?: boolean;
  
  /**
   * Remove border from footer
   */
  noFooterBorder?: boolean;
  
  /**
   * Make card clickable
   */
  interactive?: boolean;
  
  /**
   * Click handler (makes card interactive)
   */
  onClick?: () => void;
  
  /**
   * Additional className
   */
  className?: string;
  
  /**
   * Custom styles
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
 * Card - Flexible content container component
 * 
 * Provides consistent styling for content blocks with optional
 * header, footer, and various visual variants.
 * 
 * @example
 * ```tsx
 * <Card
 *   title="Statistics"
 *   subtitle="Last 30 days"
 *   actions={<Button>View All</Button>}
 *   footer={<Text>Updated 5 minutes ago</Text>}
 * >
 *   <YourContent />
 * </Card>
 * ```
 */
export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  actions,
  footer,
  children,
  variant = 'default',
  padding = 'm',
  noPadding = false,
  noHeaderBorder = false,
  noFooterBorder = false,
  interactive = false,
  onClick,
  className,
  style,
  bodyClassName,
  bodyStyle,
}) => {
  const styles = useStyles();

  const isInteractive = interactive || !!onClick;

  const cardClasses = mergeClasses(
    styles.card,
    variant === 'elevated' && styles.cardElevated,
    variant === 'subtle' && styles.cardSubtle,
    variant === 'outlined' && styles.cardOutlined,
    variant === 'filled' && styles.cardFilled,
    isInteractive && styles.cardInteractive,
    className
  );

  const bodyClasses = mergeClasses(
    styles.cardBody,
    noPadding && styles.cardBodyNoPadding,
    !noPadding && padding === 's' && styles.paddingS,
    !noPadding && padding === 'm' && styles.paddingM,
    !noPadding && padding === 'l' && styles.paddingL,
    bodyClassName
  );

  const headerClasses = mergeClasses(
    styles.cardHeader,
    noHeaderBorder && styles.cardHeaderNoBorder
  );

  const footerClasses = mergeClasses(
    styles.cardFooter,
    noFooterBorder && styles.cardFooterNoBorder
  );

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={cardClasses}
      style={style}
      onClick={isInteractive ? handleClick : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
    >
      {(title || subtitle || actions) && (
        <div className={headerClasses}>
          <div className={styles.cardTitleSection}>
            {title && <h3 className={styles.cardTitle}>{title}</h3>}
            {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.cardActions}>{actions}</div>}
        </div>
      )}

      <div className={bodyClasses} style={bodyStyle}>
        {children}
      </div>

      {footer && <div className={footerClasses}>{footer}</div>}
    </div>
  );
};

export default Card;