import { useCallback, useEffect, useState } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiTag } from "react-icons/fi";
import { adminApi } from "../../api/admin.js";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  PageHeader,
  ReadOnlyNotice,
  TableSkeleton,
  Textarea,
} from "../components/ui.jsx";
import { formatNumber } from "../../utils/format.js";

const EMPTY = { name: "", description: "", image_url: "" };

export default function AdminCategories() {
  const toast = useToast();
  const { isReadOnly } = useAdminAuth();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminApi.listCategories();
      setCategories(response.data || []);
    } catch (err) {
      setError(err.message || "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm(EMPTY);
    setFormError("");
    setEditor({ mode: "create" });
  };

  const openEdit = (category) => {
    setForm({
      name: category.name || "",
      description: category.description || "",
      image_url: category.image_url || "",
    });
    setFormError("");
    setEditor({ mode: "edit", category });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setFormError("Category name is required.");
      return;
    }

    setSaving(true);
    setFormError("");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
    };

    try {
      if (editor.mode === "edit") {
        await adminApi.updateCategory(editor.category.id, payload);
        toast.success("Category updated.");
      } else {
        await adminApi.createCategory(payload);
        toast.success("Category created.");
      }
      setEditor(null);
      load();
    } catch (err) {
      setFormError(err.message || "Could not save the category.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);

    try {
      await adminApi.deleteCategory(pendingDelete.id);
      toast.success("Category deleted.");
      setPendingDelete(null);
      load();
    } catch (err) {
      toast.error(err.message || "Could not delete this category.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Organize your catalog into shoppable groups."
        breadcrumb={[{ label: "Categories" }]}
        actions={
          isReadOnly ? undefined : (
            <Button onClick={openCreate}>
              <FiPlus size={16} /> New category
            </Button>
          )
        }
      />

      {isReadOnly && <ReadOnlyNotice />}

      <Card>
        {loading ? (
          <TableSkeleton rows={5} columns={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={FiTag}
            title="No categories yet"
            description="Create your first category to start organizing products."
            action={
              isReadOnly ? undefined : (
                <Button onClick={openCreate}>
                  <FiPlus size={16} /> New category
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[#EEF2FC] text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Slug</th>
                  <th className="px-5 py-3 font-semibold">Products</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-indigo-50/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {category.image_url ? (
                          <img
                            src={category.image_url}
                            alt={category.name}
                            className="h-9 w-9 rounded-lg border border-[#E3E9F7] bg-white object-cover"
                          />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                            <FiTag size={16} />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-[#172554]">
                            {category.name}
                          </p>
                          {category.description && (
                            <p className="max-w-[320px] truncate text-xs text-slate-500">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      {category.slug}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {formatNumber(category.product_count)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`${isReadOnly ? "View" : "Edit"} ${category.name}`}
                          onClick={() => openEdit(category)}
                        >
                          <FiEdit2 size={16} />
                        </Button>
                        {!isReadOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Delete ${category.name}`}
                            className="text-rose-600 hover:bg-rose-50"
                            onClick={() => setPendingDelete(category)}
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
        )}
      </Card>

      <Modal
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        title={
          isReadOnly
            ? "Category details"
            : editor?.mode === "edit"
              ? "Edit category"
              : "New category"
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {isReadOnly && <ReadOnlyNotice />}

          <fieldset disabled={isReadOnly} className="contents">
          {formError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formError}
            </div>
          )}

          <Field label="Name" htmlFor="cat-name" required>
            <Input
              id="cat-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Electronics"
              maxLength={120}
              autoFocus
            />
          </Field>

          <Field label="Description" htmlFor="cat-description">
            <Textarea
              id="cat-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              maxLength={2000}
              placeholder="Short description shown to shoppers."
            />
          </Field>

          <Field label="Image URL" htmlFor="cat-image">
            <Input
              id="cat-image"
              name="image_url"
              value={form.image_url}
              onChange={handleChange}
              placeholder="https://example.com/category.jpg"
            />
          </Field>

          </fieldset>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditor(null)}
            >
              {isReadOnly ? "Close" : "Cancel"}
            </Button>
            {!isReadOnly && (
              <Button type="submit" loading={saving}>
                {editor?.mode === "edit" ? "Save changes" : "Create category"}
              </Button>
            )}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete category"
        message={
          pendingDelete
            ? `Delete "${pendingDelete.name}"? This is only possible when no products use it.`
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
