'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, FileDown } from 'lucide-react';
import { categoryImages, type DietCategory, type DietPlan } from '@/data/diets';
import DietImage from '@/components/ui/DietImage';
import { useCartStore } from '@/store/cartStore';
import styles from './DietPageTemplate.module.css';

interface DietPageTemplateProps {
  diet: DietCategory;
}

export default function DietPageTemplate({ diet }: DietPageTemplateProps) {
  const categoryImage = categoryImages[diet.slug];
  const { addItem, toggleCart } = useCartStore();
  const [selectedMeals, setSelectedMeals] = useState<Record<string, number>>({});

  const handleAddPlanToCart = (plan: DietPlan) => {
    let price = plan.price;
    let name = plan.name;
    let meals = plan.mealsPerDay;

    if (plan.customPrices) {
      const customMeals = selectedMeals[plan.id] ?? 1;
      meals = customMeals;
      price = plan.customPrices[customMeals] ?? plan.price;
      name = `${plan.name} (${customMeals} Meal${customMeals > 1 ? 's' : ''}/Day)`;
    }

    addItem({
      id: `${plan.id}-${Date.now()}`,
      name: `${diet.title} - ${name}`,
      basePrice: price,
      quantity: 1,
      image: categoryImage,
      removedIngredients: [],
      addOns: [],
      totalPrice: price,
    });
    toggleCart();
  };

  const handleToggleMeals = (planId: string, count: number) => {
    setSelectedMeals((prev) => ({ ...prev, [planId]: count }));
  };

  const dayPlans = diet.plans.filter((p) => p.duration === '1 day');
  const weekPlans = diet.plans.filter((p) => p.duration === '6 days');
  const monthPlans = diet.plans.filter((p) => p.duration === '24 days');

  const renderPlanCard = (plan: DietPlan, i: number) => {
    const hasCustomOption = Boolean(plan.customPrices);
    const customMealsVal = selectedMeals[plan.id] ?? 1;
    const displayPrice = hasCustomOption && plan.customPrices
      ? (plan.customPrices[customMealsVal] ?? plan.price)
      : plan.price;
    const displayMeals = hasCustomOption ? customMealsVal : plan.mealsPerDay;

    return (
      <motion.article
        key={plan.id}
        className={styles.planCard}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: i * 0.08 }}
      >
        {plan.highlight && <span className={styles.planBadge}>{plan.highlight}</span>}
        <h3>{plan.name}</h3>
        <p className={styles.planDuration}>{plan.duration}</p>
        
        {hasCustomOption ? (
          <div className={styles.customSelector}>
            <span className={styles.customSelectorLabel}>Choose meal frequency:</span>
            <div className={styles.customSelectorGroup}>
              <button
                type="button"
                className={`${styles.customSelectorBtn} ${customMealsVal === 1 ? styles.customSelectorBtnActive : ''}`}
                onClick={() => handleToggleMeals(plan.id, 1)}
              >
                1 Meal/Day
              </button>
              <button
                type="button"
                className={`${styles.customSelectorBtn} ${customMealsVal === 2 ? styles.customSelectorBtnActive : ''}`}
                onClick={() => handleToggleMeals(plan.id, 2)}
              >
                2 Meals/Day
              </button>
            </div>
          </div>
        ) : (
          <p className={styles.planMeta}>{displayMeals} meals / day</p>
        )}

        <button
          type="button"
          className="btn-primary"
          style={{ width: '100%', marginTop: '20px', justifyContent: 'center' }}
          onClick={() => handleAddPlanToCart(plan)}
        >
          Add to Cart
        </button>
      </motion.article>
    );
  };

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
            {diet.calorieTarget} — structured nutrition options tailored to your schedule.
          </p>

          {dayPlans.length > 0 && (
            <div className={styles.planGroup}>
              <div className={styles.groupHeader}>
                <h3>⚡ Day Plan</h3>
                <p>A standard single-day plan. Ideal for flexible daily ordering whenever you need healthy meals.</p>
              </div>
              <div className={styles.plansGrid}>
                {dayPlans.map((plan, i) => renderPlanCard(plan, i))}
              </div>
            </div>
          )}

          {weekPlans.length > 0 && (
            <div className={styles.planGroup}>
              <div className={styles.groupHeader}>
                <h3>📅 Week Plan (6-Day)</h3>
                <p>Delivered Monday to Saturday (Sundays off). Perfect for staying clean during the workweek.</p>
              </div>
              <div className={styles.plansGrid}>
                {weekPlans.map((plan, i) => renderPlanCard(plan, i))}
              </div>
            </div>
          )}

          {monthPlans.length > 0 && (
            <div className={styles.planGroup}>
              <div className={styles.groupHeader}>
                <h3>💎 Month Plan (24-Day)</h3>
                <p>A 24-day subscription block. Required if custom calorie/macro adjustments or ingredient swaps are needed.</p>
              </div>
              <div className={styles.plansGrid}>
                {monthPlans.map((plan, i) => renderPlanCard(plan, i))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="meals" className={styles.section}>
        <div className="container">
          <p className="section-label">Menu</p>
          <h2 className="section-title">Featured meals</h2>
          <p className="section-subtitle">
            Sample meals from your {diet.plans[0]?.duration ? diet.plans[0].duration.replace(' days', '-day') : '6-day'} {diet.shortTitle.toLowerCase()} menu.
          </p>
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
                    <button type="button" className="btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
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
              <a href="#plans" className="btn-primary">
                Get Started
              </a>
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
