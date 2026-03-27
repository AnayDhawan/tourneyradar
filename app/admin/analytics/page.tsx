import type { Metadata } from 'next';
import AnalyticsDashboardClient from './AnalyticsDashboardClient';

export const metadata: Metadata = {
  title: 'Analytics Dashboard',
  robots: { index: false, follow: false },
};

export default function AnalyticsPage() {
  return <AnalyticsDashboardClient />;
}
