import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiShoppingBag,
  FiArrowLeft,
  FiArrowRight,
  FiMail,
  FiPhone,
  FiMapPin,
  FiTruck,
  FiShield,
  FiPackage,
  FiCheckCircle,
  FiUser,
  FiCreditCard,
  FiDollarSign,
} from "react-icons/fi";
import { useCart } from "../components/Context/CartContext";
import { useAuth } from "../context/AuthContext.jsx";
import { accountApi } from "../api/account.js";
import { ordersApi } from "../api/orders.js";
import { paymentsApi } from "../api/payments.js";
import { formatCurrency } from "../utils/format.js";
import { SHIPPING_FEE } from "../config/app.js";
import { saveGuestOrder } from "../utils/guestOrders.js";

const CHANNEL_META = {
  bkash: { label: "bKash", description: "Pay securely with bKash" },
  nagad: { label: "Nagad", description: "Pay securely with Nagad" },
  card: { label: "Card", description: "Visa, Mastercard & more" },
};

const inputClass =
  "w-full rounded-xl border border-[#d7dff2] bg-white px-4 py-3 text-sm text-[#172554] outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
const labelClass = "mb-2 block text-sm font-semibold text-[#263968]";

const CheckOut = () => {
  const { cartItems, clearCart, buyNowItem, clearBuyNow } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isBuyNow = Boolean(buyNowItem);
  const items = isBuyNow ? [buyNowItem] : cartItems;
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    address2: "",
    country: "Bangladesh",
    city: "",
    state: "",
    zip: "",
    notes: "",
  });

  const [payment, setPayment] = useState({
    onlineEnabled: false,
    channels: [],
    method: "cod",
    channel: "bkash",
  });

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Prefill the logged-in customer's details.
  useEffect(() => {
    if (!user) return;

    setFormData((f) => ({
      ...f,
      name: f.name || user.name || "",
      email: f.email || user.email || "",
      phone: f.phone || user.phone || "",
    }));
  }, [user]);

  // Load saved addresses for signed-in customers.
  useEffect(() => {
    if (!user) return;

    let active = true;

    accountApi
      .listAddresses()
      .then((response) => {
        if (!active) return;
        const list = response.data || [];
        setAddresses(list);

        const preferred = list.find((address) => address.is_default) || list[0];
        if (preferred) {
          applyAddress(preferred);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [user]);

  // Discover whether online payments are available.
  useEffect(() => {
    let active = true;

    paymentsApi
      .getConfig()
      .then((response) => {
        if (!active) return;
        const config = response.data || {};
        setPayment((p) => ({
          ...p,
          onlineEnabled: Boolean(config.onlinePaymentsEnabled),
          channels: config.channels || [],
          channel: (config.channels || [])[0] || "bkash",
        }));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  function applyAddress(address) {
    setSelectedAddressId(String(address.id));
    setFormData((f) => ({
      ...f,
      name: address.recipient_name || f.name,
      phone: address.phone || f.phone,
      address: address.address_line1 || "",
      address2: address.address_line2 || "",
      city: address.city || "",
      state: address.state || "",
      zip: address.postal_code || "",
      country: address.country || "Bangladesh",
    }));
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setError("");
  };

  const clearOrderSource = () => {
    if (isBuyNow) {
      clearBuyNow();
    } else {
      clearCart();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (items.length === 0) {
      setError("There is nothing to check out.");
      return;
    }

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      !formData.address.trim() ||
      !formData.city.trim() ||
      !formData.zip.trim() ||
      !formData.country.trim()
    ) {
      setError("Please complete all required fields.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await ordersApi.create({
        customer_name: formData.name.trim(),
        customer_email: formData.email.trim(),
        customer_phone: formData.phone.trim(),
        shipping_address: formData.address2.trim()
          ? `${formData.address.trim()}, ${formData.address2.trim()}`
          : formData.address.trim(),
        shipping_city: formData.city.trim(),
        shipping_country: formData.country.trim(),
        shipping_postal_code: formData.zip.trim(),
        notes: formData.notes.trim() || undefined,
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        payment_method: payment.method,
        payment_channel:
          payment.method === "sslcommerz" ? payment.channel : undefined,
      });

      const order = response.data;

      if (order.tracking_token) {
        saveGuestOrder(order.order_number, order.tracking_token);
      }

      clearOrderSource();

      if (payment.method === "sslcommerz") {
        try {
          const initiated = await paymentsApi.initiate(
            order.order_number,
            order.tracking_token
          );

          window.location.href = initiated.data.gateway_page_url;
          return;
        } catch (gatewayError) {
          setError(
            `${gatewayError.message} Your order ${order.order_number} was saved — you can pay or track it from your order page.`
          );
          navigate(`/order/result?status=failed&order=${order.order_number}`);
          return;
        }
      }

      navigate(`/order/result?status=placed&order=${order.order_number}`);
    } catch (err) {
      setError(
        err.message || "We could not place your order. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-gradient-to-br from-[#eef2ff] via-[#f8faff] to-[#e5ebf8] px-4 py-16">
        <section className="w-full max-w-lg rounded-3xl border border-white/80 bg-[#f8faff] px-6 py-12 text-center shadow-xl shadow-[#172554]/10 sm:px-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600">
            <FiShoppingBag size={36} />
          </div>

          <h1 className="mt-6 text-2xl font-extrabold text-[#172554] sm:text-3xl">
            Your cart is empty
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Add something to your cart before proceeding to checkout.
          </p>

          <Link
            to="/products"
            className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            Continue Shopping
            <FiArrowRight size={18} />
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#eef2ff] via-[#f8faff] to-[#e5ebf8] px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
            <Link to="/" className="transition hover:text-indigo-600">
              Home
            </Link>
            <span>/</span>
            <Link to="/cart" className="transition hover:text-indigo-600">
              Cart
            </Link>
            <span>/</span>
            <span className="font-semibold text-[#263968]">Checkout</span>
          </div>

          <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
            Almost There
          </span>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#172554] sm:text-4xl">
            Checkout
          </h1>

          <p className="mt-3 text-sm text-slate-500 sm:text-base">
            {user
              ? "Confirm your delivery details and choose how you would like to pay."
              : "Enter your delivery details. No account needed — you will get a secure tracking link."}
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">
          <section className="overflow-hidden rounded-2xl border border-[#d7dff2] bg-[#f8faff]/95 shadow-sm lg:col-span-2">
            <div className="flex items-center gap-3 border-b border-[#dfe6f5] px-5 py-5 sm:px-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <FiMapPin size={21} />
              </div>

              <div>
                <h2 className="text-lg font-extrabold text-[#172554]">
                  Delivery Details
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Where should we send your order?
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-7">
              {error && (
                <div
                  role="alert"
                  className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700"
                >
                  {error}
                </div>
              )}

              {user && addresses.length > 0 && (
                <div className="mb-6">
                  <p className={labelClass}>Saved addresses</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {addresses.map((address) => (
                      <button
                        key={address.id}
                        type="button"
                        onClick={() => applyAddress(address)}
                        className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                          selectedAddressId === String(address.id)
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-[#d7dff2] bg-white hover:border-indigo-300"
                        }`}
                      >
                        <span className="flex items-center justify-between font-bold text-[#172554]">
                          {address.label || "Address"}
                          {address.is_default && (
                            <span className="text-xs font-semibold text-emerald-600">
                              Default
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {address.recipient_name} · {address.city}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#263968]">
                  <FiUser size={17} className="text-indigo-600" />
                  Contact Information
                </h3>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="name" className={labelClass}>
                      Full Name *
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={handleChange}
                      maxLength={120}
                      required
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className={labelClass}>
                      Email Address *
                    </label>
                    <div className="relative">
                      <FiMail
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        maxLength={254}
                        required
                        className={`${inputClass} pl-11`}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className={labelClass}>
                      Phone Number *
                    </label>
                    <div className="relative">
                      <FiPhone
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="+880 1XXX XXXXXX"
                        value={formData.phone}
                        onChange={handleChange}
                        maxLength={40}
                        required
                        className={`${inputClass} pl-11`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#dfe6f5] pt-6">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#263968]">
                  <FiMapPin size={17} className="text-indigo-600" />
                  Shipping Address
                </h3>

                <div className="space-y-5">
                  <div>
                    <label htmlFor="address" className={labelClass}>
                      Street Address *
                    </label>
                    <input
                      id="address"
                      name="address"
                      type="text"
                      autoComplete="street-address"
                      placeholder="House number and street name"
                      value={formData.address}
                      onChange={handleChange}
                      maxLength={250}
                      required
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="address2" className={labelClass}>
                      Apartment or Suite (Optional)
                    </label>
                    <input
                      id="address2"
                      name="address2"
                      type="text"
                      placeholder="Apartment, suite, unit, etc."
                      value={formData.address2}
                      onChange={handleChange}
                      maxLength={250}
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="city" className={labelClass}>
                        City *
                      </label>
                      <input
                        id="city"
                        name="city"
                        type="text"
                        placeholder="City"
                        value={formData.city}
                        onChange={handleChange}
                        maxLength={120}
                        required
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor="state" className={labelClass}>
                        State / Division
                      </label>
                      <input
                        id="state"
                        name="state"
                        type="text"
                        placeholder="State or division"
                        value={formData.state}
                        onChange={handleChange}
                        maxLength={120}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor="country" className={labelClass}>
                        Country *
                      </label>
                      <input
                        id="country"
                        name="country"
                        type="text"
                        placeholder="Country"
                        value={formData.country}
                        onChange={handleChange}
                        maxLength={120}
                        required
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor="zip" className={labelClass}>
                        Postal Code *
                      </label>
                      <input
                        id="zip"
                        name="zip"
                        type="text"
                        autoComplete="postal-code"
                        placeholder="Enter postal code"
                        value={formData.zip}
                        onChange={handleChange}
                        maxLength={20}
                        required
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="notes" className={labelClass}>
                      Order Notes (Optional)
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      placeholder="Delivery instructions, landmarks, etc."
                      value={formData.notes}
                      onChange={handleChange}
                      maxLength={500}
                      className={`${inputClass} min-h-[90px] resize-y`}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-[#dfe6f5] pt-6">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#263968]">
                  <FiCreditCard size={17} className="text-indigo-600" />
                  Payment Method
                </h3>

                <div className="space-y-3">
                  {payment.onlineEnabled && (
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                        payment.method === "sslcommerz"
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-[#d7dff2] bg-white hover:border-indigo-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                        checked={payment.method === "sslcommerz"}
                        onChange={() =>
                          setPayment((p) => ({ ...p, method: "sslcommerz" }))
                        }
                      />
                      <span>
                        <span className="flex items-center gap-2 font-bold text-[#172554]">
                          <FiCreditCard size={16} /> Pay online
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          Secure payment via SSLCOMMERZ
                        </span>
                      </span>
                    </label>
                  )}

                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                      payment.method === "cod"
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-[#d7dff2] bg-white hover:border-indigo-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                      checked={payment.method === "cod"}
                      onChange={() =>
                        setPayment((p) => ({ ...p, method: "cod" }))
                      }
                    />
                    <span>
                      <span className="flex items-center gap-2 font-bold text-[#172554]">
                        <FiDollarSign size={16} /> Cash on Delivery
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        Pay with cash when your order arrives
                      </span>
                    </span>
                  </label>
                </div>

                {payment.method === "sslcommerz" && payment.channels.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {payment.channels.map((channel) => (
                      <button
                        key={channel}
                        type="button"
                        onClick={() =>
                          setPayment((p) => ({ ...p, channel }))
                        }
                        className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                          payment.channel === channel
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-[#d7dff2] bg-white text-[#263968] hover:border-indigo-300"
                        }`}
                      >
                        {CHANNEL_META[channel]?.label || channel}
                      </button>
                    ))}
                  </div>
                )}

                {!payment.onlineEnabled && (
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Online payment is currently unavailable. Cash on Delivery is
                    always available.
                  </p>
                )}
              </div>

              <div className="mt-7 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
                <div className="flex items-start gap-3">
                  <FiShield
                    size={19}
                    className="mt-0.5 shrink-0 text-indigo-600"
                  />
                  <p className="text-xs leading-5 text-slate-600">
                    {payment.onlineEnabled
                      ? "Online payments are processed securely by SSLCOMMERZ. We never store your card or mobile wallet credentials."
                      : "Your details are used to create and deliver your order. Payment is collected on delivery."}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  to="/cart"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#cbd5e8] px-4 py-3 text-sm font-bold text-[#263968] transition hover:bg-indigo-50"
                >
                  <FiArrowLeft size={17} />
                  Back to Cart
                </Link>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {submitting
                    ? "Placing order…"
                    : payment.method === "sslcommerz"
                      ? "Proceed to Payment"
                      : "Place Order"}
                  {!submitting && <FiArrowRight size={17} />}
                </button>
              </div>
            </form>
          </section>

          <aside className="rounded-2xl border border-[#d7dff2] bg-[#f8faff]/95 p-5 shadow-sm sm:p-6 lg:sticky lg:top-24">
            <h2 className="text-lg font-extrabold text-[#172554]">
              Order Summary
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {totalItems} {totalItems === 1 ? "item" : "items"}{" "}
              {isBuyNow ? "to buy now" : "in your cart"}
            </p>

            <div className="mt-6 max-h-80 space-y-4 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-[#dfe6f5] bg-[#edf1fc] p-2">
                    <img
                      src={item.image}
                      alt={item.title}
                      width="64"
                      height="64"
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain"
                    />

                    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#263968] px-1 text-[10px] font-bold text-white">
                      {item.quantity}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold leading-5 text-[#172554]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatCurrency(item.price)} × {item.quantity}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-bold text-[#172554]">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <div className="my-5 border-t border-dashed border-[#cbd5e8]" />

            <div className="space-y-4">
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-semibold text-[#263968]">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <div className="flex justify-between gap-3 text-sm">
                <span className="text-slate-500">Shipping</span>
                <span className="font-semibold text-[#263968]">
                  {formatCurrency(SHIPPING_FEE)}
                </span>
              </div>

              <div className="border-t border-[#dfe6f5]" />

              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-[#172554]">Total Amount</span>
                <span className="text-2xl font-extrabold tracking-tight text-[#172554]">
                  {formatCurrency(subtotal + SHIPPING_FEE)}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3 border-t border-[#dfe6f5] pt-5">
              <div className="flex items-center gap-3">
                <FiTruck size={18} className="shrink-0 text-indigo-600" />
                <p className="text-xs leading-5 text-slate-500">
                  Shipping fee is currently {formatCurrency(SHIPPING_FEE)}.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <FiPackage size={18} className="shrink-0 text-indigo-600" />
                <p className="text-xs leading-5 text-slate-500">
                  Review all products before confirming your order.
                </p>
              </div>

              {!user && (
                <div className="flex items-center gap-3">
                  <FiCheckCircle
                    size={18}
                    className="shrink-0 text-indigo-600"
                  />
                  <p className="text-xs leading-5 text-slate-500">
                    You will receive a secure tracking link after ordering.
                  </p>
                </div>
              )}
            </div>

            {!isBuyNow && (
              <Link
                to="/cart"
                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-indigo-700 transition hover:text-indigo-900"
              >
                <FiArrowLeft size={16} />
                Edit Cart
              </Link>
            )}
          </aside>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-[#d7dff2] pt-6 text-xs font-medium text-slate-500 sm:text-sm">
          <span className="flex items-center gap-2">
            <FiShield size={16} className="text-indigo-600" />
            Secure Checkout
          </span>
          <span className="flex items-center gap-2">
            <FiCheckCircle size={16} className="text-indigo-600" />
            {payment.onlineEnabled ? "bKash · Nagad · Card · COD" : "Cash on Delivery"}
          </span>
        </div>
      </div>
    </main>
  );
};

export default CheckOut;
