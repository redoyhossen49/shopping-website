import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiPlus, FiEdit2, FiTrash2, FiPackage, FiRefreshCw } from "react-icons/fi";
import { adminApi } from "../../api/admin.js";
import useDebouncedValue from "../hooks/useDebouncedValue.js";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { useAdminBase } from "../context/AdminBaseContext.jsx";
import { useToast } from "../components/Toast.jsx";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  LinkButton,
  PageHeader,
  Pagination,
  Select,
  StockBadge,
  TableSkeleton,
} from "../components/ui.jsx";
import { formatCurrency, formatDate } from "../../utils/format.js";

const SORT_OPTIONS = [
  { value: "created_at:desc", label: "Newest first" },
  { value: "created_at:asc", label: "Oldest first" },
  { value: "title:asc", label: "Name A–Z" },
  { value: "title:desc", label: "Name Z–A" },
  { value: "price:desc", label: "Price high–low" },
  { value: "price:asc", label: "Price low–high" },
  { value: "stock:asc", label: "Stock low–high" },
  { value: "stock:desc", label: "Stock high–low" },
];

export default function AdminProducts() {
  const toast = useToast();
  const { isReadOnly } = useAdminAuth();
  const { to } = useAdminBase();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [query, setQuery] = useState({
    page: 1,
    limit: 10,
    search: "",
    category_id: "",
    stock_status: "",
    published: "",
    sort: "created_at:desc",
  });

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");

    const [sortColumn, order] = query.sort.split(":");

    try {
      const response = await adminApi.listProducts({
        page: query.page,
        limit: query.limit,
        search: query.search,
        category_id: query.category_id,
        stock_status: query.stock_status,
        published: query.published,
        sort: sortColumn,
        order,
      });

      if (requestId.current !== id) return;

      setProducts(response.data || []);
      setMeta(response.meta || null);
    } catch (err) {
      if (requestId.current !== id) return;
      setError(err.message || "Failed to load products.");
    } finally {
      if (requestId.current === id) {
        setLoading(false);
      }
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    adminApi
      .listCategories()
      .then((response) => setCategories(response.data || []))
      .catch(() => {});
  }, []);

  const debouncedSearch = useDebouncedValue(searchInput.trim());

  useEffect(() => {
    setQuery((previous) =>
      previous.search === debouncedSearch
        ? previous
        : { ...previous, page: 1, search: debouncedSearch }
    );
  }, [debouncedSearch]);

  const updateQuery = (patch) =>
    setQuery((previous) => ({ ...previous, page: 1, ...patch }));

  const handleSearch = (event) => {
    event.preventDefault();
    updateQuery({ search: searchInput.trim() });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);

    try {
      const result = await adminApi.deleteProduct(pendingDelete.id);
      const ordered = result.data?.orderedIn || 0;
      toast.success(
        ordered > 0
          ? "Product deleted. Existing order history was preserved."
          : "Product deleted."
      );
      setPendingDelete(null);
      load();
    } catch (err) {
      toast.error(err.message || "Could not delete this product.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Create, edit, and manage your catalog."
        breadcrumb={[{ label: "Products" }]}
        actions={
          isReadOnly ? undefined : (
            <LinkButton to={to("/products/new")} variant="primary">
              <FiPlus size={16} /> Add product
            </LinkButton>
          )
        }
      />

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <form onSubmit={handleSearch} className="flex gap-2 lg:col-span-4">
            <Input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name or SKU"
            />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>

          <Select
            aria-label="Filter by category"
            value={query.category_id}
            onChange={(event) => updateQuery({ category_id: event.target.value })}
            className="lg:col-span-3"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filter by stock"
            value={query.stock_status}
            onChange={(event) =>
              updateQuery({ stock_status: event.target.value })
            }
            className="lg:col-span-2"
          >
            <option value="">Any stock</option>
            <option value="in">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </Select>

          <Select
            aria-label="Filter by publication"
            value={query.published}
            onChange={(event) => updateQuery({ published: event.target.value })}
            className="lg:col-span-2"
          >
            <option value="">All statuses</option>
            <option value="true">Published</option>
            <option value="false">Draft</option>
          </Select>

          <div className="lg:col-span-1">
            <Button
              variant="secondary"
              onClick={load}
              className="w-full"
              aria-label="Refresh"
            >
              <FiRefreshCw size={16} />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Select
            aria-label="Sort products"
            value={query.sort}
            onChange={(event) => updateQuery({ sort: event.target.value })}
            className="max-w-xs"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={FiPackage}
            title="No products found"
            description="Adjust your filters or add a new product to your catalog."
            action={
              isReadOnly ? undefined : (
                <LinkButton to={to("/products/new")}>
                  <FiPlus size={16} /> Add product
                </LinkButton>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-[#EEF2FC] text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Product</th>
                    <th className="px-5 py-3 font-semibold">Category</th>
                    <th className="px-5 py-3 font-semibold">Price</th>
                    <th className="px-5 py-3 font-semibold">Stock</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Added</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-indigo-50/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.title}
                              className="h-10 w-10 rounded-lg border border-[#E3E9F7] bg-white object-contain p-1"
                            />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                              <FiPackage size={18} />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="max-w-[240px] truncate font-semibold text-[#172554]">
                              {product.title}
                            </p>
                            {product.sku && (
                              <p className="text-xs text-slate-400">
                                SKU {product.sku}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {product.category_name || product.category || "—"}
                      </td>
                      <td className="px-5 py-3 font-semibold text-[#172554]">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="px-5 py-3">
                        <StockBadge
                          stock={product.stock}
                          threshold={product.low_stock_threshold}
                        />
                      </td>
                      <td className="px-5 py-3">
                        {product.is_published ? (
                          <Badge tone="green">Published</Badge>
                        ) : (
                          <Badge tone="neutral">Draft</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {formatDate(product.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`${isReadOnly ? "View" : "Edit"} ${product.title}`}
                            onClick={() =>
                              navigate(to(`/products/${product.id}/edit`))
                            }
                          >
                            <FiEdit2 size={16} />
                          </Button>
                          {!isReadOnly && (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Delete ${product.title}`}
                              className="text-rose-600 hover:bg-rose-50"
                              onClick={() => setPendingDelete(product)}
                            >
                              <FiTrash2 size={16} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              meta={meta}
              onPageChange={(page) =>
                setQuery((previous) => ({ ...previous, page }))
              }
              onPageSizeChange={(limit) =>
                setQuery((previous) => ({ ...previous, page: 1, limit }))
              }
            />
          </>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete product"
        message={
          pendingDelete
            ? `Delete "${pendingDelete.title}"? Existing order history keeps a snapshot of the item and will not be removed.`
            : ""
        }
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
