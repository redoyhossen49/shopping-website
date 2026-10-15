import { useEffect, useState } from "react";
import { FiMapPin, FiPlus, FiEdit2, FiTrash2, FiCheck, FiX } from "react-icons/fi";
import { accountApi } from "../../api/account.js";
import { useToast } from "../../admin/components/Toast.jsx";
import {
  EmptyBlock,
  ErrorBlock,
  LoadingBlock,
  SectionCard,
  inputClass,
  labelClass,
  primaryButton,
  secondaryButton,
} from "./accountUi.jsx";

const EMPTY_FORM = {
  label: "Home",
  recipient_name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "Bangladesh",
  is_default: false,
};

function AddressForm({ initial, onCancel, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [saving, setSaving] = useState(false);

  const update = (key) => (event) =>
    setForm((f) => ({ ...f, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();

    const required = ["recipient_name", "phone", "address_line1", "city", "postal_code"];
    for (const field of required) {
      if (!String(form[field]).trim()) {
        toast?.error("Please fill in all required fields");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { ...form, is_default: form.is_default === true };
      const response = initial?.id
        ? await accountApi.updateAddress(initial.id, payload)
        : await accountApi.createAddress(payload);
      toast?.success(initial?.id ? "Address updated" : "Address saved");
      onSaved(response.data);
    } catch (error) {
      toast?.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Label</label>
          <input className={inputClass} value={form.label} maxLength={60} onChange={update("label")} placeholder="Home, Office…" />
        </div>
        <div>
          <label className={labelClass}>Recipient name *</label>
          <input className={inputClass} value={form.recipient_name} maxLength={120} onChange={update("recipient_name")} />
        </div>
        <div>
          <label className={labelClass}>Phone *</label>
          <input className={inputClass} value={form.phone} maxLength={40} onChange={update("phone")} placeholder="+880 1XXX XXXXXX" />
        </div>
        <div>
          <label className={labelClass}>City *</label>
          <input className={inputClass} value={form.city} maxLength={120} onChange={update("city")} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Address line 1 *</label>
          <input className={inputClass} value={form.address_line1} maxLength={250} onChange={update("address_line1")} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Address line 2</label>
          <input className={inputClass} value={form.address_line2} maxLength={250} onChange={update("address_line2")} />
        </div>
        <div>
          <label className={labelClass}>State / Division</label>
          <input className={inputClass} value={form.state} maxLength={120} onChange={update("state")} />
        </div>
        <div>
          <label className={labelClass}>Postal code *</label>
          <input className={inputClass} value={form.postal_code} maxLength={20} onChange={update("postal_code")} />
        </div>
        <div>
          <label className={labelClass}>Country</label>
          <input className={inputClass} value={form.country} maxLength={120} onChange={update("country")} />
        </div>
        <label className="flex items-center gap-3 self-end text-sm font-semibold text-[#263968]">
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-[#cbd5e8] text-indigo-600 focus:ring-indigo-500"
            checked={form.is_default === true}
            onChange={(event) =>
              setForm((f) => ({ ...f, is_default: event.target.checked }))
            }
          />
          Set as default address
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className={primaryButton} disabled={saving}>
          <FiCheck size={17} />
          {saving ? "Saving…" : "Save address"}
        </button>
        <button type="button" className={secondaryButton} onClick={onCancel}>
          <FiX size={17} />
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AccountAddresses() {
  const toast = useToast();
  const [state, setState] = useState({ loading: true, error: "", items: [] });
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const response = await accountApi.listAddresses();
      setState({ loading: false, error: "", items: response.data || [] });
    } catch (error) {
      setState({ loading: false, error: error.message, items: [] });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const closeForms = () => {
    setEditing(null);
    setCreating(false);
  };

  const handleSaved = () => {
    closeForms();
    load();
  };

  const handleDelete = async (address) => {
    if (!window.confirm("Remove this address?")) return;
    try {
      await accountApi.deleteAddress(address.id);
      toast?.success("Address removed");
      load();
    } catch (error) {
      toast?.error(error.message);
    }
  };

  const handleDefault = async (address) => {
    try {
      await accountApi.setDefaultAddress(address.id);
      toast?.success("Default address updated");
      load();
    } catch (error) {
      toast?.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-[#172554] sm:text-3xl">
          Addresses
        </h1>
        {!creating && !editing && (
          <button type="button" className={primaryButton} onClick={() => setCreating(true)}>
            <FiPlus size={17} />
            Add address
          </button>
        )}
      </div>

      {creating && (
        <SectionCard title="New address">
          <AddressForm onCancel={closeForms} onSaved={handleSaved} />
        </SectionCard>
      )}

      {editing && (
        <SectionCard title="Edit address">
          <AddressForm initial={editing} onCancel={closeForms} onSaved={handleSaved} />
        </SectionCard>
      )}

      <SectionCard title="Saved addresses">
        {state.loading ? (
          <LoadingBlock label="Loading addresses…" />
        ) : state.error ? (
          <ErrorBlock message={state.error} onRetry={load} />
        ) : state.items.length === 0 ? (
          <EmptyBlock
            title="No saved addresses"
            description="Save an address to speed up checkout."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {state.items.map((address) => (
              <div
                key={address.id}
                className="relative rounded-2xl border border-[#d7dff2] bg-white p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 font-bold text-[#172554]">
                    <FiMapPin className="text-indigo-600" size={17} />
                    {address.label || "Address"}
                  </span>
                  {address.is_default && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      Default
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-0.5 text-sm text-slate-600">
                  <p className="font-semibold text-[#263968]">
                    {address.recipient_name}
                  </p>
                  <p>{address.phone}</p>
                  <p>{address.address_line1}</p>
                  {address.address_line2 && <p>{address.address_line2}</p>}
                  <p>
                    {[address.city, address.state, address.postal_code]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <p>{address.country}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e8] px-3 py-1.5 text-xs font-bold text-[#263968] transition hover:bg-indigo-50"
                    onClick={() => {
                      setCreating(false);
                      setEditing(address);
                    }}
                  >
                    <FiEdit2 size={14} /> Edit
                  </button>
                  {!address.is_default && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e8] px-3 py-1.5 text-xs font-bold text-[#263968] transition hover:bg-indigo-50"
                      onClick={() => handleDefault(address)}
                    >
                      <FiCheck size={14} /> Make default
                    </button>
                  )}
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                    onClick={() => handleDelete(address)}
                  >
                    <FiTrash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
