// src/pages/RoadmapPlanner.jsx

import React, { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Sparkles,
  CheckCircle2,
  Clock3,
  Circle,
  Loader2,
  RefreshCw,
  ArrowRight,
  Target,
  ListChecks,
  AlertCircle,
  ChevronRight,
  CalendarDays,
} from "lucide-react";

import api from "../services/api";

export function RoadmapPlanner() {
  // ============================================================
  // STATE
  // ============================================================

  const [prds, setPrds] = useState([]);
  const [selectedPRD, setSelectedPRD] = useState(null);
  const [roadmap, setRoadmap] = useState([]);

  const [loadingPRDs, setLoadingPRDs] = useState(true);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // ============================================================
  // LOAD GENERATED PRDs
  // ============================================================

  const fetchPRDs = async () => {
    try {
      setLoadingPRDs(true);
      setError("");

      const response = await api.get("/prd/");

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.items ||
          response.data?.prds ||
          response.data?.data ||
          [];

      setPrds(data);
    } catch (err) {
      console.error("PRD loading error:", err);

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to load generated PRDs."
      );
    } finally {
      setLoadingPRDs(false);
    }
  };

  useEffect(() => {
    fetchPRDs();
  }, []);

  // ============================================================
  // FILTER PRDs
  // ============================================================

  const filteredPRDs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return prds;
    }

    return prds.filter((prd) => {
      const title = String(
        prd?.title ||
          prd?.feature_name ||
          prd?.name ||
          ""
      ).toLowerCase();

      const problem = String(
        prd?.problem_statement || ""
      ).toLowerCase();

      return (
        title.includes(query) ||
        problem.includes(query)
      );
    });
  }, [prds, search]);

  // ============================================================
  // SELECT PRD
  // ============================================================

  const handleSelectPRD = (prd) => {
    setSelectedPRD(prd);
    setRoadmap([]);
    setError("");
  };

  // ============================================================
  // GET PRD ID
  // ============================================================

  const getPRDId = (prd) => {
    return (
      prd?.id ||
      prd?.document_id ||
      prd?.prd_id
    );
  };

  // ============================================================
  // GENERATE ROADMAP FROM SELECTED PRD
  // ============================================================

  const handleGenerateRoadmap = async () => {
    if (!selectedPRD) {
      setError("Please select a generated PRD first.");
      return;
    }

    const prdId = getPRDId(selectedPRD);

    if (!prdId) {
      setError(
        "The selected PRD does not have a valid PRD ID."
      );
      return;
    }

    try {
      setGeneratingRoadmap(true);
      setError("");
      setRoadmap([]);

      // Backend route:
      // POST /roadmap/generate
      // Send the selected PRD ID in the request body.

      const response = await api.post(
        "/roadmap/generate",
        {
          prd_id: prdId,
        }
      );

      const data = response.data;

      console.log(
        "Roadmap generation response:",
        data
      );

      // Backend returns:
      // {
      //   status: "success",
      //   prd_id: ...,
      //   feature_id: ...,
      //   feature: ...,
      //   roadmap: [...]
      // }

      // The backend returns saved roadmap milestones in
      // data.items. The structured AI roadmap is available
      // under data.roadmap.features.
      const items =
        data?.items ||
        data?.roadmap?.features ||
        data?.roadmap ||
        data?.data ||
        [];

      const normalizedRoadmap = Array.isArray(items)
        ? items.map((item, index) => ({
            id:
              item?.id ||
              `${prdId}-${index + 1}`,

            title:
              item?.title ||
              item?.feature_name ||
              item?.name ||
              item?.phase ||
              `Roadmap Initiative ${index + 1}`,

            phase:
              item?.phase ||
              item?.release ||
              item?.title ||
              `Sprint ${index + 1}`,

            status:
              item?.status ||
              "Planned",

            progress:
              typeof item?.progress === "number"
                ? item.progress
                : getProgressFromStatus(
                    item?.status
                  ),

            start_date:
              item?.start_date || "",

            end_date:
              item?.end_date || "",

            feature_id:
              item?.feature_id ||
              data?.feature_id ||
              null,

            priority:
              item?.priority || "",

            milestone:
              item?.milestone || "",

            reason:
              item?.reason || "",

            dependencies:
              item?.dependencies || [],
          }))
        : [];

      setRoadmap(normalizedRoadmap);

      if (normalizedRoadmap.length === 0) {
        setError(
          "Roadmap generation completed, but no milestones were returned."
        );
      }
    } catch (err) {
      console.error(
        "Roadmap generation error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Failed to generate roadmap."
      );
    } finally {
      setGeneratingRoadmap(false);
    }
  };

  // ============================================================
  // PROGRESS FROM STATUS
  // ============================================================

  function getProgressFromStatus(status) {
    const value = String(
      status || "Planned"
    ).toLowerCase();

    if (value === "completed") {
      return 100;
    }

    if (
      value === "in progress" ||
      value === "in-progress"
    ) {
      return 50;
    }

    if (value === "blocked") {
      return 25;
    }

    return 0;
  }

  // ============================================================
  // STATUS ICON
  // ============================================================

  const StatusIcon = ({ status }) => {
    const value = String(
      status || ""
    ).toLowerCase();

    if (value === "completed") {
      return (
        <CheckCircle2
          size={17}
          strokeWidth={2}
        />
      );
    }

    if (
      value === "in progress" ||
      value === "in-progress"
    ) {
      return (
        <Clock3
          size={17}
          strokeWidth={2}
        />
      );
    }

    return (
      <Circle
        size={17}
        strokeWidth={2}
      />
    );
  };

  // ============================================================
  // STATUS CLASS
  // ============================================================

  const getStatusClass = (status) => {
    const value = String(
      status || "Planned"
    ).toLowerCase();

    if (value === "completed") {
      return "status completed";
    }

    if (
      value === "in progress" ||
      value === "in-progress"
    ) {
      return "status progress";
    }

    if (value === "blocked") {
      return "status blocked";
    }

    return "status planned";
  };

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (value) => {
    if (!value) return "";

    try {
      return new Date(value).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
    } catch {
      return value;
    }
  };

  // ============================================================
  // SAFE ARRAY
  // ============================================================

  const toArray = (value) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (value === null || value === undefined) {
      return [];
    }

    if (typeof value === "string") {
      if (!value.trim()) return [];

      return value
        .split("\n")
        .map((item) =>
          item
            .replace(/^\s*[-*•]\s*/, "")
            .replace(/^\s*\d+[\.\)]\s*/, "")
            .trim()
        )
        .filter(Boolean);
    }

    return [String(value)];
  };

  // ============================================================
  // PRD CONTENT
  // ============================================================

  const getObjectives = (prd) => {
    return toArray(
      prd?.objectives ||
        prd?.objective ||
        []
    );
  };

  const getUserStories = (prd) => {
    const stories =
      prd?.user_stories ||
      prd?.userStories ||
      [];

    if (Array.isArray(stories)) {
      return stories.map((story) => {
        if (typeof story === "string") {
          return {
            story,
            acceptance_criteria: [],
          };
        }

        return {
          story:
            story?.story ||
            story?.user_story ||
            story?.userStory ||
            "",

          acceptance_criteria:
            toArray(
              story?.acceptance_criteria ||
                story?.acceptanceCriteria ||
                []
            ),
        };
      });
    }

    return [];
  };

  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <div className="roadmap-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="roadmap-header">

        <div className="header-left">

          <div className="header-icon">
            <Target size={24} />
          </div>

          <div>
            <h1>Roadmap Planner</h1>

            <p>
              Select a generated PRD and turn its
              requirements into an actionable product
              roadmap.
            </p>
          </div>

        </div>

        <button
          className="refresh-btn"
          onClick={fetchPRDs}
          disabled={loadingPRDs}
        >
          <RefreshCw
            size={17}
            className={
              loadingPRDs
                ? "spin"
                : ""
            }
          />

          Refresh PRDs
        </button>

      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="error-banner">

          <AlertCircle size={20} />

          <div>
            <strong>
              Something went wrong
            </strong>

            <p>{error}</p>
          </div>

        </div>
      )}

      {/* ======================================================
          SEARCH
      ====================================================== */}

      <div className="toolbar">

        <div className="search-box">

          <FileText size={18} />

          <input
            type="text"
            placeholder="Search generated PRDs..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

        </div>

        <div className="prd-count">
          {filteredPRDs.length} PRD
          {filteredPRDs.length !== 1
            ? "s"
            : ""}
        </div>

      </div>

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <div className="planner-layout">

        {/* ====================================================
            LEFT — GENERATED PRDs
        ==================================================== */}

        <section className="prd-panel">

          <div className="panel-header">

            <div>
              <h2>Generated PRDs</h2>

              <p>
                Select a PRD to create its roadmap.
              </p>
            </div>

            <span className="count-badge">
              {prds.length}
            </span>

          </div>

          <div className="prd-list">

            {loadingPRDs ? (
              <div className="loading-state">

                <Loader2
                  size={28}
                  className="spin"
                />

                <p>
                  Loading generated PRDs...
                </p>

              </div>
            ) : filteredPRDs.length === 0 ? (
              <div className="empty-prd">

                <div className="empty-icon">
                  <FileText size={30} />
                </div>

                <h3>
                  No PRDs available
                </h3>

                <p>
                  Generate a PRD from the PRD
                  Generator first. Your generated
                  PRDs will appear here.
                </p>

              </div>
            ) : (
              filteredPRDs.map((prd) => {

                const id = getPRDId(prd);

                const isSelected =
                  getPRDId(selectedPRD) === id;

                const title =
                  prd?.title ||
                  prd?.feature_name ||
                  prd?.name ||
                  "Untitled PRD";

                return (
                  <button
                    key={id}
                    className={`prd-card ${
                      isSelected
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      handleSelectPRD(prd)
                    }
                  >

                    <div className="prd-card-top">

                      <div className="prd-card-icon">
                        <FileText
                          size={20}
                        />
                      </div>

                      <div className="prd-card-title">

                        <h3>
                          {title}
                        </h3>

                        <span>
                          PRD #{id}
                        </span>

                      </div>

                      <ChevronRight
                        size={19}
                        className="prd-arrow"
                      />

                    </div>

                    <p className="prd-preview">
                      {prd?.problem_statement ||
                        "Product Requirements Document generated by AI."}
                    </p>

                    <div className="prd-card-footer">

                      <span>
                        <Sparkles
                          size={13}
                        />

                        AI Generated
                      </span>

                      {prd?.created_at && (
                        <span>
                          {formatDate(
                            prd.created_at
                          )}
                        </span>
                      )}

                    </div>

                  </button>
                );
              })
            )}

          </div>

        </section>

        {/* ====================================================
            RIGHT — PRD DETAILS + ROADMAP
        ==================================================== */}

        <section className="content-panel">

          {!selectedPRD ? (

            /* ==================================================
               NO PRD SELECTED
            ================================================== */

            <div className="select-prd-state">

              <div className="select-icon">
                <Target size={42} />
              </div>

              <h2>
                Select a generated PRD
              </h2>

              <p>
                Choose a PRD from the left to review
                its requirements and generate a
                roadmap specifically for that PRD.
              </p>

              <div className="steps">

                <div className="step">
                  <span>1</span>
                  Select PRD
                </div>

                <ArrowRight
                  size={18}
                />

                <div className="step">
                  <span>2</span>
                  Generate
                </div>

                <ArrowRight
                  size={18}
                />

                <div className="step">
                  <span>3</span>
                  View Roadmap
                </div>

              </div>

            </div>

          ) : (

            /* ==================================================
               SELECTED PRD
            ================================================== */

            <div className="selected-content">

              {/* ----------------------------------------------
                  PRD HEADER
              ---------------------------------------------- */}

              <div className="selected-prd-header">

                <div>

                  <div className="selected-label">
                    <FileText
                      size={16}
                    />

                    Selected PRD
                  </div>

                  <h2>
                    {selectedPRD?.title ||
                      selectedPRD?.feature_name ||
                      "Untitled PRD"}
                  </h2>

                  <p>
                    {selectedPRD?.problem_statement ||
                      "Review the generated requirements before creating the roadmap."}
                  </p>

                </div>

                <button
                  className="generate-roadmap-btn"
                  onClick={
                    handleGenerateRoadmap
                  }
                  disabled={
                    generatingRoadmap
                  }
                >

                  {generatingRoadmap ? (
                    <>
                      <Loader2
                        size={18}
                        className="spin"
                      />

                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles
                        size={18}
                      />

                      Generate Roadmap
                    </>
                  )}

                </button>

              </div>

              {/* ----------------------------------------------
                  PRD SUMMARY
              ---------------------------------------------- */}

              <div className="prd-summary-grid">

                <div className="summary-card">

                  <div className="summary-icon">
                    <Target size={18} />
                  </div>

                  <div>
                    <span>
                      Priority
                    </span>

                    <strong>
                      {selectedPRD?.priority ||
                        selectedPRD?.impact_level ||
                        "Medium"}
                    </strong>
                  </div>

                </div>

                <div className="summary-card">

                  <div className="summary-icon">
                    <ListChecks
                      size={18}
                    />
                  </div>

                  <div>
                    <span>
                      Objectives
                    </span>

                    <strong>
                      {getObjectives(
                        selectedPRD
                      ).length}
                    </strong>
                  </div>

                </div>

                <div className="summary-card">

                  <div className="summary-icon">
                    <FileText size={18} />
                  </div>

                  <div>
                    <span>
                      User Stories
                    </span>

                    <strong>
                      {
                        getUserStories(
                          selectedPRD
                        ).length
                      }
                    </strong>
                  </div>

                </div>

              </div>

              {/* ----------------------------------------------
                  PRD DETAILS
              ---------------------------------------------- */}

              <div className="prd-details">

                <div className="detail-section">

                  <div className="detail-heading">
                    <Target size={17} />

                    <h3>
                      Objectives
                    </h3>
                  </div>

                  {getObjectives(
                    selectedPRD
                  ).length > 0 ? (

                    <ul>
                      {getObjectives(
                        selectedPRD
                      ).map(
                        (objective, index) => (
                          <li
                            key={index}
                          >
                            {objective}
                          </li>
                        )
                      )}
                    </ul>

                  ) : (
                    <p className="muted">
                      No objectives available.
                    </p>
                  )}

                </div>

                <div className="detail-section">

                  <div className="detail-heading">
                    <ListChecks
                      size={17}
                    />

                    <h3>
                      User Stories
                    </h3>
                  </div>

                  {getUserStories(
                    selectedPRD
                  ).length > 0 ? (

                    <div className="stories-list">

                      {getUserStories(
                        selectedPRD
                      )
                        .slice(0, 4)
                        .map(
                          (
                            story,
                            index
                          ) => (
                            <div
                              className="story-item"
                              key={index}
                            >

                              <span className="story-number">
                                {index + 1}
                              </span>

                              <div>
                                <p>
                                  {
                                    story.story
                                  }
                                </p>

                                {story
                                  .acceptance_criteria
                                  ?.length >
                                  0 && (
                                  <span className="criteria-count">
                                    {
                                      story
                                        .acceptance_criteria
                                        .length
                                    }{" "}
                                    acceptance
                                    criteria
                                  </span>
                                )}
                              </div>

                            </div>
                          )
                        )}

                    </div>

                  ) : (
                    <p className="muted">
                      User stories are stored
                      as generated PRD content.
                    </p>
                  )}

                </div>

              </div>

              {/* ----------------------------------------------
                  ROADMAP
              ---------------------------------------------- */}

              <div className="roadmap-output">

                <div className="roadmap-output-header">

                  <div>

                    <div className="roadmap-title-row">

                      <div className="roadmap-title-icon">
                        <Target
                          size={19}
                        />
                      </div>

                      <h2>
                        Product Roadmap
                      </h2>

                    </div>

                    <p>
                      Implementation milestones
                      generated from this PRD.
                    </p>

                  </div>

                  {roadmap.length > 0 && (
                    <span className="milestone-count">
                      {roadmap.length} milestone
                      {roadmap.length !== 1
                        ? "s"
                        : ""}
                    </span>
                  )}

                </div>

                {roadmap.length === 0 ? (

                  <div className="roadmap-empty">

                    <div className="roadmap-empty-icon">
                      <Sparkles size={28} />
                    </div>

                    <h3>
                      Roadmap not generated yet
                    </h3>

                    <p>
                      Click{" "}
                      <strong>
                        Generate Roadmap
                      </strong>{" "}
                      to create implementation
                      milestones from this PRD.
                    </p>

                  </div>

                ) : (

                  <div className="timeline">

                    {roadmap.map(
                      (item, index) => (

                        <div
                          className="timeline-item"
                          key={item.id}
                        >

                          {/* timeline line */}

                          {index <
                            roadmap.length -
                              1 && (
                            <div className="timeline-line" />
                          )}

                          {/* timeline dot */}

                          <div
                            className={`timeline-dot ${
                              item.status
                                ?.toLowerCase()
                                .replace(
                                  " ",
                                  "-"
                                )
                            }`}
                          >
                            <StatusIcon
                              status={
                                item.status
                              }
                            />
                          </div>

                          {/* milestone card */}

                          <div className="milestone-card">

                            <div className="milestone-top">

                              <div>

                                <span className="milestone-number">
                                  MILESTONE{" "}
                                  {index + 1}
                                </span>

                                <h3>
                                  {
                                    item.title
                                  }
                                </h3>

                              </div>

                              <span
                                className={getStatusClass(
                                  item.status
                                )}
                              >
                                <StatusIcon
                                  status={
                                    item.status
                                  }
                                />

                                {item.status}
                              </span>

                            </div>

                            <div className="milestone-meta">

                              <div className="progress-wrapper">

                                <div className="progress-label">

                                  <span>
                                    Progress
                                  </span>

                                  <strong>
                                    {
                                      item.progress
                                    }
                                    %
                                  </strong>

                                </div>

                                <div className="progress-track">

                                  <div
                                    className="progress-fill"
                                    style={{
                                      width: `${Math.min(
                                        Math.max(
                                          item.progress ||
                                            0,
                                          0
                                        ),
                                        100
                                      )}%`,
                                    }}
                                  />

                                </div>

                              </div>

                              {(item.start_date ||
                                item.end_date) && (
                                <div className="date-range">

                                  <CalendarDays
                                    size={15}
                                  />

                                  <span>
                                    {formatDate(
                                      item.start_date
                                    )}

                                    {item.end_date &&
                                      " → "}

                                    {formatDate(
                                      item.end_date
                                    )}
                                  </span>

                                </div>
                              )}

                            </div>

                          </div>

                        </div>
                      )
                    )}

                  </div>
                )}

              </div>

            </div>
          )}

        </section>

      </div>

      {/* ======================================================
          STYLES
      ====================================================== */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        .roadmap-page {
          min-height: calc(100vh - 70px);
          padding: 30px 34px 50px;
          background: #f7f8fc;
          color: #172033;
        }

        /* =====================================================
           HEADER
        ===================================================== */

        .roadmap-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
          margin-bottom: 24px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .header-icon {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          background: #eeeaff;
          color: #5b3df5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .roadmap-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 750;
          letter-spacing: -0.5px;
        }

        .roadmap-header p {
          margin: 5px 0 0;
          color: #71809b;
          font-size: 14px;
        }

        .refresh-btn {
          height: 42px;
          padding: 0 16px;
          border: 1px solid #dfe3ec;
          background: white;
          border-radius: 9px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #344054;
          font-weight: 600;
          cursor: pointer;
        }

        .refresh-btn:hover {
          border-color: #cfc8ff;
          color: #5b3df5;
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* =====================================================
           ERROR
        ===================================================== */

        .error-banner {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 15px 17px;
          margin-bottom: 20px;
          border: 1px solid #ffcaca;
          background: #fff2f2;
          color: #d92d20;
          border-radius: 11px;
        }

        .error-banner strong {
          display: block;
          font-size: 14px;
        }

        .error-banner p {
          margin: 3px 0 0;
          font-size: 13px;
          line-height: 1.5;
          word-break: break-word;
        }

        /* =====================================================
           TOOLBAR
        ===================================================== */

        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .search-box {
          width: 390px;
          height: 44px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          background: white;
          border: 1px solid #dfe3ec;
          border-radius: 10px;
          color: #7a8498;
        }

        .search-box:focus-within {
          border-color: #7258ff;
          box-shadow: 0 0 0 3px rgba(91, 61, 245, 0.08);
        }

        .search-box input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          font-size: 14px;
          color: #1d2738;
        }

        .search-box input::placeholder {
          color: #98a2b3;
        }

        .prd-count {
          font-size: 13px;
          color: #667085;
        }

        /* =====================================================
           MAIN LAYOUT
        ===================================================== */

        .planner-layout {
          display: grid;
          grid-template-columns: 380px minmax(0, 1fr);
          gap: 22px;
          align-items: start;
        }

        .prd-panel,
        .content-panel {
          background: white;
          border: 1px solid #e2e5ec;
          border-radius: 15px;
          overflow: hidden;
        }

        .prd-panel {
          min-height: 620px;
        }

        /* =====================================================
           LEFT PANEL
        ===================================================== */

        .panel-header {
          padding: 20px 20px 17px;
          border-bottom: 1px solid #edf0f4;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .panel-header h2 {
          margin: 0;
          font-size: 17px;
          font-weight: 700;
        }

        .panel-header p {
          margin: 5px 0 0;
          color: #7b879c;
          font-size: 12px;
        }

        .count-badge {
          min-width: 28px;
          height: 28px;
          padding: 0 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #eeeaff;
          color: #5b3df5;
          font-weight: 700;
          font-size: 12px;
        }

        .prd-list {
          padding: 12px;
          max-height: 690px;
          overflow-y: auto;
        }

        .prd-card {
          width: 100%;
          text-align: left;
          padding: 16px;
          margin-bottom: 10px;
          border: 1px solid #e5e8ef;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .prd-card:last-child {
          margin-bottom: 0;
        }

        .prd-card:hover {
          border-color: #bcb2ff;
          box-shadow: 0 5px 18px rgba(46, 37, 100, 0.06);
          transform: translateY(-1px);
        }

        .prd-card.selected {
          border-color: #6b50f5;
          background: #f8f7ff;
          box-shadow:
            0 0 0 2px rgba(91, 61, 245, 0.10);
        }

        .prd-card-top {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .prd-card-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #eeeaff;
          color: #5b3df5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .prd-card-title {
          min-width: 0;
          flex: 1;
        }

        .prd-card-title h3 {
          margin: 0;
          color: #172033;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.35;
        }

        .prd-card-title span {
          display: block;
          margin-top: 3px;
          color: #98a2b3;
          font-size: 10px;
        }

        .prd-arrow {
          color: #a0a8b8;
          flex-shrink: 0;
        }

        .prd-preview {
          margin: 13px 0;
          color: #71809b;
          font-size: 12px;
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .prd-card-footer {
          padding-top: 10px;
          border-top: 1px solid #edf0f4;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #98a2b3;
          font-size: 10px;
        }

        .prd-card-footer span:first-child {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #6b50f5;
          font-weight: 600;
        }

        /* =====================================================
           LOADING / EMPTY
        ===================================================== */

        .loading-state,
        .empty-prd {
          min-height: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 30px;
          color: #71809b;
        }

        .loading-state svg {
          color: #5b3df5;
        }

        .loading-state p {
          margin-top: 12px;
          font-size: 13px;
        }

        .empty-icon {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0edff;
          color: #5b3df5;
        }

        .empty-prd h3 {
          margin: 16px 0 5px;
          color: #172033;
          font-size: 16px;
        }

        .empty-prd p {
          max-width: 260px;
          margin: 0;
          font-size: 12px;
          line-height: 1.6;
        }

        /* =====================================================
           RIGHT EMPTY STATE
        ===================================================== */

        .content-panel {
          min-height: 620px;
        }

        .select-prd-state {
          min-height: 620px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 50px;
        }

        .select-icon {
          width: 78px;
          height: 78px;
          border-radius: 20px;
          background: #eeeaff;
          color: #5b3df5;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .select-prd-state h2 {
          margin: 0;
          font-size: 22px;
          color: #172033;
        }

        .select-prd-state > p {
          max-width: 500px;
          margin: 9px 0 25px;
          color: #71809b;
          font-size: 13px;
          line-height: 1.65;
        }

        .steps {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #7b879c;
          font-size: 12px;
          font-weight: 600;
        }

        .step {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .step span {
          width: 25px;
          height: 25px;
          border-radius: 50%;
          background: #f0edff;
          color: #5b3df5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
        }

        /* =====================================================
           SELECTED CONTENT
        ===================================================== */

        .selected-content {
          padding: 25px;
        }

        .selected-prd-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding-bottom: 22px;
          border-bottom: 1px solid #edf0f4;
        }

        .selected-label {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #5b3df5;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 7px;
        }

        .selected-prd-header h2 {
          margin: 0;
          font-size: 22px;
          line-height: 1.3;
        }

        .selected-prd-header p {
          max-width: 700px;
          margin: 7px 0 0;
          color: #71809b;
          font-size: 13px;
          line-height: 1.6;
        }

        .generate-roadmap-btn {
          height: 44px;
          padding: 0 18px;
          flex-shrink: 0;
          border: none;
          border-radius: 9px;
          background: #5b3df5;
          color: white;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 5px 12px rgba(91, 61, 245, 0.18);
        }

        .generate-roadmap-btn:hover {
          background: #4c31dc;
        }

        .generate-roadmap-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        /* =====================================================
           SUMMARY
        ===================================================== */

        .prd-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin: 20px 0;
        }

        .summary-card {
          border: 1px solid #e8eaf0;
          border-radius: 11px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fbfbfd;
        }

        .summary-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: #eeeaff;
          color: #5b3df5;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .summary-card span {
          display: block;
          color: #8791a5;
          font-size: 10px;
          margin-bottom: 3px;
        }

        .summary-card strong {
          display: block;
          color: #20283a;
          font-size: 14px;
        }

        /* =====================================================
           PRD DETAILS
        ===================================================== */

        .prd-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px;
          margin-bottom: 25px;
        }

        .detail-section {
          border: 1px solid #e8eaf0;
          border-radius: 12px;
          padding: 18px;
        }

        .detail-heading {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #5b3df5;
          margin-bottom: 13px;
        }

        .detail-heading h3 {
          margin: 0;
          color: #20283a;
          font-size: 14px;
        }

        .detail-section ul {
          margin: 0;
          padding-left: 19px;
        }

        .detail-section li {
          margin-bottom: 8px;
          color: #657187;
          font-size: 12px;
          line-height: 1.5;
        }

        .muted {
          margin: 0;
          color: #98a2b3;
          font-size: 12px;
        }

        .stories-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .story-item {
          display: flex;
          gap: 9px;
          padding: 10px;
          border-radius: 8px;
          background: #f8f9fc;
        }

        .story-number {
          width: 23px;
          height: 23px;
          border-radius: 50%;
          background: #eeeaff;
          color: #5b3df5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .story-item p {
          margin: 0;
          color: #4f5b70;
          font-size: 11px;
          line-height: 1.5;
        }

        .criteria-count {
          display: inline-block;
          margin-top: 4px;
          color: #8c95a7;
          font-size: 9px;
        }

        /* =====================================================
           ROADMAP OUTPUT
        ===================================================== */

        .roadmap-output {
          border-top: 1px solid #edf0f4;
          padding-top: 23px;
        }

        .roadmap-output-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 18px;
        }

        .roadmap-title-row {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .roadmap-title-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: #eeeaff;
          color: #5b3df5;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .roadmap-title-row h2 {
          margin: 0;
          font-size: 18px;
        }

        .roadmap-output-header p {
          margin: 4px 0 0 43px;
          color: #7b879c;
          font-size: 11px;
        }

        .milestone-count {
          padding: 6px 10px;
          border-radius: 20px;
          background: #f0edff;
          color: #5b3df5;
          font-size: 10px;
          font-weight: 700;
        }

        .roadmap-empty {
          min-height: 230px;
          border: 1px dashed #d9dce5;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 30px;
        }

        .roadmap-empty-icon {
          width: 55px;
          height: 55px;
          border-radius: 15px;
          background: #eeeaff;
          color: #5b3df5;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .roadmap-empty h3 {
          margin: 13px 0 5px;
          font-size: 15px;
        }

        .roadmap-empty p {
          max-width: 450px;
          margin: 0;
          color: #7b879c;
          font-size: 11px;
          line-height: 1.6;
        }

        /* =====================================================
           TIMELINE
        ===================================================== */

        .timeline {
          position: relative;
          padding: 4px 0 5px;
        }

        .timeline-item {
          position: relative;
          display: flex;
          gap: 15px;
          padding-bottom: 18px;
        }

        .timeline-item:last-child {
          padding-bottom: 0;
        }

        .timeline-line {
          position: absolute;
          left: 17px;
          top: 34px;
          bottom: -1px;
          width: 2px;
          background: #e5e1ff;
        }

        .timeline-dot {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          flex-shrink: 0;
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0edff;
          color: #5b3df5;
          border: 4px solid white;
        }

        .timeline-dot.completed {
          background: #e7f8ef;
          color: #15965c;
        }

        .timeline-dot.in-progress {
          background: #fff4df;
          color: #d88700;
        }

        .milestone-card {
          flex: 1;
          border: 1px solid #e5e8ef;
          border-radius: 12px;
          padding: 17px;
          background: white;
        }

        .milestone-card:hover {
          border-color: #d0caff;
        }

        .milestone-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
        }

        .milestone-number {
          display: block;
          color: #8b82d9;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.8px;
          margin-bottom: 4px;
        }

        .milestone-top h3 {
          margin: 0;
          font-size: 15px;
          line-height: 1.35;
        }

        .status {
          width: fit-content;
          padding: 5px 9px;
          border-radius: 20px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .status.planned {
          background: #f0f2f5;
          color: #667085;
        }

        .status.progress {
          background: #fff4df;
          color: #d88700;
        }

        .status.completed {
          background: #e7f8ef;
          color: #15965c;
        }

        .status.blocked {
          background: #fff0f0;
          color: #d92d20;
        }

        .milestone-meta {
          display: flex;
          align-items: flex-end;
          gap: 20px;
          margin-top: 17px;
        }

        .progress-wrapper {
          flex: 1;
        }

        .progress-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
          color: #8791a5;
          font-size: 10px;
        }

        .progress-label strong {
          color: #344054;
        }

        .progress-track {
          height: 6px;
          background: #eceef4;
          border-radius: 10px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #5b3df5;
          border-radius: 10px;
          transition: width 0.35s ease;
        }

        .date-range {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #7b879c;
          font-size: 10px;
          white-space: nowrap;
        }

        /* =====================================================
           ANIMATION
        ===================================================== */

        .spin {
          animation: roadmapSpin 1s linear infinite;
        }

        @keyframes roadmapSpin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 1100px) {

          .planner-layout {
            grid-template-columns: 320px minmax(0, 1fr);
          }

          .prd-details {
            grid-template-columns: 1fr;
          }

        }

        @media (max-width: 850px) {

          .roadmap-page {
            padding: 22px 18px 40px;
          }

          .planner-layout {
            grid-template-columns: 1fr;
          }

          .prd-panel {
            min-height: auto;
          }

          .prd-list {
            max-height: 420px;
          }

          .selected-prd-header {
            flex-direction: column;
          }

          .generate-roadmap-btn {
            width: 100%;
            justify-content: center;
          }

          .prd-summary-grid {
            grid-template-columns: 1fr;
          }

        }

        @media (max-width: 600px) {

          .roadmap-header {
            align-items: flex-start;
          }

          .roadmap-header h1 {
            font-size: 23px;
          }

          .refresh-btn {
            padding: 0 11px;
          }

          .refresh-btn {
            font-size: 0;
          }

          .refresh-btn svg {
            margin: 0;
          }

          .toolbar {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }

          .search-box {
            width: 100%;
          }

          .selected-content {
            padding: 17px;
          }

          .selected-prd-header h2 {
            font-size: 19px;
          }

          .milestone-top {
            flex-direction: column;
          }

          .milestone-meta {
            flex-direction: column;
            align-items: stretch;
          }

          .date-range {
            justify-content: flex-start;
          }

        }

      `}</style>
    </div>
  );
}

export default RoadmapPlanner;