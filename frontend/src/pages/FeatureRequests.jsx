// src/pages/FeatureRequests.jsx
import React, { useEffect, useState, useCallback } from "react";
import { Sparkles, ThumbsUp, Filter, Plus, Search, Trash2, X } from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const IMPACT_VARIANT = { High: "success", Medium: "warning", Low: "default" };
const STATUS_VARIANT = { "In Progress": "primary", Planned: "warning", Backlog: "default" };

// ── New Feature Modal ──────────────────────────────────────────
function NewFeatureModal({ isOpen, onClose, onSuccess }) {
  const { user }          = useAuth();
  const [title, setTitle] = useState("");
  const [desc, setDesc]   = useState("");
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState("");

  const reset = () => { setTitle(""); setDesc(""); setErr(""); };

  const handleCreate = async () => {
    if (!title.trim()) { setErr("Feature title is required."); return; }
    setBusy(true); setErr("");
    try {
      await api.post("/feature-requests/", {
        title:       title.trim(),
        description: desc.trim(),
        votes:       0,
        user_id:     user?.user_id ?? null,
      });
      onSuccess();
      onClose();
      reset();
    } catch (e) {
      setErr(e.response?.data?.detail ?? "Failed to create feature request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); reset(); }} title="New Feature Request">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Feature Title *</label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g., Dark Mode"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Description</label>
          <textarea
            rows={3}
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Describe the feature…"
            className="w-full p-3 border border-border rounded-lg bg-background text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary resize-y"
          />
        </div>
        {err && <p className="text-sm text-danger">{err}</p>}
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={() => { onClose(); reset(); }}>Cancel</Button>
          <Button onClick={handleCreate} disabled={busy}>
            {busy ? "Creating…" : "Create Feature"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main page ──────────────────────────────────────────────────
export function FeatureRequests() {
  const navigate                = useNavigate();
  const [features, setFeatures] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("All");
  const [showNew, setShowNew]   = useState(false);

  const fetchFeatures = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/feature-requests/");
      setFeatures(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeatures(); }, [fetchFeatures]);

  const handleUpvote = async (id) => {
    try {
      const res = await api.put(`/feature-requests/${id}/vote`);
      setFeatures(prev => prev.map(f => f.id === id ? { ...f, votes: res.data.votes } : f));
    } catch (err) { console.error(err); }
  };

  const handleGeneratePRD = (feature) => {
    // Navigate to PRD page with feature pre-filled via localStorage
    localStorage.setItem("prd_prefill", JSON.stringify({
      feature_name:  feature.title,
      description:   feature.description,
      priority:      feature.priority,
      business_goal: "",
      target_users:  "",
    }));
    navigate("/app/prd");
  };

  const filtered = features.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      f.title?.toLowerCase().includes(q) ||
      f.description?.toLowerCase().includes(q);
    const matchFilter = filter === "All" || f.priority === filter;
    return matchSearch && matchFilter;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Feature Requests</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Prioritized product ideas based on feedback clusters.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input
              type="text" placeholder="Search features…" className="pl-9"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="h-10 px-3 border border-border rounded-lg bg-background text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {["All","High","Medium","Low"].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <Button onClick={() => setShowNew(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Feature
          </Button>
        </div>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-text-secondary">
          {search ? "No features match your search." : "No feature requests yet. Create one!"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(feature => (
            <Card
              key={feature.id}
              className="flex flex-col hover:border-primary/50 transition-colors"
            >
              <CardContent className="p-6 flex-1 flex flex-col">
                {/* Title + votes */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold text-lg text-text-primary leading-tight flex-1 mr-3">
                    {feature.title}
                  </h3>
                  <button
                    onClick={() => handleUpvote(feature.id)}
                    className="flex flex-col items-center justify-center bg-surface-hover border border-border rounded-lg p-2 min-w-[50px] hover:border-primary/50 transition-colors shrink-0"
                  >
                    <ThumbsUp className="h-4 w-4 text-text-secondary mb-1" />
                    <span className="text-sm font-semibold text-text-primary">{feature.votes}</span>
                  </button>
                </div>

                {/* Description */}
                {feature.description && (
                  <p className="text-xs text-text-secondary mb-4 line-clamp-2">
                    {feature.description}
                  </p>
                )}

                {/* Meta */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Priority</span>
                    <span className="font-medium text-text-primary">{feature.priority}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Business Impact</span>
                    <Badge variant={IMPACT_VARIANT[feature.businessImpact] ?? "default"}>
                      {feature.businessImpact}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Status</span>
                    <Badge variant={STATUS_VARIANT[feature.status] ?? "default"}>
                      {feature.status}
                    </Badge>
                  </div>
                </div>

                {/* AI Score + Generate PRD */}
                <div className="mt-6 pt-4 border-t border-border space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <Sparkles className="mr-2 h-4 w-4 text-primary" />
                      <span className="text-text-secondary">AI Score</span>
                    </div>
                    <span className="font-semibold text-primary">
                      {feature.aiScore}/100
                    </span>
                  </div>
                  <Button
                    className="w-full" variant="outline"
                    onClick={() => handleGeneratePRD(feature)}
                  >
                    Generate PRD
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NewFeatureModal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        onSuccess={fetchFeatures}
      />
    </div>
  );
}