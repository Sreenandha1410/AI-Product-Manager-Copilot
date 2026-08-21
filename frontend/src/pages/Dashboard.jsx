// src/pages/Dashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, Zap, FileText, Target, Sparkles,
  ArrowUp, X, Upload, Layers, Bot
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, BarChart, Bar, Cell
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import api from "../services/api";

// ── Upload Feedback Modal ─────────────────────────────────────
function UploadFeedbackModal({ isOpen, onClose, onSuccess }) {
  const [tab, setTab]             = useState("csv");   // "csv" | "manual"
  const [file, setFile]           = useState(null);
  const [source, setSource]       = useState("csv");
  const [manualText, setManualText] = useState("");
  const [manualSource, setManualSource] = useState("csv");
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg]             = useState("");

  const reset = () => { setFile(null); setManualText(""); setMsg(""); };

  const handleCSV = async () => {
    if (!file) { setMsg("Please select a CSV file."); return; }
    setUploading(true); setMsg("");
    try {
      const fd = new FormData();
      fd.append("file",   file);
      fd.append("source", source);
      await api.post("/feedback/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMsg("✅ Uploaded successfully!");
      setTimeout(() => { onSuccess(); onClose(); reset(); }, 800);
    } catch { setMsg("❌ Upload failed. Please try again."); }
    finally   { setUploading(false); }
  };

  const handleManual = async () => {
    if (!manualText.trim()) { setMsg("Please enter feedback text."); return; }
    setUploading(true); setMsg("");
    try {
      await api.post("/feedback/manual", {
        feedback_text: manualText,
        source:        manualSource,
      });
      setMsg("✅ Saved successfully!");
      setTimeout(() => { onSuccess(); onClose(); reset(); }, 800);
    } catch { setMsg("❌ Save failed. Please try again."); }
    finally   { setUploading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); reset(); }} title="Upload Feedback">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex border-b border-border">
          {["csv", "manual"].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {t === "csv" ? "CSV Upload" : "Manual Entry"}
            </button>
          ))}
        </div>

        {tab === "csv" ? (
          <>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Source</label>
              <select
                value={source} onChange={e => setSource(e.target.value)}
                className="w-full h-10 px-3 border border-border rounded-lg bg-background text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {["csv","zendesk","g2","intercom","twitter","gong"].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 cursor-pointer transition-colors"
              onClick={() => document.getElementById("csv-file-input").click()}
            >
              <Upload className="h-8 w-8 text-text-secondary mx-auto mb-2" />
              <p className="text-sm text-text-secondary">
                {file ? file.name : "Click to select a CSV file"}
              </p>
              <input
                id="csv-file-input" type="file" accept=".csv"
                className="hidden"
                onChange={e => setFile(e.target.files[0])}
              />
            </div>
            {msg && <p className={`text-sm ${msg.startsWith("✅") ? "text-success" : "text-danger"}`}>{msg}</p>}
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => { onClose(); reset(); }}>Cancel</Button>
              <Button onClick={handleCSV} disabled={uploading}>
                {uploading ? "Uploading…" : "Upload"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Source</label>
              <select
                value={manualSource} onChange={e => setManualSource(e.target.value)}
                className="w-full h-10 px-3 border border-border rounded-lg bg-background text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {["csv","zendesk","g2","intercom","twitter","gong"].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Feedback Text</label>
              <textarea
                rows={4}
                value={manualText} onChange={e => setManualText(e.target.value)}
                placeholder="Enter customer feedback…"
                className="w-full p-3 border border-border rounded-lg bg-background text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              />
            </div>
            {msg && <p className={`text-sm ${msg.startsWith("✅") ? "text-success" : "text-danger"}`}>{msg}</p>}
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => { onClose(); reset(); }}>Cancel</Button>
              <Button onClick={handleManual} disabled={uploading}>
                {uploading ? "Saving…" : "Save Feedback"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ── Dashboard ─────────────────────────────────────────────────
export function Dashboard() {
  const navigate  = useNavigate();
  const [showUpload, setShowUpload] = useState(false);
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [dash, analytics] = await Promise.all([
        api.get("/dashboard/"),
        api.get("/analytics/"),
      ]);
      setData({ ...dash.data, analytics: analytics.data });
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  const kpis = [
    { label: "Total Feedback",    value: data?.total_feedback   ?? 0, icon: <MessageSquare className="h-4 w-4 text-text-muted" />, sub: "all sources" },
    { label: "Total Themes",      value: data?.total_themes     ?? 0, icon: <Layers         className="h-4 w-4 text-text-muted" />, sub: "AI extracted" },
    { label: "Feature Requests",  value: data?.feature_requests ?? 0, icon: <Zap            className="h-4 w-4 text-text-muted" />, sub: "in backlog" },
    { label: "Generated PRDs",    value: data?.generated_prds   ?? 0, icon: <FileText       className="h-4 w-4 text-text-muted" />, sub: "ready for review" },
    { label: "Roadmap Progress",  value: `${data?.roadmap_progress ?? 0}%`, icon: <Target  className="h-4 w-4 text-text-muted" />, sub: "milestones complete" },
  ];

  const sentimentColors = { Positive: "#10B981", Neutral: "#F59E0B", Negative: "#EF4444" };
  const growthData = data?.analytics?.feedback_growth ?? [];
  const sentimentData = data?.analytics?.sentiment ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* Header */}
<div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">

  {/* Left */}
  <div>
    <h2 className="text-2xl font-bold tracking-tight text-text-primary">
      Dashboard
    </h2>

    <p className="text-sm text-text-secondary mt-1">
      Customer Feedback Overview
    </p>
  </div>

  {/* Right */}
  <div className="flex flex-col sm:flex-row gap-3">
    <Button onClick={() => setShowUpload(true)}>
      <ArrowUp className="mr-2 h-4 w-4" />
      Upload Feedback
    </Button>

  </div>

</div>

      {/* AI Insights */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-start gap-4">
          <div className="rounded-full bg-primary/20 p-2 text-primary shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary mb-2 text-sm">AI Insights</h3>
            <ul className="text-sm text-text-secondary space-y-1 list-disc pl-4">
              {(data?.ai_insights ?? []).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">{k.label}</CardTitle>
              {k.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-text-primary">{k.value}</div>
              <p className="text-xs text-text-muted mt-1">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Feedback Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4F46E5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                  <RTooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB" }} />
                  <Area type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#grad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top Pain Points</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.pain_points ?? []).length > 0
                ? (data.pain_points).map((p, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-text-muted w-5 shrink-0">#{i + 1}</span>
                        <span className="text-sm text-text-primary truncate">{p.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-text-secondary">{p.frequency}</span>
                        <Badge variant={p.sentiment === "Negative" ? "danger" : p.sentiment === "Positive" ? "success" : "warning"}>
                          {p.sentiment}
                        </Badge>
                      </div>
                    </div>
                  ))
                : <p className="text-sm text-text-secondary">No themes extracted yet. Run the ThemeAgent.</p>
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Prioritization + Recent PRDs */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Feature Prioritization</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-text-secondary">
                    <th className="py-2 text-left font-medium">Rank</th>
                    <th className="py-2 text-left font-medium">Feature</th>
                    <th className="py-2 text-left font-medium">RICE</th>
                    <th className="py-2 text-left font-medium">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.feature_priority ?? []).length > 0
                    ? (data.feature_priority).map((f, i) => (
                        <tr key={i} className="hover:bg-surface-hover transition-colors">
                          <td className="py-3 text-text-muted">#{f.rank}</td>
                          <td className="py-3 font-medium text-text-primary">{f.feature}</td>
                          <td className="py-3 text-text-secondary">{f.rice}</td>
                          <td className="py-3">
                            <Badge variant={f.priority === "High" ? "danger" : f.priority === "Medium" ? "warning" : "default"}>
                              {f.priority}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    : <tr><td colSpan="4" className="py-4 text-center text-text-secondary text-sm">No priority scores yet.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent PRDs</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/prd-generator")}>View all</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.recent_prds ?? []).length > 0
                ? (data.recent_prds).map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{p.title}</p>
                          <p className="text-xs text-text-secondary">{p.date}</p>
                        </div>
                      </div>
                      <Badge variant="success">Generated</Badge>
                    </div>
                  ))
                : <p className="text-sm text-text-secondary">No PRDs generated yet.</p>
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quarterly Roadmap Widget */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Quarterly Roadmap</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/roadmap")}>View full roadmap</Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["Q1","Q2","Q3","Q4"].map(q => {
              const items = data?.roadmap_widget?.[q] ?? [];
              return (
                <div key={q} className="bg-surface-hover/50 rounded-lg p-3 border border-border">
                  <p className="text-sm font-semibold text-text-primary mb-2 flex items-center justify-between">
                    {q}
                    <Badge variant="outline">{items.length}</Badge>
                  </p>
                  {items.length === 0
                    ? <p className="text-xs text-text-muted">No items</p>
                    : items.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 py-1">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${
                            item.status === "Completed"   ? "bg-success" :
                            item.status === "In Progress" ? "bg-primary" : "bg-border"
                          }`} />
                          <span className="text-xs text-text-primary truncate">{item.title}</span>
                        </div>
                      ))
                  }
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>



      <UploadFeedbackModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
