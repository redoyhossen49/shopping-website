
import { Link } from "react-router-dom";
import {
  FiShoppingBag,
  FiTrash2,
  FiMinus,
  FiPlus,
  FiArrowRight,
  FiArrowLeft,
  FiShield,
  FiTruck,
  FiPackage,
} from "react-icons/fi";
import { useCart } from "../components/Context/CartContext";

const SHIPPING_COST = 30;

const Cart = () => {
  const {
    cartItems,
    addToCart,
    decreaseQuantity,
    removeFromCart,
    totalAmount,
  } = useCart();

  const totalItems = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const formatPrice = (price) => Number(price).toFixed(2);

  return (
    <main className="min-h-[70vh] bg-gradient-to-br from-[#eef2ff] via-[#f8faff] to-[#e5ebf8] px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Page heading */}
        <div className="mb-8 sm:mb-10">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
            <Link to="/" className="transition hover:text-indigo-600">
              Home
            </Link>
            <span>/</span>
            <span className="font-semibold text-[#263968]">Shopping Cart</span>
          </div>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
                Your Shopping Bag
              </span>

              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#172554] sm:text-4xl">
                Shopping Cart
              </h1>

              <p className="mt-3 text-sm text-slate-500 sm:text-base">
                Review your items and get ready for checkout.
              </p>
            </div>

            {cartItems.length > 0 && (
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#d7dff2] bg-white/80 px-4 py-2 text-sm font-semibold text-[#263968]">
                <FiShoppingBag size={17} className="text-indigo-600" />
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </span>
            )}
          </div>
        </div>

        {/* Empty cart */}
        {cartItems.length === 0 ? (
          <section className="rounded-3xl border border-white/80 bg-[#f8faff]/90 px-5 py-14 text-center shadow-lg shadow-[#172554]/5 sm:py-20">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600">
              <FiShoppingBag size={42} strokeWidth={1.5} />
            </div>

            <h2 className="mt-6 text-2xl font-extrabold text-[#172554]">
              Your cart is waiting
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500 sm:text-base">
              You haven't added anything to your cart yet. Explore our
              collection and find something you love.
            </p>

            <Link
              to="/products"
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700"
            >
              Explore Products
              <FiArrowRight size={18} />
            </Link>
          </section>
        ) : (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">
            {/* Cart items */}
            <section className="overflow-hidden rounded-2xl border border-[#d7dff2] bg-[#f8faff]/95 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between border-b border-[#dfe6f5] px-5 py-5 sm:px-6">
                <div>
                  <h2 className="text-lg font-bold text-[#172554]">
                    Your Items
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Review quantity and pricing.
                  </p>
                </div>

                <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
                  {cartItems.length} products
                </span>
              </div>

              <div className="divide-y divide-[#dfe6f5] px-4 sm:px-6">
                {cartItems.map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center"
                  >
                    {/* Product image */}
                    <Link
                      to={`/product/${item.id}`}
                      aria-label={`View ${item.title}`}
                      className="flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e1e7f5] bg-gradient-to-br from-[#edf1fc] to-[#e2e8f6] p-4 sm:h-28 sm:w-28"
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        width="112"
                        height="112"
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain transition-transform duration-300 hover:scale-105"
                      />
                    </Link>

                    {/* Product details */}
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/product/${item.id}`}
                        className="line-clamp-2 text-base font-bold leading-6 text-[#172554] transition hover:text-indigo-600"
                      >
                        {item.title}
                      </Link>

                      <p className="mt-2 text-sm text-slate-500">
                        Unit price:{" "}
                        <span className="font-semibold text-[#263968]">
                          ${formatPrice(item.price)}
                        </span>
                      </p>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-rose-600 transition hover:text-rose-700"
                        aria-label={`Remove ${item.title} from cart`}
                      >
                        <FiTrash2 size={15} />
                        Remove
                      </button>
                    </div>

                    {/* Quantity and subtotal */}
                    <div className="flex flex-row items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
                      <div className="inline-flex items-center rounded-xl border border-[#d7dff2] bg-white p-1">
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item.id)}
                          disabled={item.quantity <= 1}
                          aria-label={`Decrease quantity of ${item.title}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#263968] transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <FiMinus size={15} />
                        </button>

                        <span className="min-w-9 text-center text-sm font-bold text-[#172554]">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          aria-label={`Increase quantity of ${item.title}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#263968] transition hover:bg-indigo-50"
                        >
                          <FiPlus size={15} />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-medium text-slate-500">
                          Subtotal
                        </p>
                        <p className="mt-1 text-lg font-extrabold text-[#172554]">
                          ${formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="border-t border-[#dfe6f5] bg-[#eef2fc]/70 px-5 py-4 sm:px-6">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700 transition hover:text-indigo-900"
                >
                  <FiArrowLeft size={17} />
                  Continue Shopping
                </Link>
              </div>
            </section>

            {/* Order summary */}
            <aside className="rounded-2xl border border-[#d7dff2] bg-[#f8faff]/95 p-5 shadow-sm sm:p-6 lg:sticky lg:top-24">
              <h2 className="text-lg font-extrabold text-[#172554]">
                Order Summary
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Review your order total.
              </p>

              <div className="my-6 space-y-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">
                    Products ({totalItems})
                  </span>
                  <span className="font-semibold text-[#263968]">
                    ${formatPrice(totalAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">Shipping</span>
                  <span className="font-semibold text-[#263968]">
                    ${formatPrice(SHIPPING_COST)}
                  </span>
                </div>

                <div className="border-t border-dashed border-[#cbd5e8]" />

                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-[#172554]">
                    Total Amount
                  </span>
                  <span className="text-2xl font-extrabold tracking-tight text-[#172554]">
                    ${formatPrice(totalAmount + SHIPPING_COST)}
                  </span>
                </div>
              </div>

              <Link
                to="/checkout"
                className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl"
              >
                Proceed to Checkout
                <FiArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>

              <div className="mt-5 space-y-3 border-t border-[#dfe6f5] pt-5">
                <div className="flex items-center gap-3">
                  <FiTruck className="shrink-0 text-indigo-600" size={19} />
                  <p className="text-xs leading-5 text-slate-500">
                    Shipping fee is currently fixed at $30.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <FiPackage className="shrink-0 text-indigo-600" size={19} />
                  <p className="text-xs leading-5 text-slate-500">
                    Review your order details before checkout.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <FiShield className="shrink-0 text-indigo-600" size={19} />
                  <p className="text-xs leading-5 text-slate-500">
                    Keep your account and payment details private.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
};

export default Cart;
