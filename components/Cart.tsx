'use client';

import { useCartStore } from '@/store/cartStore';
import { X, Plus, Minus, ShoppingBag, Trash2, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAuthHeaders } from '@/lib/auth-client';
import type { DeliveryAddress } from '@/lib/backend-types';
import { isServiceablePincode } from '@/lib/serviceable-pincodes';
import { usePublicConfig } from '@/lib/use-public-config';
import { mergeStoredProfile, normalizeDeliveryAddress, readStoredProfile } from '@/lib/profile-storage';
import DeliveryAreaNotice from './DeliveryAreaNotice';
import LocationPickerModal from './LocationPickerModal';
import styles from './Cart.module.css';

type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayCheckoutResponse) => void;
  prefill: {
    contact: string;
  };
  notes: Record<string, string>;
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
  };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

const initialDeliveryAddress: DeliveryAddress = {
  addressLine1: '',
  addressLine2: '',
  city: '',
  pincode: '',
  phone: '',
};



function validateDeliveryAddress(deliveryAddress: DeliveryAddress) {
  if (!deliveryAddress.addressLine1.trim() || !deliveryAddress.city.trim()) {
    return 'Enter your delivery address and city.';
  }

  if (!/^[1-9][0-9]{5}$/.test(deliveryAddress.pincode.trim())) {
    return 'Enter a valid 6-digit pincode.';
  }

  if (!/^[6-9][0-9]{9}$/.test(deliveryAddress.phone.trim())) {
    return 'Enter a valid 10-digit mobile number.';
  }

  return null;
}

export default function Cart() {
  usePublicConfig();

  const { items, isOpen, toggleCart, updateQuantity, removeItem, getTotal, clearCart } = useCartStore();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>(initialDeliveryAddress);
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;

    const savedProfile = readStoredProfile();
    if (savedProfile.deliveryAddress) {
      setDeliveryAddress((current) => ({
        ...normalizeDeliveryAddress(savedProfile.deliveryAddress),
        phone: savedProfile.deliveryAddress?.phone || savedProfile.phone || current.phone,
      }));
    } else if (savedProfile.phone) {
      setDeliveryAddress((current) => ({ ...current, phone: savedProfile.phone || current.phone }));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const total = getTotal();
  const isOutsideSupportedDelivery =
    /^[1-9][0-9]{5}$/.test(deliveryAddress.pincode.trim()) &&
    !isServiceablePincode(deliveryAddress.pincode);

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

    if (address.pincode && !isServiceablePincode(address.pincode)) {
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
      const addressError = validateDeliveryAddress(deliveryAddress);

      if (addressError) {
        throw new Error(addressError);
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({
          items,
          subtotal: total,
          deliveryAddress,
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
      toggleCart();
      router.push(`/order-confirmed?id=${data.order.id}`);
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
                      <span className={styles.itemEyebrow}>Selected plan</span>
                      <h4>{item.name}</h4>
                      <p>₹{item.totalPrice.toLocaleString('en-IN')}</p>
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

                  <div className={styles.qtyCtrl}>
                    <button aria-label={`Decrease ${item.name}`} onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus size={14} /></button>
                    <span>{item.quantity}</span>
                    <button aria-label={`Increase ${item.name}`} onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus size={14} /></button>
                  </div>
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

                {isOutsideSupportedDelivery && <DeliveryAreaNotice compact />}

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
              </div>

              {error && <p className={styles.error}>{error}</p>}
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
