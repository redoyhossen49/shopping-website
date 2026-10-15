import { useEffect, useState } from "react";
import { FaStar } from "react-icons/fa";
import { useCart } from "../components/Context/CartContext";
import { Link, useNavigate, useParams } from "react-router-dom";
import { listProducts } from "../api/products.js";
import { API_BASE } from "../config/app.js";
import { formatCurrency } from "../utils/format.js";

const ProductPage = () => {
  const [product, setProduct] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, startBuyNow } = useCart();
  const params = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetch(`${API_BASE}/products/${params.id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((result) => {
        if (!active || !result?.success) return;
        const data = result.data;
        setProduct({
          ...data,
          image: data.image_url,
          rating: {
            rate: data.rating_rate,
            count: data.rating_count,
          },
        });
      })
      .catch(() => {
        if (active) setProduct(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  useEffect(() => {
    if (!product?.category_id) {
      setSimilar([]);
      return undefined;
    }

    let active = true;

    listProducts({ category_id: product.category_id, limit: 8, sort: "id", order: "asc" })
      .then((result) => {
        if (!active || !result?.success || !Array.isArray(result.data)) return;

        setSimilar(
          result.data
            .filter((item) => item.id !== product.id)
            .map((item) => ({
              ...item,
              image: item.image_url,
              rating: { rate: item.rating_rate, count: item.rating_count },
            }))
            .slice(0, 8)
        );
      })
      .catch(() => {
        if (active) setSimilar([]);
      });

    return () => {
      active = false;
    };
  }, [product?.category_id, product?.id]);

  if (loading) {
    return <div className="pt-24 text-center text-slate-500">Loading product…</div>;
  }

  if (!product) {
    return (
      <div className="container mx-auto flex flex-col items-center gap-4 pt-24 text-center">
        <p className="text-lg font-semibold text-[#172554]">
          We could not find that product.
        </p>
        <Link
          to="/products"
          className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
        >
          Back to products
        </Link>
      </div>
    );
  }

  const { title, image, category, rating, price, description } = product;

  const similarProducts = similar;

  const handleBuyNow = () => {
    startBuyNow(product, 1);
    navigate("/checkout");
  };

  return (
    <div className="container overflow-x-hidden mx-auto pt-24">
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div className="flex justify-center">
          <img
            className="w-[250px] h-[250px] md:w-[350px] md:h-[350px] object-contain rounded-lg hover:scale-105 transition-transform duration-300"
            src={image}
            alt={title}
            width="350"
            height="350"
            decoding="async"
            fetchPriority="high"
          />
        </div>

        <div className="space-y-6">
          <h4 className="uppercase text-xl text-gray-600 font-bold">
            {category}
          </h4>
          <h1 className="text-2xl text-gray-500">{title}</h1>
          {rating?.rate ? (
            <p className="text-lg text-gray-500 my-2 flex items-center gap-2">
              {rating.rate} <FaStar className="text-yellow-600" />
              <span className="text-sm text-gray-400">
                ({rating.count || 0})
              </span>
            </p>
          ) : null}
          <p className="text-3xl text-gray-500">{formatCurrency(price)}</p>
          <p className="text-gray-500">{description}</p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => addToCart(product)}
              className="px-4 py-2 border border-black text-black rounded-lg hover:bg-black hover:text-white transition-all duration-300"
            >
              Add to Cart
            </button>
            <button
              onClick={handleBuyNow}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-300"
            >
              Buy Now
            </button>
            <Link
              to="/cart"
              className="px-4 py-2 text-center bg-gray-900 text-white rounded-lg hover:bg-gray-600 transition-all duration-300"
            >
              Go To Cart
            </Link>
          </div>
        </div>
      </div>

      {similarProducts.length > 0 && (
        <div className="hidden md:block container mx-auto mt-12">
          <h2 className="text-2xl font-bold text-gray-700 mb-8">
            You may also like
          </h2>

          <div className="overflow-hidden">
            <div
              className="flex gap-4 animate-scroll hover:[animation-play-state:paused]"
              style={{ width: "max-content" }}
            >
              {[...similarProducts, ...similarProducts].map((item, idx) => (
                <div
                  key={idx}
                  className="border border-gray-400 rounded p-4 mb-8"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    width="240"
                    height="240"
                    loading="lazy"
                    decoding="async"
                    className="object-contain w-60 h-60"
                  />
                  <h2 className="text-center my-8 font-bold text-xl text-gray-700">
                    {item.title.length > 12
                      ? item.title.substring(0, 12) + "..."
                      : item.title}
                  </h2>
                  <div className="border-t border-gray-300 text-center pt-3 pb-4 flex flex-col md:flex-row items-center md:justify-center gap-4">
                    <button
                      onClick={() => {
                        startBuyNow(item, 1);
                        navigate("/checkout");
                      }}
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-700 transition-all duration-300"
                    >
                      Buy Now
                    </button>

                    <button
                      onClick={() => addToCart(item)}
                      className="px-4 py-2 border border-black text-black rounded-lg hover:bg-black hover:text-white transition-all duration-300"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPage;
