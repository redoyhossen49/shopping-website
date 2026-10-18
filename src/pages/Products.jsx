import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Product from "./Product";
import { useLocation } from "react-router-dom";

import { ProductsContext } from "../components/Context/ProductsContext";
import { listCategories } from "../api/categories.js";

const PAGE_SIZE = 6;

const SORT_OPTIONS = [
  { value: "created_at:desc", label: "Newest" },
  { value: "price:asc", label: "Price: Low to High" },
  { value: "price:desc", label: "Price: High to Low" },
  { value: "title:asc", label: "Name: A to Z" },
  { value: "title:desc", label: "Name: Z to A" },
];

const AVAILABILITY_OPTIONS = [
  { value: "", label: "All availability" },
  { value: "in", label: "In stock" },
  { value: "out", label: "Out of stock" },
];

function ProductSkeleton() {
  return (
    <div className="flex h-full animate-pulse flex-col overflow-hidden rounded-2xl border border-[#d7dff2] bg-[#f8faff] shadow-sm">
      <div className="h-56 bg-[#dfe6f5] sm:h-64" />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="h-5 w-4/5 rounded bg-[#dfe6f5]" />
        <div className="mt-2 h-4 w-full rounded bg-[#e6ebf7]" />
        <div className="mt-1 h-4 w-2/3 rounded bg-[#e6ebf7]" />
        <div className="mt-4 h-10 rounded bg-[#e6ebf7]" />
        <div className="mt-5 h-11 rounded-xl bg-[#e6ebf7]" />
      </div>
    </div>
  );
}

// Compact numbered pager window with ellipses, e.g. 1 … 4 5 6 … 12
function pageWindow(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const wanted = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...wanted]
    .filter((value) => value >= 1 && value <= total)
    .sort((a, b) => a - b);

  const result = [];
  let previous = 0;

  for (const value of sorted) {
    if (value - previous > 1) {
      result.push("gap");
    }
    result.push(value);
    previous = value;
  }

  return result;
}

const Products = () => {
  const { products, meta, loading, error, load } = useContext(ProductsContext);
  const sectionRef = useRef(null);
  const pendingScrollRef = useRef(false);

  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("created_at:desc");
  const [availability, setAvailability] = useState("");
  const location = useLocation();
  const paddingClass =
    location.pathname === "/products" ? "pt-24 mt-4" : "pt-10 ";

  useEffect(() => {
    let active = true;

    listCategories()
      .then((result) => {
        if (active && result?.success && Array.isArray(result.data)) {
          setCategories(result.data);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  // Debounce the free-text search so we issue one request per pause, not per
  // keystroke. A new search always returns the user to page 1.
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(handle);
  }, [searchInput]);

  const reload = useCallback(() => {
    const [sortColumn, order] = sort.split(":");

    return load({
      page,
      limit: PAGE_SIZE,
      category: category || undefined,
      search: search || undefined,
      availability: availability || undefined,
      sort: sortColumn,
      order,
    });
  }, [load, page, category, search, availability, sort]);

  useEffect(() => {
    reload();
  }, [reload]);

 

  const showSkeleton = loading && products.length === 0;
  const totalPages = meta?.totalPages ?? 1;
  const currentPage = meta?.page ?? page;

  // Smooth-scroll to the top of the products section (not the page top) only
  // after a pagination interaction and once the new page has rendered. The
  // sticky header height is measured so the section is never hidden under it.
  useEffect(() => {
    if (!pendingScrollRef.current || loading) return;

    pendingScrollRef.current = false;

    const target = sectionRef.current;
    if (!target) return;

    const header =
      document.querySelector("header.sticky") || document.querySelector("header");
    const headerHeight = header ? header.getBoundingClientRect().height : 0;

    const targetTop =
      target.getBoundingClientRect().top + window.scrollY - headerHeight - 16;

    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
  }, [meta, loading, products]);

  const changeCategory = (value) => {
    setCategory(value);
    setPage(1);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const changeSort = (event) => {
    setSort(event.target.value);
    setPage(1);
  };

  const changeAvailability = (event) => {
    setAvailability(event.target.value);
    setPage(1);
  };

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage) {
      return;
    }

    pendingScrollRef.current = true;
    setPage(nextPage);
  };

  const emptyMessage = search
    ? `No products match "${search}".`
    : "No products found in this category yet.";

  return (
    <div ref={sectionRef} className={paddingClass}>
      <h2 className="text-3xl md:text-5xl text-center text-gray-700 mb-4">
        Latest Products
      </h2>

      <div className="w-[80%] h-[2px] bg-gray-500 mx-auto mt-4 mb-12"></div>

      <div className="mx-auto mb-8 flex max-w-6xl flex-col gap-4 px-4 lg:flex-row lg:items-center lg:justify-between">
        <form
          onSubmit={handleSearchSubmit}
          role="search"
          className="flex w-full items-center gap-2 lg:max-w-md"
        >
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search products..."
            aria-label="Search products"
            className="w-full rounded-lg border border-[#c8d3ea] bg-white px-3 py-2 text-sm text-blue-950 outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="rounded-lg border px-4 py-2 text-sm transition hover:bg-gray-800 hover:text-white"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="whitespace-nowrap">Sort</span>
            <select
              value={sort}
              onChange={changeSort}
              className="rounded-lg border border-[#c8d3ea] bg-white px-3 py-2 text-sm text-blue-950 outline-none focus:border-indigo-500"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="whitespace-nowrap">Availability</span>
            <select
              value={availability}
              onChange={changeAvailability}
              className="rounded-lg border border-[#c8d3ea] bg-white px-3 py-2 text-sm text-blue-950 outline-none focus:border-indigo-500"
            >
              {AVAILABILITY_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className=" flex flex-wrap gap-4 justify-center items-center md:mb-3 mx-4">
        <button
          onClick={() => changeCategory("")}
          className={`border rounded p-2 text-center text-xs md:text-sm hover:bg-gray-800 hover:text-white ${
            category === "" ? "bg-gray-800 text-white" : ""
          }`}
        >
          All
        </button>
        {categories.map((item) => (
          <button
            key={item.id ?? item.slug}
            onClick={() => changeCategory(item.slug)}
            className={`border rounded p-2 text-center text-xs md:text-sm hover:bg-gray-800 hover:text-white ${
              category === item.slug ? "bg-gray-800 text-white" : ""
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>

      {showSkeleton ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 max-w-6xl mx-auto justify-center">
          {Array.from({ length: PAGE_SIZE }).map((_, index) => (
            <ProductSkeleton key={index} />
          ))}
        </div>
      ) : error && products.length === 0 ? (
        <div className="p-6 text-center text-sm text-slate-500">
          <p>We could not load products right now. Please try again.</p>
          <button
            type="button"
            onClick={reload}
            className="mt-3 rounded border px-4 py-2 transition hover:bg-gray-800 hover:text-white"
          >
            Try again
          </button>
        </div>
      ) : products.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <>
          {error && (
            <div className="mx-auto mb-4 flex max-w-6xl items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              <span>Some results could not be refreshed.</span>
              <button
                type="button"
                onClick={reload}
                className="rounded border border-amber-300 px-3 py-1 text-xs transition hover:bg-amber-100"
              >
                Retry
              </button>
            </div>
          )}

          <div
  id="first-product-position"
  className="scroll-mt-24"
>
  <div
    className={`grid grid-cols-1 md:grid-cols-3 gap-6 p-6 max-w-6xl mx-auto justify-center transition-opacity duration-200 ${
      loading ? "opacity-60" : "opacity-100"
    }`}
  >
    {products.map((product) => (
      <Product key={product.id} product={product} />
    ))}
  </div>
</div>

          {totalPages > 1 && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 pb-6">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="rounded border px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-800 hover:text-white"
              >
                Previous
              </button>

              {pageWindow(currentPage, totalPages).map((item, index) =>
                item === "gap" ? (
                  <span
                    key={`gap-${index}`}
                    className="px-1 text-sm text-gray-400"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => goToPage(item)}
                    aria-current={item === currentPage ? "page" : undefined}
                    className={`min-w-[2.5rem] rounded border px-3 py-2 text-sm transition hover:bg-gray-800 hover:text-white ${
                      item === currentPage ? "bg-gray-800 text-white" : ""
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="rounded border px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-800 hover:text-white"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Products;
