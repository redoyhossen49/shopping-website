import { createContext, useState, useCallback, useRef } from "react";
import { listProducts } from "../../api/products.js";

export const ProductsContext = createContext();

function formatProduct(product) {
  return {
    ...product,
    image: product.image_url,
    rating: {
      rate: product.rating_rate,
      count: product.rating_count,
    },
  };
}

const EMPTY_META = { page: 1, limit: 6, total: 0, totalPages: 1 };

/**
 * Paginated product store. The storefront asks the server for one page at a
 * time (default 6) instead of downloading the whole catalogue. Callers pass
 * page/filter/sort options; the server decides what is in scope (owner data,
 * or demo data when the deployment runs in demo mode).
 */
export const ProductsProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState(EMPTY_META);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(null);

  const load = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);

    const request = listProducts(params);

    inFlight.current = request;

    try {
      const result = await request;

      if (inFlight.current !== request) {
        return null;
      }

      if (!result?.success || !Array.isArray(result.data)) {
        throw new Error("Invalid product data received");
      }

      const formatted = result.data.map(formatProduct);
      setProducts(formatted);
      setMeta(result.meta ?? { ...EMPTY_META, total: formatted.length });
      return { data: formatted, meta: result.meta };
    } catch (err) {
      if (inFlight.current === request) {
        setError(err.message);
      }
      return null;
    } finally {
      if (inFlight.current === request) {
        inFlight.current = null;
        setLoading(false);
      }
    }
  }, []);

  return (
    <ProductsContext.Provider
      value={{ products, meta, loading, error, load }}
    >
      {children}
    </ProductsContext.Provider>
  );
};
