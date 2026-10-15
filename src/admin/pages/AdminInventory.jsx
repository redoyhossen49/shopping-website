import { useCallback, useEffect, useState } from "react";
import { FiActivity, FiDownload, FiPackage, FiRefreshCw } from "react-icons/fi";
import { adminApi } from "../../api/admin.js";
import { useToast } from "../components/Toast.jsx";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  StockBadge,
  TableSkeleton,
} from "../components/ui.jsx";
import { formatDateTime, formatNumber } from "../../utils/format.js";

const ACTIONS = [
  { value: "increase", label: "Increase" },
  { value: "decrease", label: "Decrease" },
  { value: "set", label: "Set to exact" },
];

export default function AdminInventory() {
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [adjusting, setAdjusting] = useState(null);
  const [form, setForm] = useState({ action: "increase", quantity: "1", note: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [movements, setMovements] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminApi.listInventory();
      setItems(response.data || []);
    } catch (err) {
      setError(err.message || "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdjust = (product) => {
    setAdjusting(product);
    setForm({ action: "increase", quantity: "1", note: "" });
    setFormError("");
  };

  const openHistory = async (product) => {
    setHistoryOpen(product);
    setHistoryLoading(true);
    setMovements([]);
    try {
      const response = await adminApi.getMovements(product.id);
      setMovements(response.data || []);
    } catch (err) {
      toast.error(err.message || "Could not load stock history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const applyAdjustment = async (event) => {
    event.preventDefault();

    const quantity = Number(form.quantity);
    if (!form.quantity || Number.isNaN(quantity) || quantity < 0 || !Number.isInteger(quantity)) {
      setFormError("Enter a whole number of 0 or more.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      await adminApi.adjustStock(adjusting.id, {
        action: form.action,
        quantity,
      });
      toast.success("Stock updated.");
      setAdjusting(null);
      load();
    } catch (err) {
      setFormError(err.message || "Could not adjust stock.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Monitor low stock and record manual adjustments."
        breadcrumb={[{ label: "Inventory" }]}
        actions={
          <Button variant="secondary" onClick={load}>
            <FiRefreshCw size={16} /> Refresh
          </Button>
        }
      />

      <Card>
        {loading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={FiPackage}
            title="Stock levels healthy"
            description="There are currently no low-stock items to review."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[#EEF2FC] text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Stock</th>
                  <th className="px-5 py-3 font-semibold">Threshold</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((product) => (
                  <tr key={product.id} className="hover:bg-indigo-50/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="h-9 w-9 rounded-lg border border-[#E3E9F7] bg-white object-contain p-1"
                          />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                            <FiPackage size={16} />
                          </span>
                        )}
                        <div>
                          <p className="font-semibold text-[#172554]">
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
                      {formatNumber(product.stock)}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {product.low_stock_threshold}
                    </td>
                    <td className="px-5 py-3">
                      <StockBadge
                        stock={product.stock}
                        threshold={product.low_stock_threshold}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openAdjust(product)}
                        >
                          Adjust stock
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openHistory(product)}
                          aria-label={`View history for ${product.title}`}
                        >
                          <FiActivity size={16} />
                        </Button>
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
        open={Boolean(adjusting)}
        onClose={() => setAdjusting(null)}
        title={adjusting ? `Adjust stock – ${adjusting.title}` : "Adjust stock"}
      >
        <form onSubmit={applyAdjustment} className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formError}
            </div>
          )}

          <Field label="Action" htmlFor="inv-action" required>
            <Select
              id="inv-action"
              name="action"
              value={form.action}
              onChange={handleChange}
            >
              {ACTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Quantity" htmlFor="inv-qty" required>
            <Input
              id="inv-qty"
              name="quantity"
              type="number"
              min="0"
              step="1"
              value={form.quantity}
              onChange={handleChange}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAdjusting(null)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Apply
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(historyOpen)}
        onClose={() => setHistoryOpen(null)}
        title={historyOpen ? `Stock history – ${historyOpen.title}` : "Stock history"}
        size="lg"
      >
        {historyLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12" />
            ))}
          </div>
        ) : movements.length === 0 ? (
          <EmptyState
            icon={FiActivity}
            title="No history yet"
            description="Adjustments, orders, and cancellations are recorded here."
          />
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[#F8FAFF] text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Change</th>
                  <th className="px-3 py-2 font-semibold">From → To</th>
                  <th className="px-3 py-2 font-semibold">Reason</th>
                  <th className="px-3 py-2 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td className="px-3 py-2 text-slate-500">
                      {formatDateTime(movement.created_at)}
                    </td>
                    <td className="px-3 py-2 font-semibold">
                      <span
                        className={
                          movement.change > 0
                            ? "text-emerald-600"
                            : movement.change < 0
                            ? "text-rose-600"
                            : "text-slate-600"
                        }
                      >
                        {movement.change > 0 ? "+" : ""}
                        {movement.change}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {movement.previous_stock} → {movement.new_stock}
                    </td>
                    <td className="px-3 py-2 capitalize text-slate-500">
                      {movement.reason.replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {movement.note || movement.admin_name || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
