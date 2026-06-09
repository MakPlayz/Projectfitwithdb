import Link from 'next/link';
import { Mail, Phone } from 'lucide-react';
import Broccoli from '@/components/ui/Broccoli';
import { dietCategories } from '@/data/diets';
import styles from './Footer.module.css';

function InstagramMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.grid}>
          <div className={styles.brand}>
            <Link href="/" className={styles.logo}>
              <Broccoli size={22} />
              <span>
                Project<strong>Fit</strong>
              </span>
            </Link>
            <p>
              Premium health & diet meal delivery. Personalized nutrition for every goal.
            </p>
          </div>

          <div>
            <h4>Programs</h4>
            <ul>
              {dietCategories.map((d) => (
                <li key={d.slug}>
                  <Link href={d.href}>{d.title}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4>Company</h4>
            <ul>
              <li><Link href="/#how-it-works">How It Works</Link></li>
              <li><Link href="/chef">Chef Portal</Link></li>
            </ul>
          </div>

          <div>
            <h4>Connect</h4>
            <ul className={styles.social}>
              <li>
                <a href="mailto:projectfitvizag@gmail.com" aria-label="Email">
                  <Mail size={18} />
                  projectfitvizag@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/projectfit_vizag?igsh=MWtteHQwOXN0Y2VxaQ=="
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <InstagramMark />
                  @projectfit_vizag
                </a>
              </li>
              <li className={styles.contactText}>
                <Phone size={18} />
                7799066991
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          <p>© 2026 Project Fit. All rights reserved.</p>
          <p className={styles.muted}>Eat clean. Live fit. Delivered with care.</p>
        </div>
      </div>
    </footer>
  );
}
