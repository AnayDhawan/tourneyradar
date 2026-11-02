import type { Metadata } from 'next';
import BaseLayout from '@/components/BaseLayout';
import SubmitForm from './SubmitForm';

export const metadata: Metadata = {
  title: 'Submit a Tournament',
  description:
    'Organizing a chess tournament that is not listed on Chess-Results.com? Submit it for review and it can appear on the TourneyRadar map.',
  alternates: { canonical: 'https://www.tourneyradar.com/submit' },
};

export default function SubmitPage() {
  return (
    <BaseLayout
      showHero
      heroTitle={<>Submit a <span className="highlight">Tournament</span></>}
      heroDescription="For events that are not on Chess-Results.com. Submissions are reviewed by hand before they are published."
    >
      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: '700px' }}>
          <SubmitForm />
        </div>
      </section>
    </BaseLayout>
  );
}
