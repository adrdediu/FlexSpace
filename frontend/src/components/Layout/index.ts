/**
 * Layout Components
 * 
 * A collection of modular, responsive layout components for building
 * consistent UIs across Dashboard, Admin, and My Bookings sections.
 */

export { PageContainer } from './PageContainer';
export type { PageContainerProps } from './PageContainer';

export { ContentGrid } from './ContentGrid';
export type { ContentGridProps, GridColumns, GridGap } from './ContentGrid';

export { Card } from './Card';
export type { CardProps, CardVariant, CardPadding } from './Card';

export { Section } from './Section';
export type { SectionProps, SectionSpacing, SectionBackground } from './Section';

export { FloatingPanel } from './FloatingPanel';
export type { FloatingPanelProps, PanelPosition, PanelSize, PanelOpacity } from './FloatingPanel';

export { FloatingPanelGrid } from './FloatingPanelGrid';
export type { FloatingPanelGridProps } from './FloatingPanelGrid';

export { default as GlobalLayout } from './GlobalLayout';