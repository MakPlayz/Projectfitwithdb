import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions | Project Fit',
  description: 'Project Fit subscription and delivery terms.',
};

export default function TermsPage() {
  return (
    <main style={{ padding: '120px 24px 80px' }}>
      <section className="container" style={{ maxWidth: 860 }}>
        <p className="section-label">Legal</p>
        <h1 className="section-title">Terms & Conditions</h1>
        <p className="section-subtitle">
          These terms explain how Project Fit meal plans, samples, payments, and delivery support work.
        </p>

        <div style={{ display: 'grid', gap: 24, color: 'var(--text-secondary)' }}>
          <section>
            <h2>Subscriptions and Orders</h2>
            <p>
              Meal plan orders are confirmed after the kitchen verifies payment and plan details. Plan dates,
              pauses, and delivery schedules follow the active plan shown in your account.
            </p>
          </section>
          <section>
            <h2>Payments</h2>
            <p>
              Payments are handled manually through the approved Project Fit WhatsApp flow. Half-payment plans
              require the remaining payment by the due date shown in your account.
            </p>
          </section>
          <section>
            <h2>Delivery</h2>
            <p>
              Delivery is available only in supported service areas. Sundays are non-delivery days. Some areas
              may require a separate parcel fare.
            </p>
          </section>
          <section>
            <h2>Health Information</h2>
            <p>
              Meal suggestions are based on the details you provide. Project Fit food plans are not a substitute
              for medical advice from your doctor.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
