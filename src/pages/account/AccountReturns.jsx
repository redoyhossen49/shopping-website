import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiExternalLink } from "react-icons/fi";
import { accountApi } from "../../api/account.js";
import { formatCurrency, formatDate } from "../../utils/format.js";
import StatusBadge from "../../components/StatusBadge.jsx";
import { RETURN_TYPE_LABELS } from "../../utils/orderStatus.js";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  SectionCard,
} from "./accountUi.jsx";

export default function AccountReturns() {
  const [state, setState] = useState({ loading: true, error: "", items: [] });

  const load = async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const response = await accountApi.listReturns();
      setState({ loading: false, error: "", items: response.data || [] });
    } catch (error) {
      setState({ loading: false, error: error.message, items: [] });
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-[#172554] sm:text-3xl">
        Returns & cancellations
      </h1>

      <SectionCard>
        {state.loading ? (
          <LoadingBlock label="Loading your requests…" />
        ) : state.error ? (
          <ErrorBlock message={state.error} onRetry={load} />
        ) : state.items.length === 0 ? (
          <EmptyBlock
            title="No requests yet"
            description="Cancellation and return requests you submit will appear here."
          />
        ) : (
          <ul className="divide-y divide-[#dfe6f5]">
            {state.items.map((item) => (
              <li key={item.id} className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        to={`/account/orders/${item.order_number}`}
                        className="inline-flex items-center gap-1.5 font-bold text-[#172554] hover:text-indigo-700"
                      >
                        {item.order_number}
                        <FiExternalLink size={14} />
                      </Link>
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {RETURN_TYPE_LABELS[item.type] || item.type}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(item.created_at)}
                      {item.total
                        ? ` · ${formatCurrency(item.total, item.currency)}`
                        : ""}
                    </p>
                  </div>
                  <StatusBadge status={item.status} kind="return" />
                </div>

                <p className="mt-2 text-sm text-slate-600">{item.reason}</p>

                {item.admin_note && (
                  <p className="mt-2 rounded-xl bg-indigo-50 px-4 py-2 text-sm text-indigo-800">
                    Store note: {item.admin_note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
