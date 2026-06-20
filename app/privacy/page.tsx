import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Project Fit',
  description: 'How Project Fit handles profile, order, and delivery information.',
};

export default function PrivacyPage() {
  return (
    <main style={{ padding: '120px 24px 80px' }}>
      <section className="container" style={{ maxWidth: 860 }}>
        <p className="section-label">Legal</p>
        <h1 className="section-title">Privacy Policy</h1>
        <p className="section-subtitle">
          This policy explains what information Project Fit collects and how it is used for meal planning,
          delivery, payments, and support.
        </p>

        <div style={{ display: 'grid', gap: 24, color: 'var(--text-secondary)' }}>
          <section>
            <h2>Information We Collect</h2>
            <p>
              We collect account details, WhatsApp number, health profile details, delivery address, order
              history, feedback, and optional health reports that you choose to upload.
            </p>
          </section>
          <section>
            <h2>How We Use It</h2>
            <p>
              Your information is used to personalize meal recommendations, process orders, coordinate delivery,
              send WhatsApp updates, and support customer service.
            </p>
          </section>
          <section>
            <h2>Sharing</h2>
            <p>
              We use your details only for Project Fit operations and required service providers such as
              authentication, database hosting, and WhatsApp messaging.
            </p>
          </section>
          <section>
            <h2>Updates</h2>
            <p>
              You can update profile and delivery details from your Project Fit profile page. Contact Project Fit
              support for account or data requests.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
