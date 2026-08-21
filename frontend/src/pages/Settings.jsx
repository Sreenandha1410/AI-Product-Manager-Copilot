// src/pages/Settings.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Input }   from "../components/ui/Input";
import { Button }  from "../components/ui/Button";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import api from "../services/api";

export function Settings() {
  const navigate                      = useNavigate();
  const { user, updateProfile, logout } = useAuth();
  const { theme, setTheme }           = useTheme();

  const [profile, setProfile] = useState({ name: "", email: "" });
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors]   = useState({});
  const [statusMsg, setStatusMsg] = useState(null); // { type: "success"|"error", text: string }

  // ── Hydrate form from auth context ────────────────────────
  useEffect(() => {
    if (user) {
      setProfile({ name: user.name ?? "", email: user.email ?? "" });
    }
  }, [user]);

  // ── Fetch latest profile from backend ─────────────────────
  const fetchProfile = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      const res = await api.get(`/settings/${user.user_id}`);
      setProfile({ name: res.data.name ?? "", email: res.data.email ?? "" });
    } catch {
      // silently fall back to context data
    }
  }, [user?.user_id]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── Validation ─────────────────────────────────────────────
  const validate = () => {
   const errs = {};
    if (!profile.name.trim())            errs.name  = "Name is required.";
    if (!profile.email.trim())           errs.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email))
                                         errs.email = "Enter a valid email address.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Save profile ───────────────────────────────────────────
  const saveProfile = async () => {
    if (!validate()) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await api.put("/settings/", {
        user_id: user.user_id,
        name:    profile.name.trim(),
        email:   profile.email.trim(),
      });
      // Update auth context so Topbar / Sidebar reflect change immediately
      updateProfile({
        ...res.data,
        initials: res.data.name
  ? res.data.name.split(" ").map((w) => w[0]).join("").toUpperCase()
  : "U",
      });
      setStatusMsg({ type: "success", text: "Profile updated successfully." });
    } catch (err) {
  const detail =
    err?.response?.data?.detail ||
    "Update failed. Please try again.";
      setStatusMsg({ type: "error", text: detail });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete account ─────────────────────────────────────────
  const deleteAccount = async () => {
    if (!window.confirm("Are you sure? This action is permanent and cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.delete(`/settings/${user.user_id}`);
      logout();
      navigate("/auth/login");
    } catch (err) {
      const detail = err.response?.data?.detail ?? "Failed to delete account.";
      setStatusMsg({ type: "error", text: detail });
    } finally {
      setDeleting(false);
    }
  };

  // ── Logout ─────────────────────────────────────────────────
  const handleLogout = () => {
    logout();
    navigate("/auth/login");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Settings</h1>
        <Button variant="outline" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-6 pb-4 border-b border-border">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold select-none">
              {profile.name
                ? profile.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
                : user?.initials ?? "U"
              }
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{profile.name || "—"}</p>
              <p className="text-xs text-text-secondary mt-1">{user?.role ?? "Product Manager"}</p>
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Full name
              </label>
              <Input
                value={profile.name}
                onChange={e => {
                  setProfile({ ...profile, name: e.target.value });
                  setErrors(prev => ({ ...prev, name: "" }));
                  setStatusMsg(null);
                }}
                placeholder="Your full name"
                className={errors.name ? "border-danger focus:ring-danger" : ""}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-danger">{errors.name}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Email address
              </label>
              <Input
                type="email"
                value={profile.email}
                onChange={e => {
                  setProfile({ ...profile, email: e.target.value });
                  setErrors(prev => ({ ...prev, email: "" }));
                  setStatusMsg(null);
                }}
                placeholder="your@email.com"
                className={errors.email ? "border-danger focus:ring-danger" : ""}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-danger">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Status message */}
          {statusMsg && (
            <p className={`text-sm ${statusMsg.type === "success" ? "text-success" : "text-danger"}`}>
              {statusMsg.type === "success" ? "✓ " : "✕ "}{statusMsg.text}
            </p>
          )}

          <div className="pt-4 flex justify-end">
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Theme Card */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance & Theme</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text-primary">Theme Preference</p>
              <p className="text-sm text-text-secondary">Choose how the application looks to you.</p>
            </div>
            <div className="flex items-center gap-3">
              {["light", "dark"].map(t => (
                <label key={t} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value={t}
                    checked={theme === t}
                    onChange={() => setTheme(t)}
                    className="text-primary border-border bg-background focus:ring-primary"
                  />
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Card */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              label: "New Feedback Alerts",
              desc:  "Receive an email when new high-priority feedback is logged.",
            },
            {
              label: "Weekly AI Summary",
              desc:  "Get a weekly digest of product trends generated by Copilot.",
            },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text-primary">{item.label}</p>
                <p className="text-sm text-text-secondary">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Account / Danger Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-danger">Account Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-danger/20 bg-danger/5">
            <div>
              <p className="font-medium text-text-primary">Delete Account</p>
              <p className="text-sm text-text-secondary">
                Permanently delete your account and all associated data.
              </p>
            </div>
            <Button
              variant="outline"
              className="text-danger border-danger hover:bg-danger/10 shrink-0"
              onClick={deleteAccount}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete Account"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
