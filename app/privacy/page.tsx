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
          This policy explains how Project Fit Vizag collects, uses, stores, and protects information for
          account access, health-profile personalization, orders, delivery, payments, and support.
        </p>

        <div style={{ display: 'grid', gap: 24, color: 'var(--text-secondary)' }}>
          <section>
            <h2>Information we collect</h2>
            <p>
              We collect the details you provide when creating or using an account, including name, email,
              phone or WhatsApp number, age, gender, height, weight, dietary goals, health notes, allergies,
              delivery address, order history, payment-reference details, feedback, and optional health
              reports that you choose to upload.
            </p>
          </section>
          <section>
            <h2>How we use information</h2>
            <p>
              We use this information to create and protect your account, personalize meal recommendations,
              prepare orders, coordinate delivery, confirm payments, send transactional WhatsApp and email
              updates, respond to support requests, operate the chef dashboard, prevent fraud, and improve
              Project Fit services.
            </p>
          </section>
          <section>
            <h2>Service providers</h2>
            <p>
              We share information only where needed to run Project Fit, including authentication, database
              hosting, file storage, email, WhatsApp Cloud API messaging, payment coordination, analytics,
              and delivery operations. We do not sell customer personal information.
            </p>
          </section>
          <section>
            <h2>Health and report data</h2>
            <p>
              Health-profile details and uploaded reports are used to guide meal-plan recommendations and
              kitchen operations. Project Fit food plans are not a replacement for medical diagnosis or
              treatment from a qualified professional.
            </p>
          </section>
          <section>
            <h2>Retention and security</h2>
            <p>
              We keep information for as long as needed to provide services, maintain records, meet legal or
              operational obligations, and resolve disputes. We use access controls, server-side validation,
              protected admin routes, and trusted service providers to reduce unauthorized access risk.
            </p>
          </section>
          <section>
            <h2>Your choices</h2>
            <p>
              You can update profile and delivery details from your Project Fit profile page. You can opt out
              of promotional WhatsApp messages where supported, but transactional messages may still be sent
              for active orders. Contact Project Fit support for account, correction, deletion, or data-access
              requests.
            </p>
          </section>
          <section>
            <h2>Updates to this policy</h2>
            <p>
              We may update this policy when our services, providers, or legal requirements change. The latest
              version posted on this page applies from the date it is published.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
