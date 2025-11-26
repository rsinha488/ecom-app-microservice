'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAppDispatch, useAppSelector } from '@/store';
import { clearCart } from '@/store/slices/cartSlice';
import { FiCreditCard, FiMapPin, FiShoppingBag, FiCheck } from 'react-icons/fi';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { PaymentMethodCode } from '@/constants/paymentMethod';
import { PaymentStatusCode } from '@/constants/paymentStatus';

export default function CheckoutPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((state) => state.cart);
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // Shipping Address
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    // Payment (now using numeric codes)
    paymentMethod: PaymentMethodCode.STRIPE, // 7 - Default to online payment
    // Optional fields
    notes: '',
  });

  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const tax = subtotal * 0.1; // 10% tax
  const shipping = items.length > 0 ? 10 : 0;
  const total = subtotal + tax + shipping;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Parse payment method as number
    const parsedValue = name === 'paymentMethod' ? parseInt(value, 10) : value;
    setFormData((prev) => ({ ...prev, [name]: parsedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error('Please log in to place an order');
      router.push('/auth/login');
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty');
      router.push('/products');
      return;
    }

    // Validate form
    if (!formData.street || !formData.city || !formData.state || !formData.zipCode || !formData.country) {
      toast.error('Please fill in all shipping address fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare order data
      const orderData = {
        items: items.map((item) => ({
          productId: item._id, // Note: productId not product_id
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        totalAmount: total,
        shippingAddress: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
        },
        paymentMethod: formData.paymentMethod,
        paymentStatus: PaymentStatusCode.PENDING, // 2 - Will be updated after payment processing
      };

      console.log('Creating order:', orderData);

      // Create order via API
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const data = await response.json();
      console.log('Order created:', data);

      const orderId = data.data.order._id;
      const orderNumber = data.data.order.orderNumber;

      // Check if online payment (Stripe)
      if (formData.paymentMethod === PaymentMethodCode.STRIPE) {
        console.log('Initiating Stripe checkout...');

        // Create Stripe checkout session
        const checkoutResponse = await fetch('/api/payment/create-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId,
            orderNumber,
            amount: total,
            currency: 'usd',
            paymentMethod: formData.paymentMethod,
            items: items.map((item) => ({
              productId: item._id,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
          }),
        });

        if (!checkoutResponse.ok) {
          const error = await checkoutResponse.json();
          throw new Error(error.error || 'Failed to create payment session');
        }

        const checkoutData = await checkoutResponse.json();
        console.log('Stripe checkout session created:', checkoutData);

        // Clear cart before redirecting to payment
        dispatch(clearCart());

        // Redirect to Stripe checkout
        window.location.href = checkoutData.data.checkoutUrl;
        return;
      }

      // For Cash on Delivery
      dispatch(clearCart());

      // Show success message
      toast.success(`🎉 Order #${orderNumber} placed successfully! Check your orders page for real-time updates.`, {
        autoClose: 5000,
      });

      // Redirect to orders page
      setTimeout(() => {
        router.push('/orders');
      }, 2000);
    } catch (error: any) {
      console.error('Order creation error:', error);
      toast.error(error.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Redirect if cart is empty
  if (items.length === 0 && !isSubmitting) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <FiShoppingBag className="mx-auto h-24 w-24 text-gray-400" />
            <h2 className="mt-4 text-3xl font-extrabold text-gray-900">Your cart is empty</h2>
            <p className="mt-2 text-gray-600">Add some items to your cart before checking out</p>
            <Link
              href="/products"
              className="mt-6 inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Shipping Address */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <FiMapPin className="h-6 w-6 text-indigo-600 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">Shipping Address</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      id="street"
                      name="street"
                      value={formData.street}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="New York"
                      />
                    </div>

                    <div>
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                        State/Province *
                      </label>
                      <input
                        type="text"
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="NY"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                        ZIP/Postal Code *
                      </label>
                      <input
                        type="text"
                        id="zipCode"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        required
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={10}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="10001"
                        onKeyPress={(e) => {
                          // Allow only numbers
                          if (!/[0-9]/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                      />
                    </div>

                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                        Country *
                      </label>
                      <input
                        type="text"
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="United States"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <FiCreditCard className="h-6 w-6 text-indigo-600 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">Payment Method</h2>
                </div>

                <div className="space-y-3">
                  {/* Stripe Payment - Online payment gateway */}
                  <label className="flex items-center p-4 border-2 border-indigo-500 rounded-lg cursor-pointer hover:bg-indigo-50 transition">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={PaymentMethodCode.STRIPE}
                      checked={formData.paymentMethod === PaymentMethodCode.STRIPE}
                      onChange={handleInputChange}
                      className="h-5 w-5 sm:h-4 sm:w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900 font-medium">Pay Online (Stripe)</span>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Recommended</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Secure payment via credit/debit card</p>
                    </div>
                  </label>

                  {/* Cash on Delivery */}
                  <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={PaymentMethodCode.CASH_ON_DELIVERY}
                      checked={formData.paymentMethod === PaymentMethodCode.CASH_ON_DELIVERY}
                      onChange={handleInputChange}
                      className="h-5 w-5 sm:h-4 sm:w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="ml-3 flex-1">
                      <span className="text-gray-900 font-medium">Cash on Delivery</span>
                      <p className="text-sm text-gray-600 mt-1">Pay when you receive your order</p>
                    </div>
                  </label>
                </div>

                {formData.paymentMethod === PaymentMethodCode.STRIPE && (
                  <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <p className="text-sm text-indigo-800">
                      <FiCheck className="inline h-4 w-4 mr-1" />
                      You will be redirected to Stripe to complete your payment securely.
                    </p>
                  </div>
                )}
              </div>

              {/* Order Notes (Optional) */}
              {/* <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Order Notes (Optional)</h2>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Any special instructions for your order?"
                />
              </div> */}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing Order...
                  </span>
                ) : (
                  'Place Order'
                )}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>

              {/* Cart Items */}
              <div className="space-y-3 mb-6 max-h-48 sm:max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <div key={item._id} className="flex items-center space-x-3 pb-3 border-b border-gray-100">
                    <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded-lg overflow-hidden relative">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="64px"
                          className="object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiShoppingBag className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        ${item.price.toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-sm font-bold text-gray-900">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({items.length} items)</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax (10%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>${shipping.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-xl font-bold text-gray-900">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Security Badge */}
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center text-green-800">
                  <FiCheck className="h-5 w-5 mr-2" />
                  <span className="text-sm font-medium">Secure Checkout</span>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Your information is encrypted and secure
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
