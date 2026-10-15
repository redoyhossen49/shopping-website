import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { FiArrowLeft, FiSave, FiImage } from "react-icons/fi";
import { adminApi } from "../../api/admin.js";
import { useToast } from "../components/Toast.jsx";
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Textarea,
} from "../components/ui.jsx";

const EMPTY_FORM = {
  title: "",
  description: "",
  price: "",
  category_id: "",
  image_url: "",
  stock: "0",
  sku: "",
  is_published: true,
  low_stock_threshold: "5",
};

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    adminApi
      .listCategories()
      .then((response) => setCategories(response.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;

    let active = true;
    setLoading(true);

    adminApi
      .getProduct(id)
      .then((response) => {
        if (!active) return;
        const product = response.data;
        setForm({
          title: product.title ?? "",
          description: product.description ?? "",
          price: String(product.price ?? ""),
          category_id: product.category_id ? String(product.category_id) : "",
          image_url: product.image_url ?? "",
          stock: String(product.stock ?? 0),
          sku: product.sku ?? "",
          is_published: product.is_published ?? true,
          low_stock_threshold: String(product.low_stock_threshold ?? 5),
        });
      })
      .catch((err) => active && setLoadError(err.message || "Failed to load product."))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [id, isEdit]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  };

  const validate = () => {
    const next = {};

    if (!form.title.trim()) next.title = "Title is required.";

    const price = Number(form.price);
    if (!form.price || Number.isNaN(price) || price <= 0) {
      next.price = "Enter a price greater than 0.";
    }

    if (!form.category_id) next.category_id = "Choose a category.";

    const stock = Number(form.stock);
    if (Number.isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
      next.stock = "Stock must be a whole number of 0 or more.";
    }

    if (
      form.low_stock_threshold !== "" &&
      (Number.isNaN(Number(form.low_stock_threshold)) ||
        Number(form.low_stock_threshold) < 0)
    ) {
      next.low_stock_threshold = "Threshold must be 0 or more.";
    }

    if (form.image_url && !/^https?:\/\//i.test(form.image_url)) {
      next.image_url = "Image URL must start with http:// or https://";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) return;

    setSubmitting(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      price: Number(form.price),
      category_id: Number(form.category_id),
      image_url: form.image_url.trim() || null,
      stock: Number(form.stock),
      sku: form.sku.trim() || null,
      is_published: form.is_published,
      low_stock_threshold:
        form.low_stock_threshold === ""
          ? null
          : Number(form.low_stock_threshold),
    };

    try {
      if (isEdit) {
        await adminApi.updateProduct(id, payload);
        toast.success("Product updated.");
      } else {
        await adminApi.createProduct(payload);
        toast.success("Product created.");
      }
      navigate("/admin/products");
    } catch (err) {
      if (err.details && typeof err.details === "object") {
        setErrors(err.details);
      }
      toast.error(err.message || "Could not save the product.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Card>
        <ErrorState message={loadError} onRetry={() => navigate(0)} />
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <PageHeader
        title={isEdit ? "Edit product" : "Add product"}
        description={
          isEdit
            ? "Update product details, pricing, and stock."
            : "Add a new item to your store catalog."
        }
        actions={
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"
          >
            <FiArrowLeft size={16} /> Back to products
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Product details" />
            <div className="space-y-5 p-5">
              <Field
                label="Title"
                htmlFor="title"
                required
                error={errors.title}
              >
                <Input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Wireless Noise-Cancelling Headphones"
                  maxLength={200}
                />
              </Field>

              <Field
                label="Description"
                htmlFor="description"
                error={errors.description}
              >
                <Textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={5}
                  maxLength={8000}
                  placeholder="Describe the product, its features, and materials."
                />
              </Field>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field
                  label="Price (৳)"
                  htmlFor="price"
                  required
                  error={errors.price}
                >
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </Field>

                <Field
                  label="Category"
                  htmlFor="category_id"
                  required
                  error={errors.category_id}
                >
                  <Select
                    id="category_id"
                    name="category_id"
                    value={form.category_id}
                    onChange={handleChange}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Field
                label="Image URL"
                htmlFor="image_url"
                error={errors.image_url}
              >
                <Input
                  id="image_url"
                  name="image_url"
                  value={form.image_url}
                  onChange={handleChange}
                  placeholder="https://example.com/image.jpg"
                />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Inventory" />
            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-3">
              <Field
                label="Stock quantity"
                htmlFor="stock"
                required
                error={errors.stock}
              >
                <Input
                  id="stock"
                  name="stock"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={handleChange}
                />
              </Field>

              <Field
                label="SKU"
                htmlFor="sku"
                error={errors.sku}
                hint="Optional. Must be unique."
              >
                <Input
                  id="sku"
                  name="sku"
                  value={form.sku}
                  onChange={handleChange}
                  placeholder="e.g. AUD-001"
                />
              </Field>

              <Field
                label="Low stock alert at"
                htmlFor="low_stock_threshold"
                error={errors.low_stock_threshold}
              >
                <Input
                  id="low_stock_threshold"
                  name="low_stock_threshold"
                  type="number"
                  min="0"
                  step="1"
                  value={form.low_stock_threshold}
                  onChange={handleChange}
                />
              </Field>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Status" />
            <div className="p-5">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="is_published"
                  checked={form.is_published}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  <span className="block text-sm font-semibold text-[#172554]">
                    Published
                  </span>
                  <span className="block text-xs text-slate-500">
                    Uncheck to hide this product from the storefront.
                  </span>
                </span>
              </label>
            </div>
          </Card>

          <Card>
            <CardHeader title="Preview" />
            <div className="p-5">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-[#E3E9F7] bg-white">
                {form.image_url ? (
                  <img
                    src={form.image_url}
                    alt="Product preview"
                    className="h-full w-full object-contain p-4"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <span className="flex flex-col items-center gap-2 text-slate-300">
                    <FiImage size={36} />
                    <span className="text-xs">No image</span>
                  </span>
                )}
              </div>
              <p className="mt-3 line-clamp-2 text-sm font-semibold text-[#172554]">
                {form.title || "Product title"}
              </p>
              <p className="text-sm text-slate-500">
                {categories.find((c) => String(c.id) === form.category_id)?.name ||
                  "Category"}
              </p>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1" loading={submitting}>
              <FiSave size={16} />
              {isEdit ? "Save changes" : "Create product"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/admin/products")}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
