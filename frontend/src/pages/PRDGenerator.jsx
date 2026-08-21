// src/pages/PRDGenerator.jsx
import React, { useState, useEffect, useCallback } from "react";
import { FileText, Download, Sparkles, Wand2, Copy, RefreshCw, Search, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import api from "../services/api";

export function PRDGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [prdContent, setPrdContent]     = useState("");
  const [prdId, setPrdId]               = useState(null);
  const [featureName, setFeatureName]   = useState("");
  const [description, setDescription]   = useState("");
  const [priority, setPriority]         = useState("High");
  const [businessGoal, setBusinessGoal] = useState("");
  const [targetUsers, setTargetUsers]   = useState("");
  const [error, setError]               = useState("");

  // Previous PRDs
  const [prevPRDs, setPrevPRDs]       = useState([]);
  const [prdSearch, setPrdSearch]     = useState("");
  const [showPrev, setShowPrev]       = useState(false);
  const [selectedPRD, setSelectedPRD] = useState(null);

  // Pre-fill from Feature Requests page
  useEffect(() => {
    const prefill = localStorage.getItem("prd_prefill");
    if (prefill) {
      try {
        const data = JSON.parse(prefill);
        setFeatureName(data.feature_name  ?? "");
        setDescription(data.description   ?? "");
        setPriority(data.priority         ?? "High");
        setBusinessGoal(data.business_goal ?? "");
        setTargetUsers(data.target_users  ?? "");
        localStorage.removeItem("prd_prefill");
      } catch { /* ignore */ }
    }
  }, []);

  const fetchPrevPRDs = useCallback(async () => {
    try {
      const res = await api.get("/prd/");
      setPrevPRDs(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchPrevPRDs(); }, [fetchPrevPRDs]);

  const handleGenerate = async () => {
    if (!featureName.trim()) { setError("Feature name is required."); return; }
    setIsGenerating(true);
    setError("");
    setPrdContent("");

    try {
      const res = await api.post("/prd/generate", {
        feature_name:  featureName,
        description:   description,
        priority:      priority,
        business_goal: businessGoal,
        target_users:  targetUsers,
      });
      setPrdContent(res.data.prd);
      setPrdId(res.data.document_id);
      fetchPrevPRDs();   // refresh previous PRDs list
    } catch (err) {
      const msg = err.response?.data?.detail ?? "Error generating PRD. Check backend.";
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(prdContent);
  };

  const handleLoadPRD = (prd) => {
    setPrdContent(
      `# ${prd.title}\n\n` +
      `## Problem Statement\n${prd.problem_statement}\n\n` +
      `## Objectives\n${prd.objectives}\n\n` +
      `## User Stories\n${prd.user_stories}\n\n` +
      `## Acceptance Criteria\n${prd.acceptance_criteria}\n\n` +
      `## Success Metrics\n${prd.success_metrics}`
    );
    setPrdId(prd.id);
    setFeatureName(prd.title);
    setShowPrev(false);
  };

  const filteredPRDs = prevPRDs.filter(p =>
    !prdSearch || p.title?.toLowerCase().includes(prdSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">PRD Generator</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Automatically draft Product Requirements Documents using AI.
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowPrev(true)}>
          <Clock className="mr-2 h-4 w-4" />
          Previous PRDs ({prevPRDs.length})
        </Button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Left Panel */}
        <Card className="w-full lg:w-1/3 flex flex-col h-full bg-surface">
          <CardHeader className="border-b border-border py-4 px-6 shrink-0">
            <CardTitle className="text-lg">Feature Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex-1 overflow-y-auto space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Feature Name <span className="text-danger">*</span>
              </label>
              <Input
                value={featureName}
                onChange={e => setFeatureName(e.target.value)}
                placeholder="e.g., Dark Mode"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Description</label>
              <textarea
                className="w-full p-3 border border-border rounded-lg bg-background text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary text-sm min-h-[100px] resize-y"
                placeholder="Briefly describe what this feature does…"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Priority</label>
              <select
                className="w-full h-10 px-3 py-2 border border-border rounded-lg bg-background text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                value={priority}
                onChange={e => setPriority(e.target.value)}
              >
                {["Critical","High","Medium","Low"].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Business Goal</label>
              <Input
                value={businessGoal}
                onChange={e => setBusinessGoal(e.target.value)}
                placeholder="e.g., Increase user retention"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Target Users</label>
              <Input
                value={targetUsers}
                onChange={e => setTargetUsers(e.target.value)}
                placeholder="e.g., Enterprise Admins"
              />
            </div>
            {error && (
              <p className="text-sm text-danger">{error}</p>
            )}
          </CardContent>
          <div className="p-6 border-t border-border shrink-0">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !featureName.trim()}
              className="w-full py-6 text-base"
            >
              {isGenerating ? (
                <span className="flex items-center">
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating AI PRD…
                </span>
              ) : (
                <span className="flex items-center">
                  <Wand2 className="mr-2 h-5 w-5" />
                  Generate PRD
                </span>
              )}
            </Button>
          </div>
        </Card>

        {/* Right Panel */}
        <Card className="w-full lg:w-2/3 flex flex-col h-full bg-surface shadow-sm">
          {prdContent ? (
            <>
              <div className="flex items-center justify-between px-8 py-4 border-b border-border shrink-0 bg-background/50 rounded-t-xl">
                <div className="flex items-center text-sm font-medium text-text-secondary">
                  <FileText className="h-4 w-4 mr-2" />
                  Generated Document {prdId && <span className="ml-2 text-xs text-text-muted">#{prdId}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-text-secondary hover:text-text-primary" onClick={handleCopy}>
                    <Copy className="h-4 w-4 mr-1.5" /> Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
                    <RefreshCw className="h-4 w-4 mr-1.5" /> Regenerate
                  </Button>
                </div>
              </div>
              <CardContent className="p-0 flex-1 overflow-hidden relative">
                <textarea
                  className="w-full h-full p-8 bg-transparent border-0 focus:ring-0 resize-none text-text-primary font-mono text-sm leading-relaxed"
                  value={prdContent}
                  onChange={e => setPrdContent(e.target.value)}
                  placeholder="Your PRD will appear here…"
                />
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Wand2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">AI-Powered PRD Generator</h3>
              <p className="text-text-secondary max-w-md">
                Fill out the details in the left panel and click Generate. AI will structure a comprehensive
                Product Requirements Document and save it to your database.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Previous PRDs Modal */}
      <Modal
        isOpen={showPrev}
        onClose={() => setShowPrev(false)}
        title="Previous PRDs"
        className="max-w-lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <Input
              type="text"
              placeholder="Search PRDs…"
              className="pl-9"
              value={prdSearch}
              onChange={e => setPrdSearch(e.target.value)}
            />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {filteredPRDs.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-8">
                {prdSearch ? "No PRDs match your search." : "No PRDs generated yet."}
              </p>
            ) : (
              filteredPRDs.map(prd => (
                <button
                  key={prd.id}
                  onClick={() => handleLoadPRD(prd)}
                  className="w-full text-left p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{prd.title}</p>
                        <p className="text-xs text-text-secondary mt-0.5">{prd.created_at}</p>
                      </div>
                    </div>
                    <span className="text-xs text-primary font-medium shrink-0 ml-3">Load →</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}