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
          These terms explain how Project Fit Vizag accounts, meal plans, samples, payments, delivery,
          health-profile information, and support operate.
        </p>

        <div style={{ display: 'grid', gap: 24, color: 'var(--text-secondary)' }}>
          <section>
            <h2>Accounts</h2>
            <p>
              You are responsible for keeping your login details secure and for providing accurate profile,
              contact, and delivery information. Project Fit may refuse, pause, or cancel access if account
              details are false, unsafe, abusive, or used to interfere with service operations.
            </p>
          </section>
          <section>
            <h2>Orders and subscriptions</h2>
            <p>
              Meal plan and sample orders are confirmed only after Project Fit validates the request, delivery
              area, profile requirements, stock or kitchen availability, and payment status. Active plan dates,
              pauses, delivery days, and plan history are shown in your account where available.
            </p>
          </section>
          <section>
            <h2>Payments and verification</h2>
            <p>
              Payments are coordinated through the approved Project Fit checkout and WhatsApp flow. Orders may
              remain pending until staff verify payment screenshots, transaction references, or other requested
              proof. Half-payment plans require the remaining payment by the due date shown in your account or
              communicated by Project Fit.
            </p>
          </section>
          <section>
            <h2>Delivery</h2>
            <p>
              Delivery is available only in supported service areas and may depend on route capacity, address
              accuracy, weather, local restrictions, or kitchen conditions. Sundays are non-delivery days unless
              Project Fit states otherwise. Some areas may require a separate delivery or parcel fare.
            </p>
          </section>
          <section>
            <h2>Pauses, changes, and cancellations</h2>
            <p>
              Eligible weekly or monthly plans may be paused using the controls available in your account,
              subject to cutoff rules and non-delivery days. Changes, cancellations, refunds, and credits are
              handled case by case based on plan status, food preparation, delivery attempts, and staff review.
            </p>
          </section>
          <section>
            <h2>Health information</h2>
            <p>
              Meal suggestions are based on the information you provide and are for general nutrition support.
              Project Fit does not provide medical diagnosis, medical treatment, or emergency support. Consult
              a qualified medical professional before starting a plan if you have diabetes, pregnancy-related
              needs, allergies, medical conditions, or prescribed diet restrictions.
            </p>
          </section>
          <section>
            <h2>Customer responsibilities</h2>
            <p>
              You agree to provide correct contact details, check ingredients and allergy suitability, be
              available for delivery communication, use Project Fit messages and dashboards lawfully, and avoid
              sharing false payment proof or placing duplicate sample claims.
            </p>
          </section>
          <section>
            <h2>Service changes</h2>
            <p>
              Project Fit may update menus, pricing, delivery areas, plan availability, kitchen schedules, and
              these terms as the service changes. The latest version posted on this page applies from the date
              it is published.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
