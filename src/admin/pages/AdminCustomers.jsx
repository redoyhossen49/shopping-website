import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiEye, FiUsers } from "react-icons/fi";
import { adminApi } from "../../api/admin.js";
import useDebouncedValue from "../hooks/useDebouncedValue.js";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Pagination,
  TableSkeleton,
} from "../components/ui.jsx";
import { formatCurrency, formatDate, formatNumber } from "../../utils/format.js";

export default function AdminCustomers() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [query, setQuery] = useState({ page: 1, limit: 10, search: "" });

  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const response = await adminApi.listCustomers(query);

      if (requestId.current !== id) return;

      setCustomers(response.data || []);
      setMeta(response.meta || null);
    } catch (err) {
      if (requestId.current !== id) return;
      setError(err.message || "Failed to load customers.");
    } finally {
      if (requestId.current === id) {
        setLoading(false);
      }
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const debouncedSearch = useDebouncedValue(searchInput.trim());

  useEffect(() => {
    setQuery((previous) =>
      previous.search === debouncedSearch
        ? previous
        : { ...previous, page: 1, search: debouncedSearch }
    );
  }, [debouncedSearch]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Registered shoppers and their order history."
        breadcrumb={[{ label: "Customers" }]}
      />

      <Card className="p-4">
        <form
          className="flex max-w-xl gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery((previous) => ({
              ...previous,
              page: 1,
              search: searchInput.trim(),
            }));
          }}
        >
          <Input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name or email"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={FiUsers}
            title="No customers found"
            description="Customers appear here once they register an account."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#EEF2FC] text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Joined</th>
                    <th className="px-5 py-3 font-semibold">Orders</th>
                    <th className="px-5 py-3 font-semibold">Total spent</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="cursor-pointer hover:bg-indigo-50/40"
                      onClick={() => navigate(`/admin/customers/${customer.id}`)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                            {customer.name?.[0]?.toUpperCase() || "U"}
                          </span>
                          <div>
                            <p className="font-semibold text-[#172554]">
                              {customer.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {customer.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {formatDate(customer.created_at)}
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {formatNumber(customer.order_count)}
                      </td>
                      <td className="px-5 py-3 font-semibold text-[#172554]">
                        {formatCurrency(customer.total_spent)}
                      </td>
                      <td className="px-5 py-3">
                        {customer.is_active ? (
                          <Badge tone="green">Active</Badge>
                        ) : (
                          <Badge tone="red">Disabled</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`View ${customer.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/admin/customers/${customer.id}`);
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
    </div>
  );
}
