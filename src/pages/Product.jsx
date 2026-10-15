
import { Link, useNavigate } from "react-router-dom";
import { FiShoppingCart, FiArrowUpRight, FiZap } from "react-icons/fi";
import { useCart } from "../components/Context/CartContext";

const Product = ({ product }) => {
  const { image, title, price, description } = product;
  const { addToCart, startBuyNow } = useCart();
  const navigate = useNavigate();

  const handleBuyNow = () => {
    startBuyNow(product, 1);
    navigate("/checkout");
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#d7dff2] bg-[#f8faff] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-[#172554]/10">
      {/* Product Image */}
      <Link
        to={"/product/" + product.id}
        aria-label={`View ${title}`}
        className="relative flex h-56 items-center justify-center overflow-hidden bg-gradient-to-br from-[#e8edfa] to-[#dfe6f5] p-6 sm:h-64"
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/50 blur-2xl" />

        <img
          src={image}
          alt={title}
          width="400"
          height="400"
          loading="lazy"
          decoding="async"
          className="relative h-full w-full object-contain transition-transform duration-500 group-hover:scale-110"
        />

        <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/90 text-blue-950 opacity-0 shadow-sm transition-all duration-300 group-hover:opacity-100">
          <FiArrowUpRight size={18} />
        </span>
      </Link>

      {/* Product Details */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <Link
          to={"/product/" + product.id}
          className="line-clamp-2 min-h-12 text-base font-bold leading-6 text-[#172554] transition-colors hover:text-indigo-600 sm:text-lg"
        >
          {title}
        </Link>

        <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
          {description}
        </p>

        {/* Price */}
        <div className="mt-4 flex items-center justify-between border-t border-[#dfe6f5] pt-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Price
            </p>
            <p className="mt-1 text-xl font-extrabold tracking-tight text-[#172554]">
              ${Number(price).toFixed(2)}
            </p>
          </div>

          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100">
            <FiShoppingCart size={18} />
          </span>
        </div>

        {/* Actions */}
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link
            to={"/product/" + product.id}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#cbd5e8] bg-transparent px-3 py-2.5 text-sm font-semibold text-[#172554] transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            View Details
          </Link>

          <button
            type="button"
            onClick={() => addToCart(product)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 active:scale-[0.98]"
          >
            <FiShoppingCart size={16} />
            Add to Cart
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-950 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-900 active:scale-[0.98] sm:col-span-2"
          >
            <FiZap size={16} />
            Buy Now
          </button>
        </div>
      </div>
    </article>
  );
};

export default Product;
