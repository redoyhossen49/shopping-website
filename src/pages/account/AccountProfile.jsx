import { useEffect, useState } from "react";
import { FiSave, FiLock } from "react-icons/fi";
import { accountApi } from "../../api/account.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../admin/components/Toast.jsx";
import {
  ErrorBlock,
  LoadingBlock,
  SectionCard,
  inputClass,
  labelClass,
  primaryButton,
} from "./accountUi.jsx";

export default function AccountProfile() {
  const { updateUser } = useAuth();
  const toast = useToast();

  const [state, setState] = useState({ loading: true, error: "" });
  const [form, setForm] = useState({ name: "", phone: "" });
  const [saving, setSaving] = useState(false);

  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [changing, setChanging] = useState(false);

  const load = async () => {
    setState({ loading: true, error: "" });
    try {
      const response = await accountApi.getProfile();
      setForm({ name: response.data.name || "", phone: response.data.phone || "" });
      setState({ loading: false, error: "" });
    } catch (error) {
      setState({ loading: false, error: error.message });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();

    if (form.name.trim().length < 2) {
      toast?.error("Please enter your full name");
      return;
    }

    setSaving(true);
    try {
      const response = await accountApi.updateProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
      });
      updateUser({ name: response.data.name, phone: response.data.phone });
      toast?.success("Profile updated");
    } catch (error) {
      toast?.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePassword = async (event) => {
    event.preventDefault();

    if (passwords.new_password.length < 8) {
      toast?.error("New password must be at least 8 characters");
      return;
    }

    if (passwords.new_password !== passwords.confirm_password) {
      toast?.error("The new passwords do not match");
      return;
    }

    setChanging(true);
    try {
      await accountApi.changePassword({
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      setPasswords({ current_password: "", new_password: "", confirm_password: "" });
      toast?.success("Password updated");
    } catch (error) {
      toast?.error(error.message);
    } finally {
      setChanging(false);
    }
  };

  if (state.loading) {
    return <LoadingBlock label="Loading your profile…" />;
  }

  if (state.error) {
    return <ErrorBlock message={state.error} onRetry={load} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-[#172554] sm:text-3xl">
        Profile
      </h1>

      <SectionCard
        title="Personal details"
        description="Used to prefill checkout and contact you about orders."
      >
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className={labelClass}>
                Full name
              </label>
              <input
                id="name"
                className={inputClass}
                value={form.name}
                maxLength={120}
                onChange={(event) =>
                  setForm((f) => ({ ...f, name: event.target.value }))
                }
              />
            </div>

            <div>
              <label htmlFor="phone" className={labelClass}>
                Phone number
              </label>
              <input
                id="phone"
                className={inputClass}
                value={form.phone}
                maxLength={40}
                placeholder="+880 1XXX XXXXXX"
                onChange={(event) =>
                  setForm((f) => ({ ...f, phone: event.target.value }))
                }
              />
            </div>
          </div>

          <button type="submit" className={primaryButton} disabled={saving}>
            <FiSave size={17} />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title="Change password"
        description="Choose a strong password of at least 8 characters."
      >
        <form onSubmit={handlePassword} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <label htmlFor="current_password" className={labelClass}>
                Current password
              </label>
              <input
                id="current_password"
                type="password"
                autoComplete="current-password"
                className={inputClass}
                value={passwords.current_password}
                onChange={(event) =>
                  setPasswords((p) => ({
                    ...p,
                    current_password: event.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label htmlFor="new_password" className={labelClass}>
                New password
              </label>
              <input
                id="new_password"
                type="password"
                autoComplete="new-password"
                className={inputClass}
                value={passwords.new_password}
                onChange={(event) =>
                  setPasswords((p) => ({
                    ...p,
                    new_password: event.target.value,
                  }))
                }
              />
            </div>

            <div>
              <label htmlFor="confirm_password" className={labelClass}>
                Confirm password
              </label>
              <input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                className={inputClass}
                value={passwords.confirm_password}
                onChange={(event) =>
                  setPasswords((p) => ({
                    ...p,
                    confirm_password: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <button type="submit" className={primaryButton} disabled={changing}>
            <FiLock size={17} />
            {changing ? "Updating…" : "Update password"}
          </button>
        </form>
      </SectionCard>
    </div>
  );
}
