'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, FileDown } from 'lucide-react';
import { categoryImages, type DietCategory } from '@/data/diets';
import DietImage from '@/components/ui/DietImage';
import styles from './DietPageTemplate.module.css';

interface DietPageTemplateProps {
  diet: DietCategory;
}

export default function DietPageTemplate({ diet }: DietPageTemplateProps) {
  const categoryImage = categoryImages[diet.slug];

  return (
    <main
      className={styles.main}
      style={
        {
          '--diet-accent': diet.accent,
          '--diet-accent-light': diet.accentLight,
          '--diet-gradient': diet.gradient,
        } as React.CSSProperties
      }
    >
      <section className={styles.hero}>
        <div className="container">
          <Link href="/" className={styles.back}>
            <ArrowLeft size={18} />
            All Programs
          </Link>

          <div className={styles.heroGrid}>
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className={styles.heroContent}
            >
              <span className={styles.badge}>{diet.tagline}</span>
              <h1>{diet.title}</h1>
              <p>{diet.description}</p>
              <div className={styles.heroCtas}>
                <a href="#plans" className="btn-primary">
                  Explore Plan
                  <ArrowRight size={18} />
                </a>
                <a href="#meals" className="btn-secondary">
                  Free Sample
                </a>
                <a
                  href={diet.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  <FileDown size={18} />
                  Diet Plan
                </a>
              </div>
              <ul className={styles.highlights}>
                {diet.nutritionHighlights.map((h) => (
                  <li key={h}>
                    <Check size={16} />
                    {h}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.65, delay: 0.1 }}
              className={styles.heroVisual}
            >
              <DietImage src={categoryImage} alt={diet.title} priority sizes="(max-width: 768px) 100vw, 560px" />
            </motion.div>
          </div>
        </div>
      </section>

      <section id="macros" className={styles.section}>
        <div className="container">
          <p className="section-label">Nutrition</p>
          <h2 className="section-title">Macro profile</h2>
          <div className={styles.macroGrid}>
            {diet.macros.map((m, i) => (
              <motion.div
                key={m.label}
                className={styles.macroCard}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <span className={styles.macroValue}>{m.value}</span>
                <span className={styles.macroLabel}>{m.label}</span>
                <span className={styles.macroNote}>{m.note}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider container" />

      <section id="plans" className={styles.section}>
        <div className="container">
          <p className="section-label">Plans</p>
          <h2 className="section-title">Choose your plan</h2>
          <p className="section-subtitle">
            {diet.calorieTarget} — structured {diet.plans[0]?.duration ?? '7-day'} program from your diet plan.
          </p>
          <div className={styles.plansGrid}>
            {diet.plans.map((plan, i) => (
              <motion.article
                key={plan.id}
                className={styles.planCard}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                {plan.highlight && <span className={styles.planBadge}>{plan.highlight}</span>}
                <h3>{plan.name}</h3>
                <p className={styles.planDuration}>{plan.duration}</p>
                <p className={styles.planMeta}>{plan.mealsPerDay} meals / day</p>
                <p className={styles.planPrice}>
                  ₹{plan.price.toLocaleString('en-IN')}
                  <span>/ plan</span>
                </p>
                <button type="button" className="btn-primary" style={{ width: '100%', marginTop: '20px' }}>
                  Get Started
                </button>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="meals" className={styles.section}>
        <div className="container">
          <p className="section-label">Menu</p>
          <h2 className="section-title">Featured meals</h2>
          <p className="section-subtitle">Sample meals from your 7-day {diet.shortTitle.toLowerCase()} menu.</p>
          <div className={styles.mealsGrid}>
            {diet.meals.map((meal, i) => (
              <motion.article
                key={meal.id}
                className={styles.mealCard}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className={styles.mealImage}>
                  <DietImage src={meal.image} alt={meal.name} sizes="(max-width: 768px) 100vw, 400px" />
                </div>
                <div className={styles.mealBody}>
                  {meal.mealType && (
                    <span className={styles.mealType}>{meal.mealType}</span>
                  )}
                  <h3>{meal.name}</h3>
                  <p>{meal.description}</p>
                  <div className={styles.mealMacros}>
                    <span>{meal.calories} kcal</span>
                    <span>P {meal.protein}g</span>
                    <span>C {meal.carbs}g</span>
                    <span>F {meal.fat}g</span>
                  </div>
                  <div className={styles.mealFooter}>
                    <span className={styles.mealPrice}>₹{meal.price}</span>
                    <button type="button" className="btn-ghost">
                      Add to cart
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.ctaBand}>
        <div className="container">
          <motion.div
            className={styles.ctaInner}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2>Ready to start your {diet.shortTitle.toLowerCase()} journey?</h2>
            <p>Personalized meals, transparent macros, delivered on your schedule.</p>
            <div className={styles.ctaButtons}>
              <button type="button" className="btn-primary">
                Get Started
              </button>
              <Link href="/" className="btn-secondary">
                Browse all programs
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
