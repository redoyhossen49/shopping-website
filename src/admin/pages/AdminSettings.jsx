import { useCallback, useEffect, useState } from "react";
import { FiRefreshCw, FiSave, FiSettings } from "react-icons/fi";
import { adminApi } from "../../api/admin.js";
import { useAppConfig } from "../../context/AppConfigContext.jsx";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import {
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  ErrorState,
  Field,
  Input,
  PageHeader,
  ReadOnlyNotice,
  Skeleton,
} from "../components/ui.jsx";

const EMPTY = {
  store_name: "",
  currency: "BDT",
  support_email: "",
  default_shipping_fee: "30",
  default_low_stock_threshold: "5",
};

export default function AdminSettings() {
  const toast = useToast();
  const { demoMode } = useAppConfig();
  const { isReadOnly } = useAdminAuth();

  const [settings, setSettings] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminApi.getSettings();
      const s = response.data;
      setSettings({
        store_name: s.store_name || "",
        currency: s.currency || "BDT",
        support_email: s.support_email || "",
        default_shipping_fee: String(s.default_shipping_fee ?? "30"),
        default_low_stock_threshold: String(
          s.default_low_stock_threshold ?? "5"
        ),
      });
    } catch (err) {
      setError(err.message || "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setSettings((previous) => ({ ...previous, [name]: value }));
  };

  const save = async (event) => {
    event.preventDefault();

    const fee = Number(settings.default_shipping_fee);
    const threshold = Number(settings.default_low_stock_threshold);

    if (!settings.store_name.trim()) {
      setFormError("Store name is required.");
      return;
    }
    if (Number.isNaN(fee) || fee < 0) {
      setFormError("Shipping fee must be 0 or more.");
      return;
    }
    if (Number.isNaN(threshold) || threshold < 0) {
      setFormError("Low stock threshold must be 0 or more.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      await adminApi.updateSettings({
        store_name: settings.store_name.trim(),
        currency: settings.currency.trim() || "BDT",
        support_email: settings.support_email.trim() || null,
        default_shipping_fee: fee,
        default_low_stock_threshold: threshold,
      });
      toast.success("Settings saved.");
      load();
    } catch (err) {
      setFormError(err.message || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  const resetDemo = async () => {
    setResetting(true);
    try {
      const response = await adminApi.resetDemoData();
      const { products, orders, customers } = response.data || {};
      toast.success(
        `Demo data reset — ${products ?? 0} products, ${orders ?? 0} orders, ${customers ?? 0} customers.`
      );
      setConfirmReset(false);
      load();
    } catch (err) {
      toast.error(err.message || "Could not reset demo data.");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <ErrorState message={error} onRetry={load} />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Store identity, currency, and default policies."
        breadcrumb={[{ label: "Settings" }]}
      />

      {isReadOnly && <ReadOnlyNotice className="mb-6" />}

      <form onSubmit={save}>
        <Card>
          <CardHeader title="General" />
          <fieldset disabled={isReadOnly} className="contents">
          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
            {formError && (
              <div className="col-span-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {formError}
              </div>
            )}

            <Field
              label="Store name"
              htmlFor="store_name"
              required
              className="sm:col-span-2"
            >
              <Input
                id="store_name"
                name="store_name"
                value={settings.store_name}
                onChange={handleChange}
                maxLength={120}
              />
            </Field>

            <Field label="Currency" htmlFor="currency">
              <Input
                id="currency"
                name="currency"
                value={settings.currency}
                onChange={handleChange}
                maxLength={10}
                placeholder="BDT"
              />
            </Field>

            <Field label="Support email" htmlFor="support_email">
              <Input
                id="support_email"
                name="support_email"
                type="email"
                value={settings.support_email}
                onChange={handleChange}
                maxLength={254}
              />
            </Field>

            <Field
              label="Default shipping fee (৳)"
              htmlFor="default_shipping_fee"
              required
            >
              <Input
                id="default_shipping_fee"
                name="default_shipping_fee"
                type="number"
                min="0"
                step="0.01"
                value={settings.default_shipping_fee}
                onChange={handleChange}
              />
            </Field>

            <Field
              label="Default low stock threshold"
              htmlFor="default_low_stock_threshold"
              required
            >
              <Input
                id="default_low_stock_threshold"
                name="default_low_stock_threshold"
                type="number"
                min="0"
                step="1"
                value={settings.default_low_stock_threshold}
                onChange={handleChange}
              />
            </Field>
          </div>
          </fieldset>
        </Card>

        {!isReadOnly && (
          <div className="mt-6 flex justify-end">
            <Button type="submit" loading={saving}>
              <FiSave size={16} />
              Save settings
            </Button>
          </div>
        )}
      </form>

      {demoMode && !isReadOnly && (
        <Card>
          <CardHeader
            title="Demo sandbox"
            description="Restore the sample catalog, customers and order history to a known-good state."
          />
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Resetting removes every demo product, customer and order and
              reseeds a fresh dataset. Real accounts and data are never touched.
            </p>
            <Button
              type="button"
              variant="danger"
              onClick={() => setConfirmReset(true)}
              className="shrink-0"
            >
              <FiRefreshCw size={16} />
              Reset demo data
            </Button>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={confirmReset}
        onCancel={() => setConfirmReset(false)}
        onConfirm={resetDemo}
        loading={resetting}
        title="Reset demo data?"
        message="All demo products, customers and orders will be replaced with a fresh sample dataset. Real accounts and data are never touched. This cannot be undone."
        confirmLabel="Reset demo data"
      />
    </div>
  );
}
