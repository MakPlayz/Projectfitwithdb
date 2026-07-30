'use client';

import { motion } from 'framer-motion';
import { Stethoscope, ArrowRight, Phone, MessageCircle, Mail } from 'lucide-react';
import { trackSpotlight } from '@/lib/spotlight';
import styles from './NutritionistConsult.module.css';

const NUTRITIONIST_NAME = 'Munira Taher';
const NUTRITIONIST_ROLE = 'Dietician in Food and Nutrition';
const NUTRITIONIST_PHONE = '7601049070';
const NUTRITIONIST_PHONE_INTL = '917601049070';
const NUTRITIONIST_EMAIL = 'projectfitvizag@gmail.com';
const BOOK_MESSAGE = `Hi ${NUTRITIONIST_NAME}! I'd like to book a nutritionist consultation. Please share the available slots.`;

const bookNowHref = `https://wa.me/${NUTRITIONIST_PHONE_INTL}?text=${encodeURIComponent(BOOK_MESSAGE)}`;

const contactLinks = [
  {
    icon: Phone,
    label: 'Call us',
    value: NUTRITIONIST_PHONE,
    href: `tel:+${NUTRITIONIST_PHONE_INTL}`,
  },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: NUTRITIONIST_PHONE,
    href: `https://wa.me/${NUTRITIONIST_PHONE_INTL}`,
  },
  {
    icon: Mail,
    label: 'Email',
    value: NUTRITIONIST_EMAIL,
    href: `mailto:${NUTRITIONIST_EMAIL}`,
  },
];

export default function NutritionistConsult() {
  return (
    <section className={styles.section} aria-labelledby="nutritionist-consult-title">
      <motion.div
        className={styles.card}
        onMouseMove={trackSpotlight}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={styles.copy}>
          <p className="section-label">
            <Stethoscope size={14} />
            1-on-1 Guidance
          </p>
          <h2 id="nutritionist-consult-title" className={styles.title}>
            Book a nutritionist consultation
          </h2>
          <p className={styles.description}>
            Your health deserves a personalized start. Book a one-on-one consultation with our
            doctor and receive expert recommendations before beginning your wellness journey.
          </p>

          <div className={styles.actions}>
            <a
              className={`btn-primary ${styles.bookBtn}`}
              href={bookNowHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              Schedule an Appointment
              <ArrowRight size={16} />
            </a>
            <span className={styles.hint}>Free 10-min intro call · Mon–Sat, 9am–7pm</span>
          </div>
        </div>

        <div className={styles.contactCard}>
          <div className={styles.nutritionist}>
            <span className={styles.nutritionistAvatar}>
              <Stethoscope size={20} />
            </span>
            <span className={styles.nutritionistMeta}>
              <span className={styles.nutritionistName}>{NUTRITIONIST_NAME}</span>
              <span className={styles.nutritionistRole}>{NUTRITIONIST_ROLE}</span>
            </span>
          </div>
          <ul className={styles.contactList}>
            {contactLinks.map(({ icon: Icon, label, value, href }) => (
              <li key={label}>
                <a
                  className={styles.contactLink}
                  href={href}
                  {...(href.startsWith('http')
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  <span className={styles.contactIcon}>
                    <Icon size={18} />
                  </span>
                  <span className={styles.contactText}>
                    <span className={styles.contactLabel}>{label}</span>
                    <span className={styles.contactValue}>{value}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </section>
  );
}
