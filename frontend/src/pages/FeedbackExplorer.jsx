// src/pages/FeedbackExplorer.jsx
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Filter, Search, Eye, Sparkles, Upload, Plus, Brain } from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import api from "../services/api";

// ── Sentiment display helper ──────────────────────────────────
function SentimentDisplay({ sentiment }) {
  const variant = {
    Positive: "success",
    Neutral: "warning",
    Negative: "danger",
  }[sentiment] ?? "default";

  return (
    <Badge variant={variant}>
      {sentiment || "Not analyzed"}
    </Badge>
  );
}


// ── Upload / Manual entry modal ───────────────────────────────
function UploadModal({ isOpen, onClose, onSuccess }) {
  const [tab, setTab] = useState("csv");
  const [file, setFile] = useState(null);
  const [source, setSource] = useState("csv");
  const [manualText, setManualText] = useState("");
  const [manualSrc, setManualSrc] = useState("csv");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const reset = () => {
    setFile(null);
    setManualText("");
    setMsg("");
  };

  const handleCSV = async () => {
    if (!file) {
      setMsg("Select a CSV file.");
      return;
    }

    setBusy(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("source", source);

      await api.post("/feedback/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMsg("Uploaded!");

      setTimeout(() => {
        onSuccess();
        onClose();
        reset();
      }, 700);
    } catch {
      setMsg("Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleManual = async () => {
    if (!manualText.trim()) {
      setMsg("Enter feedback text.");
      return;
    }

    setBusy(true);

    try {
      await api.post("/feedback/manual", {
        feedback_text: manualText,
        source: manualSrc,
      });

      setMsg("Saved!");

      setTimeout(() => {
        onSuccess();
        onClose();
        reset();
      }, 700);
    } catch {
      setMsg("Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const SOURCES = [
    "csv",
    "zendesk",
    "g2",
    "intercom",
    "twitter",
    "gong",
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        reset();
      }}
      title="Upload Feedback"
    >
      <div className="space-y-4">

        <div className="flex border-b border-border">
          {["csv", "manual"].map((t) => (
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
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Source
              </label>

              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full h-10 px-3 border border-border rounded-lg bg-background text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 cursor-pointer transition-colors"
              onClick={() =>
                document.getElementById("fe-file-input").click()
              }
            >
              <Upload className="h-8 w-8 text-text-secondary mx-auto mb-2" />

              <p className="text-sm text-text-secondary">
                {file ? file.name : "Click to select a CSV file"}
              </p>

              <input
                id="fe-file-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Source
              </label>

              <select
                value={manualSrc}
                onChange={(e) => setManualSrc(e.target.value)}
                className="w-full h-10 px-3 border border-border rounded-lg bg-background text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Feedback Text
              </label>

              <textarea
                rows={4}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Enter customer feedback..."
                className="w-full p-3 border border-border rounded-lg bg-background text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              />
            </div>
          </>
        )}

        {msg && (
          <p
            className={`text-sm ${
              msg === "Uploaded!" || msg === "Saved!"
                ? "text-success"
                : "text-danger"
            }`}
          >
            {msg}
          </p>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              reset();
            }}
          >
            Cancel
          </Button>

          <Button
            onClick={tab === "csv" ? handleCSV : handleManual}
            disabled={busy}
          >
            {busy
              ? "Saving..."
              : tab === "csv"
              ? "Upload"
              : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}


// ── Feedback Detail Modal with On-Demand Sentiment Analysis ─────
function FeedbackDetailModal({
  item,
  onClose,
  onSentimentUpdate,
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [sentimentMsg, setSentimentMsg] = useState("");

  // Local copy so UI updates instantly without closing modal
  const [currentSentiment, setCurrentSentiment] = useState(
    item?.sentiment || "Not analyzed"
  );

  // Sync when item changes
  useEffect(() => {
    setCurrentSentiment(item?.sentiment || "Not analyzed");
    setSentimentMsg("");
  }, [item?.id, item?.sentiment]);

  const isAnalyzed =
    currentSentiment &&
    currentSentiment !== "Not analyzed" &&
    currentSentiment !== "—";

  const handleAnalyze = async () => {
    if (!item?.id || analyzing) {
      return;
    }

    setAnalyzing(true);
    setSentimentMsg("");

    try {
      const res = await api.post(
        `/feedback/${item.id}/analyze-sentiment`
      );

      const newSentiment = res.data.sentiment;

      if (!newSentiment) {
        throw new Error("No sentiment was returned by the server.");
      }

      setCurrentSentiment(newSentiment);

      setSentimentMsg("Sentiment analyzed successfully.");

      // Update parent table row without refetching everything
      onSentimentUpdate(item.id, newSentiment);

    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        err.message ||
        "Analysis failed.";

      setSentimentMsg(detail);
    } finally {
      setAnalyzing(false);
    }
  };

  const getSentimentVariant = (s) =>
    ({
      Positive: "success",
      Neutral: "warning",
      Negative: "danger",
    }[s] ?? "default");

  const getPriorityVariant = (p) =>
    ({
      Critical: "danger",
      High: "warning",
      Medium: "primary",
      Low: "default",
    }[p] ?? "default");

  if (!item) {
    return null;
  }

  return (
    <Modal
      isOpen={!!item}
      onClose={onClose}
      title="Feedback Details"
    >
      <div className="space-y-4">

        {/* Title */}
        <div>
          <h4 className="text-sm font-medium text-text-secondary mb-1">
            Title
          </h4>

          <p className="font-medium text-text-primary">
            {item.title}
          </p>
        </div>


        {/* Description */}
        <div>
          <h4 className="text-sm font-medium text-text-secondary mb-1">
            Description
          </h4>

          <p className="text-sm text-text-primary bg-surface-hover p-3 rounded-lg border border-border">
            {item.description || "No description available."}
          </p>
        </div>


        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-4">

          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-1">
              Category
            </h4>

            <Badge variant="outline">
              {item.category || "—"}
            </Badge>
          </div>


          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-1">
              Priority
            </h4>

            <Badge variant={getPriorityVariant(item.priority)}>
              {item.priority || "—"}
            </Badge>
          </div>


          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-1">
              Source
            </h4>

            <Badge variant="outline">
              {item.source || "—"}
            </Badge>
          </div>


          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-1">
              Date
            </h4>

            <span className="text-sm text-text-primary">
              {item.date || "—"}
            </span>
          </div>

        </div>


        {/* Sentiment section */}
        <div className="rounded-lg border border-border p-4 bg-surface-hover/40 space-y-3">

          <div className="flex items-center justify-between">

            <h4 className="text-sm font-medium text-text-secondary">
              Sentiment
            </h4>

            {isAnalyzed && (
              <span className="text-xs text-text-muted">
                AI analyzed
              </span>
            )}

          </div>


          {/* Current sentiment */}
          <div className="flex items-center gap-2">

            <Badge
              variant={getSentimentVariant(currentSentiment)}
            >
              {currentSentiment}
            </Badge>

          </div>


          {/* Analyze button - only shown before analysis */}
          {!isAnalyzed && (
            <Button
              onClick={handleAnalyze}
              disabled={analyzing}
              size="sm"
              className="w-full mt-1"
            >
              <Brain className="mr-2 h-4 w-4" />

              {analyzing
                ? "Analyzing..."
                : "Analyze Sentiment"}
            </Button>
          )}


          {/* Loading text */}
          {analyzing && (
            <p className="text-xs text-text-secondary">
              Analyzing the feedback sentiment. Please wait...
            </p>
          )}


          {/* Status message */}
          {sentimentMsg && (
            <p
              className={`text-xs mt-1 ${
                sentimentMsg === "Sentiment analyzed successfully."
                  ? "text-success"
                  : "text-danger"
              }`}
            >
              {sentimentMsg}
            </p>
          )}

        </div>


        {/* Footer */}
        <div className="pt-2 border-t border-border flex justify-end">

          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>

        </div>

      </div>
    </Modal>
  );
}


// ── Main page ─────────────────────────────────────────────────
export function FeedbackExplorer() {
  const [feedback, setFeedback] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [priorityFilter, setPriorityFilter] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const limit = 50;


  // ── Fetch feedback ───────────────────────────────────────────
  const fetchFeedback = useCallback(async () => {
    setLoading(true);

    try {
      const res = await api.get(
        `/feedback/?page=${page}&limit=${limit}`
      );

      setFeedback(
        (res.data.items || []).map((item) => ({
          ...item,
          title: item.feedback_text || "",
          category: item.source || "",
          date: item.feedback_date || "",
          priority: item.priority || "—",
          sentiment: item.sentiment || "Not analyzed",
          status: item.status || "New",
        }))
      );

      setTotal(res.data.total || 0);

    } catch (err) {
      console.error("Failed to fetch feedback:", err);
    } finally {
      setLoading(false);
    }
  }, [page]);


  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);


  // ── Update sentiment in table without refetching ─────────────
  const handleSentimentUpdate = useCallback(
    (id, newSentiment) => {

      setFeedback((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                sentiment: newSentiment,
              }
            : f
        )
      );


      // Also update the open modal data
      setSelectedFeedback((prev) =>
        prev?.id === id
          ? {
              ...prev,
              sentiment: newSentiment,
            }
          : prev
      );
    },
    []
  );


  // ── Theme Agent analysis ─────────────────────────────────────
  const runThemeAnalysis = async () => {
    setAnalyzing(true);

    try {
      const res = await api.post("/themes/analyze");

      alert(
        res.data.message ||
          "Theme analysis completed successfully."
      );

    } catch (err) {

      alert(
        err.response?.data?.detail ||
          "Theme analysis failed."
      );

    } finally {
      setAnalyzing(false);
    }
  };


  // ── Sentiment / Priority variants ────────────────────────────
  const getSentimentVariant = (s) =>
    ({
      Positive: "success",
      Neutral: "warning",
      Negative: "danger",
    }[s] ?? "default");


  const getPriorityVariant = (p) =>
    ({
      Critical: "danger",
      High: "warning",
      Medium: "primary",
      Low: "default",
    }[p] ?? "default");


  // ── Filtering ────────────────────────────────────────────────
  const filteredFeedback = useMemo(
    () =>
      feedback.filter((item) => {

        const q = searchTerm.toLowerCase();

        const matchSearch =
          !searchTerm ||
          item.title?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q);

        const matchPriority =
          !priorityFilter ||
          item.priority === priorityFilter;

        const matchSentiment =
          !sentimentFilter ||
          item.sentiment === sentimentFilter;

        const matchCategory =
          !categoryFilter ||
          item.category === categoryFilter;

        return (
          matchSearch &&
          matchPriority &&
          matchSentiment &&
          matchCategory
        );
      }),
    [
      feedback,
      searchTerm,
      priorityFilter,
      sentimentFilter,
      categoryFilter,
    ]
  );


  // ── Statistics ───────────────────────────────────────────────
  const stats = {
    total: filteredFeedback.length,

    analyzed:
      filteredFeedback.filter(
        (f) =>
          f.sentiment &&
          f.sentiment !== "Not analyzed" &&
          f.sentiment !== "—"
      ).length,

    notAnalyzed:
      filteredFeedback.filter(
        (f) =>
          !f.sentiment ||
          f.sentiment === "Not analyzed" ||
          f.sentiment === "—"
      ).length,

    positive:
      filteredFeedback.filter(
        (f) => f.sentiment === "Positive"
      ).length,

    neutral:
      filteredFeedback.filter(
        (f) => f.sentiment === "Neutral"
      ).length,

    negative:
      filteredFeedback.filter(
        (f) => f.sentiment === "Negative"
      ).length,
  };


  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Feedback Explorer
        </h1>


        <div className="flex items-center gap-3 flex-wrap">

          <div className="relative w-64">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />

            <Input
              type="text"
              placeholder="Search feedback..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
            />

          </div>


          {/* Theme Agent button */}
          <Button
            variant="outline"
            onClick={runThemeAnalysis}
            disabled={analyzing}
          >
            <Sparkles className="mr-2 h-4 w-4" />

            {analyzing
              ? "Analyzing..."
              : "Run AI Analysis"}
          </Button>


          {/* Filter */}
          <Button
            variant={showFilters ? "primary" : "outline"}
            onClick={() =>
              setShowFilters(!showFilters)
            }
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>


          {/* Upload */}
          <Button
            onClick={() => setShowUpload(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Upload Feedback
          </Button>

        </div>
      </div>


      {/* Filters */}
      {showFilters && (
        <Card className="p-4 bg-surface-hover/50 border-border">

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">

            {[
              {
                label: "Priority",
                value: priorityFilter,
                set: setPriorityFilter,
                opts: [
                  "Critical",
                  "High",
                  "Medium",
                  "Low",
                ],
              },

              {
                label: "Sentiment",
                value: sentimentFilter,
                set: setSentimentFilter,
                opts: [
                  "Positive",
                  "Neutral",
                  "Negative",
                  "Not analyzed",
                ],
              },

              {
                label: "Category",
                value: categoryFilter,
                set: setCategoryFilter,
                opts: [
                  "Bug",
                  "Performance",
                  "Feature Request",
                  "UI/UX",
                  "Authentication",
                  "Payment",
                  "General",
                ],
              },
            ].map(
              ({
                label,
                value,
                set,
                opts,
              }) => (
                <div key={label}>

                  <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                    {label}
                  </label>

                  <select
                    value={value}
                    onChange={(e) =>
                      set(e.target.value)
                    }
                    className="w-full h-10 px-3 py-2 border border-border rounded-md bg-surface text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >

                    <option value="">
                      All {label}s
                    </option>

                    {opts.map((o) => (
                      <option
                        key={o}
                        value={o}
                      >
                        {o}
                      </option>
                    ))}

                  </select>

                </div>
              )
            )}


            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setPriorityFilter("");
                setSentimentFilter("");
                setCategoryFilter("");
                setSearchTerm("");
              }}
            >
              Reset
            </Button>

          </div>
        </Card>
      )}


      {/* AI Summary */}
      <Card className="bg-primary/5 border-primary/20">

        <CardContent className="p-4 flex items-start gap-4">

          <div className="rounded-full bg-primary/20 p-2 text-primary shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>


          <div>

            <h3 className="font-semibold text-text-primary mb-2 text-sm">
              AI Summary
            </h3>

            <ul className="text-sm text-text-secondary space-y-1 list-disc pl-4">

              <li>
                {stats.negative} negative feedback items need attention.
              </li>

              <li>
                {stats.positive} positive items show what's working well.
              </li>

              <li>
                {stats.analyzed} of {stats.total} feedback items have been analyzed.
              </li>

              <li>
                {stats.notAnalyzed} feedback items are waiting for sentiment analysis.
              </li>

              <li>
                Click <strong>View</strong> on any row, then{" "}
                <strong>Analyze Sentiment</strong> to classify it with Gemini AI.
              </li>

            </ul>

          </div>
        </CardContent>
      </Card>


      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

        {[
          {
            label: "Total Feedback",
            value: stats.total,
            cls: "text-text-primary",
          },

          {
            label: "Analyzed",
            value: stats.analyzed,
            cls: "text-primary",
          },

          {
            label: "Not Analyzed",
            value: stats.notAnalyzed,
            cls: "text-text-secondary",
          },

          {
            label: "Positive",
            value: stats.positive,
            cls: "text-success",
          },

          {
            label: "Neutral",
            value: stats.neutral,
            cls: "text-warning",
          },

          {
            label: "Negative",
            value: stats.negative,
            cls: "text-danger",
          },
        ].map((s, i) => (
          <Card
            key={i}
            className="p-4 flex flex-col items-center justify-center text-center"
          >
            <span
              className={`text-2xl font-bold ${s.cls}`}
            >
              {s.value}
            </span>

            <span className="text-xs text-text-secondary mt-1 uppercase tracking-wider">
              {s.label}
            </span>
          </Card>
        ))}

      </div>


      {/* Table */}
      <Card>

        <div className="overflow-x-auto">

          <table className="w-full text-left text-sm">

            <thead className="bg-surface-hover/50 border-b border-border text-text-secondary">

              <tr>

                {[
                  "Title",
                  "Category",
                  "Priority",
                  "Sentiment",
                  "Date",
                  "Status",
                  "Action",
                ].map((h) => (

                  <th
                    key={h}
                    className={`px-6 py-4 font-medium ${
                      h === "Action"
                        ? "text-right"
                        : ""
                    }`}
                  >
                    {h}
                  </th>

                ))}

              </tr>

            </thead>


            <tbody className="divide-y divide-border">

              {loading ? (

                <tr>

                  <td
                    colSpan="7"
                    className="px-6 py-12 text-center text-text-secondary"
                  >
                    Loading...
                  </td>

                </tr>

              ) : filteredFeedback.length > 0 ? (

                filteredFeedback.map((item) => (

                  <tr
                    key={item.id}
                    className="hover:bg-surface-hover transition-colors"
                  >

                    {/* Title */}
                    <td className="px-6 py-4">

                      <p className="font-medium text-text-primary">
                        {item.title}
                      </p>

                      <p className="mt-1 text-xs text-text-secondary truncate max-w-[200px]">
                        {item.description}
                      </p>

                    </td>


                    {/* Category */}
                    <td className="px-6 py-4">

                      <Badge variant="outline">
                        {item.category}
                      </Badge>

                    </td>


                    {/* Priority */}
                    <td className="px-6 py-4">

                      <Badge
                        variant={getPriorityVariant(item.priority)}
                      >
                        {item.priority}
                      </Badge>

                    </td>


                    {/* Sentiment */}
                    <td className="px-6 py-4">

                      <SentimentDisplay
                        sentiment={item.sentiment}
                      />

                    </td>


                    {/* Date */}
                    <td className="px-6 py-4 text-text-secondary">
                      {item.date}
                    </td>


                    {/* Status */}
                    <td className="px-6 py-4">

                      <Badge
                        variant="outline"
                        className="bg-transparent border-dashed"
                      >
                        {item.status}
                      </Badge>

                    </td>


                    {/* Action */}
                    <td className="px-6 py-4 text-right">

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setSelectedFeedback(item)
                        }
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>

                    </td>

                  </tr>

                ))

              ) : (

                <tr>

                  <td
                    colSpan="7"
                    className="px-6 py-12 text-center text-text-secondary"
                  >
                    No feedback found matching the current filters.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>


        {/* Pagination */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between">

          <p className="text-sm text-text-secondary">
            Showing {filteredFeedback.length} of {total} entries
          </p>


          <div className="flex gap-2">

            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() =>
                setPage((p) => Math.max(1, p - 1))
              }
            >
              Previous
            </Button>


            <Button
              variant="outline"
              size="sm"
              disabled={page * limit >= total}
              onClick={() =>
                setPage((p) => p + 1)
              }
            >
              Next
            </Button>

          </div>

        </div>

      </Card>


      {/* Feedback Detail Modal */}
      <FeedbackDetailModal
        item={selectedFeedback}
        onClose={() =>
          setSelectedFeedback(null)
        }
        onSentimentUpdate={handleSentimentUpdate}
      />


      {/* Upload Modal */}
      <UploadModal
        isOpen={showUpload}
        onClose={() =>
          setShowUpload(false)
        }
        onSuccess={fetchFeedback}
      />

    </div>
  );
}