'use client';

import { useCartStore } from '@/store/cartStore';
import { X, ShoppingBag, Trash2, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAuthHeaders } from '@/lib/auth-client';
import type { DeliveryAddress } from '@/lib/backend-types';
import { isDeliverablePincode, isIncludedDeliveryPincode } from '@/lib/serviceable-pincodes';
import { usePublicConfig } from '@/lib/use-public-config';
import { mergeStoredProfile, normalizeDeliveryAddress, readStoredProfile } from '@/lib/profile-storage';
import { getFreeSampleDeviceId } from '@/lib/free-sample-device';
import { getMealSlotsLabel } from '@/lib/meal-slots';
import DeliveryAreaNotice from './DeliveryAreaNotice';
import LocationPickerModal from './LocationPickerModal';
import styles from './Cart.module.css';
import { isMonthlyPlanItems } from '@/lib/plan-duration';

const initialDeliveryAddress: DeliveryAddress = {
  addressLine1: '',
  addressLine2: '',
  city: '',
  pincode: '',
  phone: '',
};

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTomorrowDateValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  return formatDateInputValue(date);
}

function validateDeliveryAddress(deliveryAddress: DeliveryAddress) {
  if (!deliveryAddress.addressLine1.trim() || !deliveryAddress.city.trim()) {
    return 'Enter your delivery address and city.';
  }

  if (!/^[1-9][0-9]{5}$/.test(deliveryAddress.pincode.trim())) {
    return 'Enter a valid 6-digit pincode.';
  }

  if (!isDeliverablePincode(deliveryAddress.pincode)) {
    return 'Your area is outside our current deliverable areas. Please enter a supported delivery pincode.';
  }

  if (!/^[6-9][0-9]{9}$/.test(deliveryAddress.phone.trim())) {
    return 'Enter a valid 10-digit mobile number.';
  }

  return null;
}

export default function Cart() {
  usePublicConfig();

  const { items, isOpen, toggleCart, removeItem, getTotal, clearCart } = useCartStore();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>(initialDeliveryAddress);
  const [requestedStartDate, setRequestedStartDate] = useState(getTomorrowDateValue);
  const [paymentOption, setPaymentOption] = useState<'full' | 'half'>('full');
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const savedProfile = readStoredProfile();
    if (savedProfile.deliveryAddress) {
      setDeliveryAddress((current) => ({
        ...normalizeDeliveryAddress(savedProfile.deliveryAddress),
        phone: savedProfile.deliveryAddress?.phone || savedProfile.phone || current.phone,
      }));
    } else if (savedProfile.phone) {
      setDeliveryAddress((current) => ({ ...current, phone: savedProfile.phone || current.phone }));
    }

    async function loadSavedProfileAddress() {
      try {
        const response = await fetch('/api/profile', {
          headers: await getAuthHeaders(),
          cache: 'no-store',
        });
        const data = response.ok ? await response.json() : null;
        const remoteAddress = data?.profile?.delivery_address as Partial<DeliveryAddress> | null | undefined;

        if (cancelled || !remoteAddress) return;

        setDeliveryAddress((current) => {
          const next = normalizeDeliveryAddress({
            ...remoteAddress,
            phone: remoteAddress.phone || savedProfile.phone || current.phone,
          });
          mergeStoredProfile({ deliveryAddress: next });
          return next;
        });
      } catch {
        // Checkout can continue with the locally saved or manually entered address.
      }
    }

    void loadSavedProfileAddress();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const total = getTotal();
  const isFreeSampleCheckout = items.length === 1 && items[0]?.itemType === 'free_sample';
  const canUseHalfPayment = !isFreeSampleCheckout && isMonthlyPlanItems(items);
  const payableNow = canUseHalfPayment && paymentOption === 'half' ? Math.ceil(total / 2) : total;
  const remainingAmount = Math.max(0, total - payableNow);
  const hasValidPincode = /^[1-9][0-9]{5}$/.test(deliveryAddress.pincode.trim());
  const isOutsideDeliverableArea =
    hasValidPincode && !isDeliverablePincode(deliveryAddress.pincode);
  const requiresRapidoFare =
    hasValidPincode &&
    isDeliverablePincode(deliveryAddress.pincode) &&
    !isIncludedDeliveryPincode(deliveryAddress.pincode);

  const updateAddressField = (field: keyof DeliveryAddress, value: string) => {
    setDeliveryAddress((current) => {
      const next = { ...current, [field]: value };
      mergeStoredProfile({ deliveryAddress: next });
      return next;
    });
  };

  const openLocationPicker = () => {
    setError('');
    setIsMapOpen(true);
  };

  const handleMapAddressSelect = (address: Partial<DeliveryAddress>) => {
    setDeliveryAddress((current) => {
      const next = normalizeDeliveryAddress({
        ...current,
        addressLine1: address.addressLine1 ?? current.addressLine1,
        addressLine2: address.addressLine2 ?? current.addressLine2,
        city: address.city ?? current.city,
        pincode: address.pincode ?? current.pincode,
        latitude: address.latitude,
        longitude: address.longitude,
      });
      mergeStoredProfile({ deliveryAddress: next });
      return next;
    });
    setIsMapOpen(false);

    if (address.pincode && !isDeliverablePincode(address.pincode)) {
      setError('');
    }
  };

  const handleBrowsePrograms = () => {
    toggleCart();
    router.push('/#programs');
  };

  const handleCheckout = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      if (items.length !== 1 || items.some((item) => item.quantity !== 1)) {
        throw new Error('Please order one item at a time. Free samples and meal plans must be ordered separately.');
      }

      const addressError = validateDeliveryAddress(deliveryAddress);

      if (addressError) {
        throw new Error(addressError);
      }

      const response = await fetch('/api/checkout-intents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({
          items,
          subtotal: total,
          deliveryAddress,
          requestedStartDate: isFreeSampleCheckout ? null : requestedStartDate,
          freeSampleDeviceId: isFreeSampleCheckout ? getFreeSampleDeviceId() : undefined,
          paymentOption: canUseHalfPayment ? paymentOption : 'full',
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (/complete your profile/i.test(data.error ?? '')) {
          toggleCart();
          router.push('/profile?completeProfile=1');
          return;
        }

        if (response.status === 401) {
          toggleCart();
          router.push('/login');
          return;
        }

        throw new Error(data.error ?? 'Could not place your order.');
      }

      clearCart();
      setDeliveryAddress(initialDeliveryAddress);
      setRequestedStartDate(getTomorrowDateValue());
      toggleCart();
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank', 'noopener,noreferrer');
        router.push(
          `/order-confirmed?intent=${data.checkoutIntent.code}&whatsapp=1${
            data.checkoutIntent.order_type === 'free_sample' ? '&type=sample' : ''
          }`
        );
        return;
      }

      router.push('/my-plan');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place your order.');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className={styles.overlay} onClick={toggleCart}>
        <div className={styles.cart} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Your Cart</h2>
          <button className={styles.closeBtn} onClick={toggleCart}><X size={24} /></button>
        </div>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <ShoppingBag size={48} className={styles.emptyIcon} />
            <h3>Cart is empty</h3>
            <p>Looks like you have not added anything yet.</p>
            <button className="btn-primary" onClick={handleBrowsePrograms}>Browse Programs</button>
          </div>
        ) : (
          <>
            <div className={styles.items}>
              {items.map(item => (
                <div key={item.id} className={styles.item}>
                  <div className={styles.itemHeader}>
                    <div className={styles.itemImage}>
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt="" />
                      ) : (
                        <ShoppingBag size={22} />
                      )}
                    </div>
                    <div className={styles.itemTitle}>
                      <span className={styles.itemEyebrow}>{item.itemType === 'free_sample' ? 'Free sample' : 'Selected plan'}</span>
                      <h4>{item.name}</h4>
                      {getMealSlotsLabel(item) && <small>{getMealSlotsLabel(item)}</small>}
                      <p>Rs {item.totalPrice.toLocaleString('en-IN')}</p>
                    </div>
                    <button className={styles.removeBtn} onClick={() => removeItem(item.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {item.removedIngredients.length > 0 && (
                    <div className={styles.customizations}>
                      <p className={styles.removed}>
                        No {item.removedIngredients.join(', ')}
                      </p>
                    </div>
                  )}

                  {item.addOns.length > 0 && (
                    <div className={styles.customizations}>
                      {item.addOns.map(addon => (
                        <p key={addon.name} className={styles.added}>
                          + {addon.name}
                        </p>
                      ))}
                    </div>
                  )}

                  <span className={styles.sampleTag}>
                    {item.itemType === 'free_sample' ? 'One-time free sample' : 'Single plan checkout'}
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.footer}>
              <div className={styles.addressBlock}>
                <div className={styles.addressHeader}>
                  <h3>Delivery Address</h3>
                  <button type="button" className={styles.locationBtn} onClick={openLocationPicker}>
                    <MapPin size={16} />
                    {deliveryAddress.latitude ? 'Change location' : 'Detect location'}
                  </button>
                </div>
                <label className={styles.field}>
                  <span>Address</span>
                  <input
                    value={deliveryAddress.addressLine1}
                    onChange={(event) => updateAddressField('addressLine1', event.target.value)}
                    placeholder="House no, street, area"
                    autoComplete="street-address"
                  />
                </label>

                <label className={styles.field}>
                  <span>Landmark</span>
                  <input
                    value={deliveryAddress.addressLine2 ?? ''}
                    onChange={(event) => updateAddressField('addressLine2', event.target.value)}
                    placeholder="Nearby landmark"
                  />
                </label>

                <div className={styles.fieldGrid}>
                  <label className={styles.field}>
                    <span>City</span>
                    <input
                      value={deliveryAddress.city}
                      onChange={(event) => updateAddressField('city', event.target.value)}
                      placeholder="City"
                      autoComplete="address-level2"
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Pincode</span>
                    <input
                      value={deliveryAddress.pincode}
                      onChange={(event) => updateAddressField('pincode', event.target.value)}
                      placeholder="530045"
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="postal-code"
                    />
                  </label>
                </div>

                {isOutsideDeliverableArea && (
                  <p className={styles.error}>
                    Your area is outside our current deliverable areas. Please enter a supported delivery pincode.
                  </p>
                )}
                {requiresRapidoFare && <DeliveryAreaNotice compact />}

                <label className={styles.field}>
                  <span>Phone</span>
                  <input
                    value={deliveryAddress.phone}
                    onChange={(event) => updateAddressField('phone', event.target.value)}
                    placeholder="10-digit mobile number"
                    inputMode="tel"
                    maxLength={10}
                    autoComplete="tel"
                  />
                </label>

                {!isFreeSampleCheckout && (
                  <>
                    {canUseHalfPayment && (
                      <div className={styles.paymentChoice}>
                        <span>Payment option</span>
                        <div className={styles.paymentSwitch}>
                          <button
                            type="button"
                            className={paymentOption === 'full' ? styles.paymentActive : styles.paymentButton}
                            onClick={() => setPaymentOption('full')}
                          >
                            Pay full
                          </button>
                          <button
                            type="button"
                            className={paymentOption === 'half' ? styles.paymentActive : styles.paymentButton}
                            onClick={() => setPaymentOption('half')}
                          >
                            Pay half now
                          </button>
                        </div>
                        {paymentOption === 'half' ? (
                          <p>
                            Pay Rs {payableNow.toLocaleString('en-IN')} now. The remaining Rs {remainingAmount.toLocaleString('en-IN')} is due after day 10 of your plan.
                          </p>
                        ) : (
                          <p>Pay the full amount once and keep the plan payment complete from day one.</p>
                        )}
                      </div>
                    )}
                    <label className={styles.field}>
                      <span>Plan start date</span>
                      <input
                        type="date"
                        value={requestedStartDate}
                        min={getTomorrowDateValue()}
                        required
                        onFocus={(event) => event.currentTarget.showPicker?.()}
                        onClick={(event) => event.currentTarget.showPicker?.()}
                        onChange={(event) => setRequestedStartDate(event.target.value)}
                      />
                    </label>
                    <p className={styles.helpText}>
                      Choose tomorrow or any future date. We cannot start the plan on the same day as the order because meals start fresh from the next day.
                    </p>
                  </>
                )}
              </div>

              {error && <p className={styles.error}>{error}</p>}
              {!isFreeSampleCheckout && (
                <div className={styles.paymentSummary}>
                  <span>Due now</span>
                  <strong>Rs {payableNow.toLocaleString('en-IN')}</strong>
                  {remainingAmount > 0 && <small>Remaining later: Rs {remainingAmount.toLocaleString('en-IN')}</small>}
                </div>
              )}
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }} onClick={handleCheckout} disabled={isSubmitting}>
                {isSubmitting ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </>
        )}
        </div>
      </div>

      {isMapOpen && (
        <LocationPickerModal
          initialLocation={{
            latitude: deliveryAddress.latitude,
            longitude: deliveryAddress.longitude,
          }}
          onCancel={() => setIsMapOpen(false)}
          onSelect={handleMapAddressSelect}
        />
      )}
    </>
  );
}
