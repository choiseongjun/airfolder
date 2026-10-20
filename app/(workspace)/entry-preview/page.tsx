import EntryLanding from '../entry-landing';

export const metadata = { robots: { index: false, follow: false } };

// Always shows the signed-out landing, even when signed in, for reviewing the design.
export default function EntryPreviewPage() {
  return <EntryLanding/>;
}
