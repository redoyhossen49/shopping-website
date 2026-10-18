import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiMail,
  FiCalendar,
  FiShoppingBag,
  FiUserCheck,
  FiUserX,
} from "react-icons/fi";
import { adminApi } from "../../api/admin.js";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { useAdminBase } from "../context/AdminBaseContext.jsx";
import { useToast } from "../components/Toast.jsx";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  OrderStatusBadge,
  PageHeader,
  PaymentStatusBadge,
  ReadOnlyNotice,
  Skeleton,
} from "../components/ui.jsx";
import { formatCurrency, formatDate, formatDateTime } from "../../utils/format.js";

export default function AdminCustomerDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { isReadOnly } = useAdminAuth();
  const { to } = useAdminBase();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminApi.getCustomer(id);
      setCustomer(response.data);
    } catch (err) {
      setError(err.message || "Failed to load this customer.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async () => {
    setSaving(true);
    try {
      const response = await adminApi.updateCustomerStatus(
        id,
        !customer.is_active
      );
      setCustomer((previous) => ({ ...previous, ...response.data }));
      toast.success(
        response.data.is_active
          ? "Customer account enabled."
          : "Customer account disabled."
      );
      setConfirming(false);
    } catch (err) {
      toast.error(err.message || "Could not update this customer.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
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
        title={customer.name}
        description={customer.email}
        breadcrumb={[
          { label: "Customers", to: "/customers" },
          { label: customer.name },
        ]}
        actions={
          <Link
            to={to("/customers")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"
          >
            <FiArrowLeft size={16} /> Back to customers
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Profile" />
          <div className="space-y-4 p-5 text-sm">
            <p className="flex items-center gap-2 text-slate-600">
              <FiMail className="text-slate-400" size={16} />
              {customer.email}
            </p>
            <p className="flex items-center gap-2 text-slate-600">
              <FiCalendar className="text-slate-400" size={16} />
              Joined {formatDate(customer.created_at)}
            </p>

            <div className="flex items-center justify-between border-t border-[#E3E9F7] pt-4">
              <span className="text-slate-500">Status</span>
              {customer.is_active ? (
                <Badge tone="green">Active</Badge>
              ) : (
                <Badge tone="red">Disabled</Badge>
              )}
            </div>

            <Button
              variant={customer.is_active ? "danger" : "primary"}
              className="w-full"
              onClick={() => setConfirming(true)}
              disabled={isReadOnly}
            >
              {customer.is_active ? (
                <>
                  <FiUserX size={16} /> Disable account
                </>
              ) : (
                <>
                  <FiUserCheck size={16} /> Enable account
                </>
              )}
            </Button>

            {isReadOnly && <ReadOnlyNotice />}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
          <Card className="p-5">
            <p className="text-sm font-medium text-slate-500">Orders placed</p>
            <p className="mt-2 text-3xl font-extrabold text-[#172554]">
              {customer.order_count}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-medium text-slate-500">Lifetime spend</p>
            <p className="mt-2 text-3xl font-extrabold text-[#172554]">
              {formatCurrency(customer.total_spent)}
            </p>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Order history" />
        {customer.orders?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-[#EEF2FC] text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Order</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Total</th>
                  <th className="px-5 py-3 font-semibold">Payment</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customer.orders.map((order) => (
                  <tr key={order.id} className="hover:bg-indigo-50/40">
                    <td className="px-5 py-3">
                      <Link
                        to={to(`/orders/${order.id}`)}
                        className="font-semibold text-indigo-700 hover:underline"
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {formatDateTime(order.created_at)}
                    </td>
                    <td className="px-5 py-3 font-semibold text-[#172554]">
                      {formatCurrency(order.total, order.currency)}
                    </td>
                    <td className="px-5 py-3">
                      <PaymentStatusBadge status={order.payment_status} />
                    </td>
                    <td className="px-5 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={FiShoppingBag}
            title="No orders yet"
            description="This customer has not placed any orders."
          />
        )}
      </Card>

      <ConfirmDialog
        open={confirming}
        title={customer.is_active ? "Disable account" : "Enable account"}
        message={
          customer.is_active
            ? "Disabling prevents this customer from signing in and placing new orders."
            : "This will allow the customer to sign in and place orders again."
        }
        confirmLabel={customer.is_active ? "Disable" : "Enable"}
        tone={customer.is_active ? "danger" : "primary"}
        loading={saving}
        onConfirm={toggleActive}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
