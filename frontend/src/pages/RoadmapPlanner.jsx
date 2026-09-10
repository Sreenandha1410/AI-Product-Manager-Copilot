import React, { useEffect, useRef, useState } from "react";

const API_BASE = "http://localhost:8000";

export default function RoadmapPlanner() {
  const [prds, setPrds] = useState([]);
  const [selectedPRD, setSelectedPRD] = useState(null);

  const [roadmap, setRoadmap] = useState(null);
  const [loadingPRDs, setLoadingPRDs] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState("");
  const [expandedFeature, setExpandedFeature] = useState(null);

  const selectedRef = useRef(null);
  const roadmapRef = useRef(null);

  useEffect(() => {
    loadPRDs();
  }, []);

  async function loadPRDs() {
    try {
      setLoadingPRDs(true);
      setError("");

      const response = await fetch(`${API_BASE}/prd/`);

      if (!response.ok) {
        throw new Error("Unable to load generated PRDs.");
      }

      const data = await response.json();

      let items = [];

      if (Array.isArray(data)) {
        items = data;
      } else if (Array.isArray(data.prds)) {
        items = data.prds;
      } else if (Array.isArray(data.data)) {
        items = data.data;
      }

      setPrds(items);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load PRDs.");
    } finally {
      setLoadingPRDs(false);
    }
  }

  function normalizePRD(prd) {
    return {
      id: prd.id ?? prd.prd_id ?? prd.document_id,

      title:
        prd.title ||
        prd.feature_name ||
        "Untitled Product Requirement",

      problem_statement:
        prd.problem_statement ||
        "No problem statement available.",

      objectives:
        prd.objectives ||
        "No objectives available.",

      user_stories:
        prd.user_stories ||
        "",

      acceptance_criteria:
        prd.acceptance_criteria ||
        "",

      success_metrics:
        prd.success_metrics ||
        "",

      created_at:
        prd.created_at ||
        "",
    };
  }

  async function selectPRD(prd) {
    const normalized = normalizePRD(prd);

    setSelectedPRD(normalized);
    setRoadmap(null);
    setError("");

    /*
      Move immediately to the selected PRD section.
    */
    setTimeout(() => {
      selectedRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);

    /*
      Automatically generate the roadmap.
    */
    await generateRoadmap(normalized);
  }

  async function generateRoadmap(prd = selectedPRD) {
    if (!prd?.id) {
      setError("Invalid PRD selected.");
      return;
    }

    try {
      setGenerating(true);
      setError("");
      setRoadmap(null);

      const response = await fetch(`${API_BASE}/roadmap/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prd_id: prd.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
          data.message ||
          "Roadmap generation failed."
        );
      }

      const roadmapData =
        data.data ||
        data.roadmap ||
        data;

      const features =
        roadmapData.features ||
        roadmapData.items ||
        [];

      const normalizedRoadmap = {
        roadmap_name:
          roadmapData.roadmap_name ||
          roadmapData.title ||
          `${prd.title} Execution Plan`,

        timeline:
          roadmapData.timeline ||
          "Sprint-based execution",

        features: features.map((feature, index) => ({
          id: index + 1,

          feature_name:
            feature.feature_name ||
            feature.title ||
            `Feature ${index + 1}`,

          description:
            feature.description ||
            "No description available.",

          priority:
            feature.priority ||
            "Medium",

          rice_score:
            feature.rice_score ?? null,

          ice_score:
            feature.ice_score ?? null,

          release:
            feature.release ||
            feature.sprint ||
            `Sprint ${index + 1}`,

          milestone:
            feature.milestone ||
            "Product Development",

          status:
            feature.status ||
            "Planned",

          progress:
            typeof feature.progress === "number"
              ? feature.progress
              : getProgress(feature.status),

          dependencies:
            Array.isArray(feature.dependencies)
              ? feature.dependencies
              : [],

          unresolved_dependencies:
            Array.isArray(feature.unresolved_dependencies)
              ? feature.unresolved_dependencies
              : [],

          blocked_by:
            Array.isArray(feature.blocked_by)
              ? feature.blocked_by
              : [],

          blocker:
            feature.blocker ||
            "",

          resolution_steps:
            Array.isArray(feature.resolution_steps)
              ? feature.resolution_steps
              : [],

          next_action:
            feature.next_action ||
            "Begin implementation.",

          reason:
            feature.reason ||
            "Scheduled based on product priority.",
        })),
      };

      setRoadmap(normalizedRoadmap);

      /*
        Once roadmap is generated,
        automatically move to the execution plan.
      */
      setTimeout(() => {
        roadmapRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);

    } catch (err) {
      console.error("Roadmap generation error:", err);

      setError(
        err.message ||
        "Something went wrong while generating the roadmap."
      );
    } finally {
      setGenerating(false);
    }
  }

  function getProgress(status) {
    switch (status) {
      case "Completed":
        return 100;

      case "In Progress":
        return 60;

      case "Blocked":
        return 0;

      default:
        return 0;
    }
  }

  function toggleFeature(index) {
    setExpandedFeature(
      expandedFeature === index ? null : index
    );
  }

  function getPriorityClass(priority) {
    if (priority === "High") return "priority-high";
    if (priority === "Medium") return "priority-medium";
    return "priority-low";
  }

  function getStatusClass(status) {
    if (status === "Blocked") return "status-blocked";
    if (status === "Completed") return "status-completed";
    if (status === "In Progress") return "status-progress";
    return "status-planned";
  }

  function formatDate(value) {
    if (!value) return "";

    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  }

  const totalFeatures = roadmap?.features?.length || 0;

  const highPriority =
    roadmap?.features?.filter(
      (item) => item.priority === "High"
    ).length || 0;

  const blocked =
    roadmap?.features?.filter(
      (item) => item.status === "Blocked"
    ).length || 0;

  const inProgress =
    roadmap?.features?.filter(
      (item) => item.status === "In Progress"
    ).length || 0;

  const planned =
    roadmap?.features?.filter(
      (item) => item.status === "Planned"
    ).length || 0;

  const completed =
    roadmap?.features?.filter(
      (item) => item.status === "Completed"
    ).length || 0;

  return (
    <div className="roadmap-page">

      <style>{`

        * {
          box-sizing: border-box;
        }

        .roadmap-page {
          padding: 34px 42px 70px;
          background: #f7f8fc;
          min-height: 100vh;
          color: #172033;
        }

        .roadmap-container {
          max-width: 1250px;
          margin: auto;
        }

        .page-header {
          margin-bottom: 28px;
        }

        .page-header h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 750;
          letter-spacing: -0.5px;
        }

        .page-header p {
          margin: 9px 0 0;
          color: #69758a;
          font-size: 15px;
        }

        .section {
          background: white;
          border: 1px solid #e4e7ef;
          border-radius: 18px;
          padding: 26px;
          margin-bottom: 25px;
          box-shadow: 0 5px 18px rgba(30, 40, 70, 0.035);
        }

        .section-title {
          font-size: 21px;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .section-subtitle {
          color: #718096;
          font-size: 14px;
          margin-bottom: 22px;
        }

        .prd-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .prd-card {
          border: 1px solid #e1e5ee;
          border-radius: 15px;
          padding: 19px;
          background: white;
          transition: 0.2s ease;
          cursor: pointer;
        }

        .prd-card:hover {
          border-color: #6651e8;
          box-shadow: 0 7px 20px rgba(91, 76, 180, 0.10);
          transform: translateY(-1px);
        }

        .prd-card.selected {
          border: 2px solid #6046e5;
          background: #faf9ff;
        }

        .prd-title {
          font-size: 17px;
          font-weight: 700;
          margin-bottom: 9px;
        }

        .prd-problem {
          color: #67748a;
          line-height: 1.55;
          font-size: 13px;
          min-height: 63px;
        }

        .prd-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 17px;
        }

        .date {
          color: #8993a5;
          font-size: 12px;
        }

        button {
          border: none;
          cursor: pointer;
          font-family: inherit;
        }

        .select-btn {
          padding: 9px 15px;
          background: #6046e5;
          color: white;
          border-radius: 9px;
          font-weight: 650;
        }

        .select-btn:hover {
          background: #4f39c9;
        }

        .selected-badge {
          padding: 8px 13px;
          border-radius: 9px;
          background: #ece8ff;
          color: #5540ca;
          font-size: 13px;
          font-weight: 700;
        }

        .selected-prd {
          border: 2px solid #ded8ff;
          background: #fbfaff;
        }

        .selected-prd-title {
          font-size: 26px;
          font-weight: 750;
          margin-bottom: 22px;
        }

        .detail-block {
          margin-bottom: 19px;
        }

        .detail-label {
          font-weight: 700;
          font-size: 14px;
          margin-bottom: 6px;
        }

        .detail-text {
          color: #68758b;
          line-height: 1.65;
          white-space: pre-line;
        }

        .generate-area {
          display: flex;
          justify-content: flex-end;
          margin-top: 24px;
        }

        .generate-btn {
          padding: 13px 21px;
          background: #121827;
          color: white;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
        }

        .generate-btn:hover {
          background: #20293a;
        }

        .generate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-box {
          padding: 14px 17px;
          background: #fff2f2;
          border: 1px solid #ffcaca;
          color: #c63838;
          border-radius: 10px;
          margin-bottom: 20px;
        }

        .loading {
          text-align: center;
          padding: 35px;
          color: #718096;
        }

        .roadmap-header {
          padding: 27px;
          border-radius: 18px;
          background: white;
          border: 1px solid #e2e6ef;
          margin-bottom: 18px;
        }

        .roadmap-header h2 {
          margin: 0;
          font-size: 28px;
        }

        .roadmap-header p {
          margin: 8px 0 0;
          color: #718096;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 13px;
          margin-bottom: 22px;
        }

        .stat {
          background: white;
          border: 1px solid #e3e7ef;
          border-radius: 13px;
          padding: 18px;
        }

        .stat-number {
          font-size: 25px;
          font-weight: 750;
          margin-bottom: 5px;
        }

        .stat-label {
          color: #718096;
          font-size: 12px;
        }

        .execution-box {
          background: white;
          border: 1px solid #e2e6ef;
          border-radius: 18px;
          padding: 26px;
        }

        .execution-heading {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .execution-description {
          color: #718096;
          font-size: 14px;
          margin-bottom: 22px;
        }

        .feature-card {
          border: 1px solid #e0e4ed;
          border-radius: 16px;
          margin-bottom: 18px;
          overflow: hidden;
          background: white;
        }

        .feature-top {
          padding: 22px;
        }

        .feature-heading {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }

        .number {
          min-width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #6246e5;
          color: white;
          font-weight: 750;
        }

        .feature-name {
          font-size: 20px;
          font-weight: 700;
          flex: 1;
        }

        .feature-description {
          margin-left: 50px;
          margin-top: 4px;
          color: #69758a;
          line-height: 1.5;
        }

        .status {
          padding: 8px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
        }

        .status-planned {
          background: #eeeaff;
          color: #5942d2;
        }

        .status-progress {
          background: #fff4dc;
          color: #a46b00;
        }

        .status-completed {
          background: #e5f8ed;
          color: #23804b;
        }

        .status-blocked {
          background: #ffe7e7;
          color: #c83232;
        }

        .priority-high {
          color: #d63434;
        }

        .priority-medium {
          color: #a66a00;
        }

        .priority-low {
          color: #54708e;
        }

        .meta-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          margin-top: 21px;
          margin-left: 50px;
        }

        .meta {
          background: #f7f8fc;
          padding: 13px;
          border-radius: 10px;
        }

        .meta-label {
          display: block;
          font-size: 11px;
          color: #8993a5;
          margin-bottom: 5px;
        }

        .meta-value {
          font-size: 14px;
          font-weight: 700;
        }

        .progress-section {
          margin: 22px 0 0 50px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 7px;
        }

        .progress-bar {
          height: 8px;
          background: #e9ebf2;
          border-radius: 10px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #6246e5;
          border-radius: 10px;
        }

        .plan-box {
          margin: 20px 0 0 50px;
          padding: 17px;
          background: #f6f7fb;
          border-radius: 11px;
        }

        .plan-title {
          font-weight: 700;
          margin-bottom: 7px;
        }

        .plan-text {
          color: #4f5d73;
          line-height: 1.5;
        }

        .next-action {
          margin: 15px 0 0 50px;
          padding: 17px;
          background: #f0f5ff;
          border: 1px solid #cfddff;
          border-radius: 11px;
        }

        .next-title {
          font-weight: 700;
          margin-bottom: 7px;
        }

        .blocker-box {
          margin: 15px 0 0 50px;
          padding: 18px;
          background: #fff4f4;
          border: 1px solid #ffd0d0;
          border-radius: 11px;
        }

        .blocker-title {
          color: #c83232;
          font-weight: 750;
          margin-bottom: 8px;
        }

        .resolution {
          margin-top: 15px;
        }

        .resolution-title {
          font-weight: 700;
          margin-bottom: 9px;
        }

        .resolution ol {
          margin: 0;
          padding-left: 22px;
        }

        .resolution li {
          margin-bottom: 7px;
          color: #4f5d73;
          line-height: 1.45;
        }

        .details-toggle {
          margin: 18px 0 0 50px;
          padding: 10px 0;
          color: #6046e5;
          font-weight: 700;
          background: transparent;
        }

        .details {
          margin: 0 0 18px 50px;
          padding: 16px;
          background: #fafbfe;
          border-top: 1px solid #e6e9f0;
        }

        .dependency-line {
          margin-bottom: 9px;
          color: #5d6a7f;
        }

        .dependency-line strong {
          color: #1b2537;
        }

        .empty {
          text-align: center;
          padding: 45px;
          color: #7b879a;
        }

        @media (max-width: 1000px) {
          .prd-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .stats {
            grid-template-columns: repeat(3, 1fr);
          }

          .meta-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 700px) {
          .roadmap-page {
            padding: 20px;
          }

          .prd-grid {
            grid-template-columns: 1fr;
          }

          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .meta-grid {
            grid-template-columns: 1fr 1fr;
            margin-left: 0;
          }

          .feature-description,
          .progress-section,
          .plan-box,
          .next-action,
          .blocker-box,
          .details-toggle,
          .details {
            margin-left: 0;
          }

          .feature-heading {
            flex-wrap: wrap;
          }
        }

      `}</style>

      <div className="roadmap-container">

        {/* HEADER */}
        <div className="page-header">
          <h1>Roadmap Planner</h1>

          <p>
            Turn generated product requirements into an executable
            development plan with priorities, dependencies, blockers,
            resolution steps and next actions.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        {/* GENERATED PRDS */}
        <div className="section">

          <div className="section-title">
            Generated PRDs
          </div>

          <div className="section-subtitle">
            Select a PRD generated by the PRD Agent.
            The roadmap will be generated automatically from the selected requirement.
          </div>

          {loadingPRDs ? (
            <div className="loading">
              Loading generated PRDs...
            </div>
          ) : prds.length === 0 ? (
            <div className="empty">
              No generated PRDs found.
              <br />
              Generate a PRD first from the PRD Generator.
            </div>
          ) : (
            <div className="prd-grid">

              {prds.map((prd) => {
                const normalized = normalizePRD(prd);

                const isSelected =
                  selectedPRD?.id === normalized.id;

                return (
                  <div
                    key={normalized.id}
                    className={`prd-card ${
                      isSelected ? "selected" : ""
                    }`}
                    onClick={() => selectPRD(prd)}
                  >

                    <div className="prd-title">
                      {normalized.title}
                    </div>

                    <div className="prd-problem">
                      {normalized.problem_statement}
                    </div>

                    <div className="prd-footer">

                      <span className="date">
                        {normalized.created_at
                          ? `Generated: ${formatDate(
                              normalized.created_at
                            )}`
                          : "Generated PRD"}
                      </span>

                      {isSelected ? (
                        <span className="selected-badge">
                          Selected
                        </span>
                      ) : (
                        <button
                          className="select-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectPRD(prd);
                          }}
                        >
                          Select PRD
                        </button>
                      )}

                    </div>
                  </div>
                );
              })}

            </div>
          )}
        </div>

        {/* SELECTED PRD */}
        {selectedPRD && (
          <div
            className="section selected-prd"
            ref={selectedRef}
          >

            <div className="section-title">
              Selected PRD
            </div>

            <div className="section-subtitle">
              Review the requirement and generate its execution roadmap.
            </div>

            <div className="selected-prd-title">
              {selectedPRD.title}
            </div>

            <div className="detail-block">
              <div className="detail-label">
                Problem Statement
              </div>

              <div className="detail-text">
                {selectedPRD.problem_statement}
              </div>
            </div>

            <div className="detail-block">
              <div className="detail-label">
                Objectives
              </div>

              <div className="detail-text">
                {selectedPRD.objectives}
              </div>
            </div>

            {selectedPRD.user_stories && (
              <div className="detail-block">
                <div className="detail-label">
                  User Stories
                </div>

                <div className="detail-text">
                  {selectedPRD.user_stories}
                </div>
              </div>
            )}

            <div className="generate-area">

              <button
                className="generate-btn"
                disabled={generating}
                onClick={() => generateRoadmap()}
              >
                {generating
                  ? "Generating Roadmap..."
                  : "✨ Generate Roadmap"}
              </button>

            </div>

          </div>
        )}

        {/* LOADING */}
        {generating && (
          <div className="section">
            <div className="loading">
              <strong>AI is creating the execution plan...</strong>
              <br />
              <br />
              Analyzing priority, dependencies, sprint allocation,
              blockers and next actions.
            </div>
          </div>
        )}

        {/* ROADMAP */}
        {roadmap && !generating && (
          <div ref={roadmapRef}>

            {/* ROADMAP TITLE */}
            <div className="roadmap-header">

              <h2>
                {roadmap.roadmap_name}
              </h2>

              <p>
                Timeline: {roadmap.timeline}
              </p>

            </div>

            {/* STATS */}
            <div className="stats">

              <div className="stat">
                <div className="stat-number">
                  {totalFeatures}
                </div>
                <div className="stat-label">
                  Total Features
                </div>
              </div>

              <div className="stat">
                <div className="stat-number">
                  {highPriority}
                </div>
                <div className="stat-label">
                  High Priority
                </div>
              </div>

              <div className="stat">
                <div className="stat-number">
                  {blocked}
                </div>
                <div className="stat-label">
                  Blocked
                </div>
              </div>

              <div className="stat">
                <div className="stat-number">
                  {inProgress}
                </div>
                <div className="stat-label">
                  In Progress
                </div>
              </div>

              <div className="stat">
                <div className="stat-number">
                  {planned}
                </div>
                <div className="stat-label">
                  Planned
                </div>
              </div>

              <div className="stat">
                <div className="stat-number">
                  {completed}
                </div>
                <div className="stat-label">
                  Completed
                </div>
              </div>

            </div>

            {/* EXECUTION PLAN */}
            <div className="execution-box">

              <div className="execution-heading">
                📋 Execution Plan
              </div>

              <div className="execution-description">
                This roadmap shows what should be done,
                when it should be done, what is blocking the work,
                how to resolve blockers, and the next action required.
              </div>

              {roadmap.features.length === 0 ? (
                <div className="empty">
                  No roadmap features were generated.
                </div>
              ) : (

                roadmap.features.map((feature, index) => {

                  const isExpanded =
                    expandedFeature === index;

                  return (
                    <div
                      className="feature-card"
                      key={index}
                    >

                      <div className="feature-top">

                        {/* TITLE */}
                        <div className="feature-heading">

                          <div className="number">
                            {index + 1}
                          </div>

                          <div className="feature-name">
                            {feature.feature_name}
                          </div>

                          <div
                            className={`status ${getStatusClass(
                              feature.status
                            )}`}
                          >
                            {feature.status}
                          </div>

                        </div>

                        {/* DESCRIPTION */}
                        <div className="feature-description">
                          {feature.description}
                        </div>

                        {/* META */}
                        <div className="meta-grid">

                          <div className="meta">
                            <span className="meta-label">
                              Priority
                            </span>

                            <span
                              className={`meta-value ${getPriorityClass(
                                feature.priority
                              )}`}
                            >
                              {feature.priority}
                            </span>
                          </div>

                          <div className="meta">
                            <span className="meta-label">
                              Sprint
                            </span>

                            <span className="meta-value">
                              {feature.release}
                            </span>
                          </div>

                          <div className="meta">
                            <span className="meta-label">
                              Milestone
                            </span>

                            <span className="meta-value">
                              {feature.milestone}
                            </span>
                          </div>

                          <div className="meta">
                            <span className="meta-label">
                              RICE
                            </span>

                            <span className="meta-value">
                              {feature.rice_score ?? "—"}
                            </span>
                          </div>

                          <div className="meta">
                            <span className="meta-label">
                              ICE
                            </span>

                            <span className="meta-value">
                              {feature.ice_score ?? "—"}
                            </span>
                          </div>

                        </div>

                        {/* PROGRESS */}
                        <div className="progress-section">

                          <div className="progress-header">

                            <span>
                              Progress
                            </span>

                            <span>
                              {feature.progress}%
                            </span>

                          </div>

                          <div className="progress-bar">

                            <div
                              className="progress-fill"
                              style={{
                                width: `${feature.progress}%`,
                              }}
                            />

                          </div>

                        </div>

                        {/* PLAN */}
                        <div className="plan-box">

                          <div className="plan-title">
                            📌 Plan
                          </div>

                          <div className="plan-text">
                            {feature.reason}
                          </div>

                        </div>

                        {/* BLOCKER */}
                        {feature.status === "Blocked" && (
                          <div className="blocker-box">

                            <div className="blocker-title">
                              🚫 Blocker
                            </div>

                            <div>
                              {feature.blocker ||
                                "This feature is blocked by an unresolved dependency."}
                            </div>

                            {feature.resolution_steps?.length > 0 && (
                              <div className="resolution">

                                <div className="resolution-title">
                                  How to resolve the blocker
                                </div>

                                <ol>

                                  {feature.resolution_steps.map(
                                    (step, stepIndex) => (
                                      <li key={stepIndex}>
                                        {step}
                                      </li>
                                    )
                                  )}

                                </ol>

                              </div>
                            )}

                          </div>
                        )}

                        {/* NEXT ACTION */}
                        <div className="next-action">

                          <div className="next-title">
                            ▶ Next Action
                          </div>

                          <div>
                            {feature.next_action}
                          </div>

                        </div>

                        {/* DETAILS BUTTON */}
                        <button
                          className="details-toggle"
                          onClick={() =>
                            toggleFeature(index)
                          }
                        >
                          {isExpanded
                            ? "▲ Hide dependency details"
                            : "▼ Show dependency details"}
                        </button>

                      </div>

                      {/* DETAILS */}
                      {isExpanded && (
                        <div className="details">

                          <div className="dependency-line">
                            <strong>
                              Dependencies:
                            </strong>{" "}
                            {feature.dependencies.length
                              ? feature.dependencies.join(", ")
                              : "No dependencies"}
                          </div>

                          <div className="dependency-line">
                            <strong>
                              Unresolved Dependencies:
                            </strong>{" "}
                            {feature.unresolved_dependencies.length
                              ? feature.unresolved_dependencies.join(", ")
                              : "None"}
                          </div>

                          <div className="dependency-line">
                            <strong>
                              Blocked By:
                            </strong>{" "}
                            {feature.blocked_by.length
                              ? feature.blocked_by.join(", ")
                              : "None"}
                          </div>

                        </div>
                      )}

                    </div>
                  );
                })

              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
}