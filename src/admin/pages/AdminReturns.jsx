import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiRefreshCw, FiCheck, FiX, FiEye } from "react-icons/fi";
import { adminApi } from "../../api/admin.js";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Modal,
  PageHeader,
  Pagination,
  ReadOnlyNotice,
  Select,
  TableSkeleton,
  Textarea,
} from "../components/ui.jsx";
import { useAdminAuth } from "../context/AdminAuthContext.jsx";
import { useAdminBase } from "../context/AdminBaseContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { formatCurrency, formatDateTime, titleCase } from "../../utils/format.js";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "requested", label: "Requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" },
];

const STATUS_TONES = {
  requested: "amber",
  approved: "green",
  rejected: "red",
  completed: "neutral",
};

const TYPE_LABELS = { cancellation: "Cancellation", return: "Return" };

export default function AdminReturns() {
  const toast = useToast();
  const { isReadOnly } = useAdminAuth();
  const { to } = useAdminBase();

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState({ page: 1, limit: 10, status: "" });

  const [active, setActive] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const response = await adminApi.listReturns({
        page: query.page,
        limit: query.limit,
        status: query.status,
      });

      if (requestId.current !== id) return;

      setItems(response.data || []);
      setMeta(response.meta || null);
    } catch (err) {
      if (requestId.current !== id) return;
      setError(err.message || "Failed to load return requests.");
    } finally {
      if (requestId.current === id) {
        setLoading(false);
      }
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (status) => {
    if (!active) return;
    setBusy(true);
    try {
      await adminApi.updateReturn(active.id, status, note.trim() || undefined);
      toast.success(`Request ${status}.`);
      setActive(null);
      setNote("");
      load();
    } catch (err) {
      toast.error(err.message || "Could not update this request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Returns & cancellations"
        description="Review and resolve customer cancellation and return requests."
        breadcrumb={[{ label: "Returns" }]}
      />

      {isReadOnly && <ReadOnlyNotice />}

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            aria-label="Filter by status"
            value={query.status}
            onChange={(event) =>
              setQuery((previous) => ({
                ...previous,
                page: 1,
                status: event.target.value,
              }))
            }
            className="max-w-xs"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Button variant="secondary" onClick={load}>
            <FiRefreshCw size={16} /> Refresh
          </Button>
        </div>
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={FiRefreshCw}
            title="No requests found"
            description="Customer cancellation and return requests will appear here."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="bg-[#EEF2FC] text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Order</th>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Reason</th>
                    <th className="px-5 py-3 font-semibold">Requested</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-indigo-50/40">
                      <td className="px-5 py-3">
                        <Link
                          to={to(`/orders/${item.order_id}`)}
                          className="font-semibold text-indigo-700 hover:underline"
                        >
                          {item.order_number}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {formatCurrency(item.total, item.currency)}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-[#172554]">
                          {item.customer_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.customer_email}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {TYPE_LABELS[item.type] || titleCase(item.type)}
                      </td>
                      <td className="max-w-[240px] px-5 py-3 text-slate-600">
                        <span className="line-clamp-2">{item.reason}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {formatDateTime(item.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={STATUS_TONES[item.status] || "neutral"}>
                          {titleCase(item.status)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Review request"
                            onClick={() => {
                              setActive(item);
                              setNote(item.admin_note || "");
                            }}
                          >
                            <FiEye size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              meta={meta}
              onPageChange={(page) => setQuery((p) => ({ ...p, page }))}
              onPageSizeChange={(limit) =>
                setQuery((p) => ({ ...p, page: 1, limit }))
              }
            />
          </>
        )}
      </Card>

      <Modal
        open={Boolean(active)}
        onClose={() => {
          setActive(null);
          setNote("");
        }}
        title={active ? `${TYPE_LABELS[active.type] || "Request"} · ${active.order_number}` : ""}
        footer={
          active?.status === "requested" && !isReadOnly ? (
            <>
              <Button
                variant="danger"
                loading={busy}
                onClick={() => decide("rejected")}
              >
                <FiX size={16} /> Reject
              </Button>
              <Button loading={busy} onClick={() => decide("approved")}>
                <FiCheck size={16} /> Approve
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              onClick={() => {
                setActive(null);
                setNote("");
              }}
            >
              Close
            </Button>
          )
        }
      >
        {active && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs uppercase text-slate-400">Customer</p>
                <p className="font-medium text-[#172554]">
                  {active.customer_name}
                </p>
                <p className="text-xs text-slate-500">{active.customer_email}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Status</p>
                <Badge tone={STATUS_TONES[active.status] || "neutral"}>
                  {titleCase(active.status)}
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase text-slate-400">Reason</p>
              <p className="mt-1 text-slate-600">{active.reason}</p>
            </div>

            {active.admin_note && active.status !== "requested" && (
              <div>
                <p className="text-xs uppercase text-slate-400">Admin note</p>
                <p className="mt-1 text-slate-600">{active.admin_note}</p>
              </div>
            )}

            {active.status === "requested" && !isReadOnly && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#263968]">
                  Note to customer (optional)
                </label>
                <Textarea
                  rows={3}
                  value={note}
                  maxLength={1000}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add a short explanation for your decision"
                />
                <p className="mt-2 text-xs text-slate-400">
                  Approving a cancellation or return restocks the items and
                  refunds paid orders automatically.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
