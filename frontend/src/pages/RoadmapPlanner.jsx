// src/pages/RoadmapPlanner.jsx

import React, { useState } from "react";
import {
  Plus,
  X,
  Sparkles,
  CheckCircle2,
  Clock3,
  Circle,
  Loader2,
} from "lucide-react";

const API_BASE_URL = "http://localhost:8000";

export default function RoadmapPlanner() {
  const [showModal, setShowModal] = useState(false);
  const [productRequest, setProductRequest] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [prd, setPrd] = useState(null);
  const [roadmap, setRoadmap] = useState([]);

  // ---------------------------------------------------------
  // CREATE PRD + ROADMAP
  // ---------------------------------------------------------

  const handleGenerate = async () => {
    if (!productRequest.trim()) {
      setError("Please enter a product request.");
      return;
    }

    setLoading(true);
    setError("");
    setPrd(null);
    setRoadmap([]);

    try {
      // -----------------------------------------------------
      // STEP 1: Generate PRD
      // -----------------------------------------------------

      const prdResponse = await fetch(
        `${API_BASE_URL}/prd/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            feature_name: productRequest.trim(),
            description: productRequest.trim(),
            priority: "High",
            business_goal:
              "Improve product usability and customer satisfaction.",
            target_users: "Product users",
          }),
        }
      );

      const prdData = await prdResponse.json();

      if (!prdResponse.ok) {
        throw new Error(
          prdData.detail || "Failed to generate PRD."
        );
      }

      if (!prdData.document_id) {
        throw new Error("PRD was generated but no PRD ID was returned.");
      }

      setPrd(prdData);

      // -----------------------------------------------------
      // STEP 2: Generate Roadmap from PRD
      // -----------------------------------------------------

      const roadmapResponse = await fetch(
        `${API_BASE_URL}/roadmap/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prd_id: prdData.document_id,
          }),
        }
      );

      const roadmapData = await roadmapResponse.json();

      if (!roadmapResponse.ok) {
        throw new Error(
          roadmapData.detail || "Failed to generate roadmap."
        );
      }

      // -----------------------------------------------------
      // NORMALIZE ROADMAP RESPONSE
      // -----------------------------------------------------

      const items =
        roadmapData.items ||
        roadmapData.roadmap ||
        roadmapData.data ||
        [];

      const normalizedItems = Array.isArray(items)
        ? items.map((item, index) => ({
            id: item.id || index + 1,

            title:
              item.title ||
              item.name ||
              item.feature ||
              `Roadmap Item ${index + 1}`,

            status:
              item.status ||
              (index === 0 ? "In Progress" : "Planned"),

            progress:
              typeof item.progress === "number"
                ? item.progress
                : index === 0
                ? 65
                : 0,
          }))
        : [];

      setRoadmap(normalizedItems);

      setShowModal(false);
    } catch (err) {
      console.error("Roadmap generation error:", err);

      setError(
        err.message ||
          "Something went wrong while generating the roadmap."
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // STATUS ICON
  // ---------------------------------------------------------

  const getStatusIcon = (status) => {
    const value = status?.toLowerCase();

    if (value === "completed") {
      return <CheckCircle2 size={17} />;
    }

    if (value === "in progress") {
      return <Clock3 size={17} />;
    }

    return <Circle size={17} />;
  };

  // ---------------------------------------------------------
  // STATUS CLASS
  // ---------------------------------------------------------

  const getStatusClass = (status) => {
    const value = status?.toLowerCase();

    if (value === "completed") {
      return "status completed";
    }

    if (value === "in progress") {
      return "status progress";
    }

    return "status planned";
  };

  // ---------------------------------------------------------
  // MAIN UI
  // ---------------------------------------------------------

  return (
    <div className="roadmap-page">

      {/* ---------------------------------------------------
          HEADER
      --------------------------------------------------- */}

      <div className="roadmap-header">
        <div>
          <h1>Roadmap Planner</h1>

          <p>
            Generate a product roadmap from your product request
            and AI-generated PRD.
          </p>
        </div>

        <button
          className="create-roadmap-btn"
          onClick={() => {
            setShowModal(true);
            setError("");
          }}
        >
          <Plus size={18} />
          Create Roadmap
        </button>
      </div>

      {/* ---------------------------------------------------
          PRD STATUS
      --------------------------------------------------- */}

      {prd && (
        <div className="prd-success-card">
          <div className="prd-icon">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <h3>PRD Generated</h3>
            <p>
              Product Requirements Document generated
              successfully.
            </p>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------
          ROADMAP CARDS
      --------------------------------------------------- */}

      <div className="roadmap-section">

        <div className="section-title">
          <div>
            <h2>Product Roadmap</h2>
            <p>
              Development priorities generated from the PRD
            </p>
          </div>
        </div>

        {roadmap.length === 0 ? (
          <div className="empty-roadmap">
            <Sparkles size={35} />

            <h3>No roadmap generated yet</h3>

            <p>
              Enter a product request to generate a PRD and
              create your roadmap automatically.
            </p>

            <button
              className="empty-create-btn"
              onClick={() => setShowModal(true)}
            >
              <Plus size={17} />
              Create Roadmap
            </button>
          </div>
        ) : (
          <div className="roadmap-grid">

            {roadmap.map((item) => (
              <div
                className="roadmap-card"
                key={item.id}
              >

                {/* CARD HEADER */}

                <div className="card-header">

                  <h3>{item.title}</h3>

                  <span className={getStatusClass(item.status)}>
                    {getStatusIcon(item.status)}
                    {item.status}
                  </span>

                </div>

                {/* PROGRESS */}

                <div className="progress-section">

                  <div className="progress-label">

                    <span>Progress</span>

                    <strong>
                      {item.progress}%
                    </strong>

                  </div>

                  <div className="progress-bar">

                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(
                          Math.max(item.progress, 0),
                          100
                        )}%`,
                      }}
                    />

                  </div>

                </div>

              </div>
            ))}

          </div>
        )}
      </div>

      {/* ---------------------------------------------------
          CREATE ROADMAP MODAL
      --------------------------------------------------- */}

      {showModal && (
        <div className="modal-overlay">

          <div className="roadmap-modal">

            {/* MODAL HEADER */}

            <div className="modal-header">

              <div>
                <h2>Create Product Roadmap</h2>

                <p>
                  Start with a product request. AI will generate
                  the PRD and roadmap automatically.
                </p>
              </div>

              <button
                className="close-btn"
                onClick={() => {
                  if (!loading) {
                    setShowModal(false);
                    setError("");
                  }
                }}
              >
                <X size={21} />
              </button>

            </div>

            {/* INPUT */}

            <div className="form-group">

              <label>Product Request</label>

              <textarea
                value={productRequest}
                onChange={(e) =>
                  setProductRequest(e.target.value)
                }
                placeholder="Example: Add dark mode to the application"
                rows={5}
                disabled={loading}
              />

              <small>
                Enter the product problem or feature you want
                to build.
              </small>

            </div>

            {/* PRD STATUS */}

            {prd && (
              <div className="generated-box">

                <CheckCircle2 size={20} />

                <div>
                  <strong>PRD Generated</strong>

                  <p>
                    Product Requirements Document generated
                    successfully.
                  </p>
                </div>

              </div>
            )}

            {/* ERROR */}

            {error && (
              <div className="error-box">
                {error}
              </div>
            )}

            {/* ACTIONS */}

            <div className="modal-actions">

              <button
                className="cancel-btn"
                onClick={() => {
                  if (!loading) {
                    setShowModal(false);
                    setError("");
                  }
                }}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                className="generate-btn"
                onClick={handleGenerate}
                disabled={loading}
              >

                {loading ? (
                  <>
                    <Loader2
                      size={18}
                      className="spin"
                    />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate PRD & Roadmap
                  </>
                )}

              </button>

            </div>

          </div>

        </div>
      )}

      {/* ---------------------------------------------------
          STYLES
      --------------------------------------------------- */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        .roadmap-page {
          padding: 30px;
          min-height: 100vh;
          background: #f8f9fc;
          color: #172033;
        }

        .roadmap-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 30px;
        }

        .roadmap-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }

        .roadmap-header p {
          margin-top: 7px;
          color: #71809b;
          font-size: 14px;
        }

        .create-roadmap-btn,
        .generate-btn,
        .empty-create-btn {
          border: none;
          background: #5b3df5;
          color: white;
          border-radius: 9px;
          padding: 12px 18px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-weight: 600;
        }

        .create-roadmap-btn:hover,
        .generate-btn:hover,
        .empty-create-btn:hover {
          background: #4b2fe0;
        }

        .prd-success-card {
          background: white;
          border: 1px solid #e5e8f0;
          border-radius: 14px;
          padding: 18px;
          display: flex;
          gap: 14px;
          align-items: center;
          margin-bottom: 25px;
        }

        .prd-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #eeeaff;
          color: #5b3df5;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .prd-success-card h3 {
          margin: 0 0 4px;
          font-size: 16px;
        }

        .prd-success-card p {
          margin: 0;
          color: #71809b;
          font-size: 13px;
        }

        .roadmap-section {
          background: transparent;
        }

        .section-title {
          margin-bottom: 20px;
        }

        .section-title h2 {
          margin: 0;
          font-size: 21px;
        }

        .section-title p {
          margin-top: 5px;
          color: #71809b;
          font-size: 13px;
        }

        .roadmap-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 20px;
        }

        .roadmap-card {
          background: white;
          border: 1px solid #e5e8f0;
          border-radius: 14px;
          padding: 22px;
          min-height: 170px;
          box-shadow:
            0 3px 10px rgba(35, 40, 60, 0.04);
        }

        .card-header {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .card-header h3 {
          margin: 0;
          font-size: 17px;
        }

        .status {
          width: fit-content;
          padding: 5px 9px;
          border-radius: 20px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 600;
        }

        .status.progress {
          background: #fff4df;
          color: #d88700;
        }

        .status.planned {
          background: #edf0f5;
          color: #667085;
        }

        .status.completed {
          background: #e7f8ef;
          color: #15965c;
        }

        .progress-section {
          margin-top: 25px;
        }

        .progress-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          color: #7a8498;
          font-size: 12px;
        }

        .progress-label strong {
          color: #20283a;
        }

        .progress-bar {
          height: 7px;
          background: #eceef4;
          border-radius: 10px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #5b3df5;
          border-radius: 10px;
          transition: width 0.3s ease;
        }

        .empty-roadmap {
          background: white;
          border: 1px dashed #d9dce5;
          border-radius: 14px;
          min-height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #6e7890;
        }

        .empty-roadmap svg {
          color: #5b3df5;
        }

        .empty-roadmap h3 {
          margin: 15px 0 5px;
          color: #1b2335;
        }

        .empty-roadmap p {
          max-width: 450px;
          font-size: 13px;
          line-height: 1.6;
        }

        .empty-create-btn {
          margin-top: 10px;
        }

        /* MODAL */

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 20, 30, 0.55);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          padding: 20px;
        }

        .roadmap-modal {
          width: 100%;
          max-width: 560px;
          background: white;
          border-radius: 16px;
          padding: 25px;
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.25);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 25px;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 21px;
        }

        .modal-header p {
          margin-top: 6px;
          color: #71809b;
          font-size: 13px;
          line-height: 1.5;
        }

        .close-btn {
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
        }

        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .form-group textarea {
          width: 100%;
          resize: vertical;
          border: 1px solid #dfe3eb;
          border-radius: 10px;
          padding: 14px;
          font-family: inherit;
          font-size: 14px;
          outline: none;
          color: #1d2738;
          background: #f8f9fc;
        }

        .form-group textarea:focus {
          border-color: #5b3df5;
          background: white;
        }

        .form-group small {
          display: block;
          margin-top: 7px;
          color: #71809b;
          font-size: 12px;
        }

        .generated-box {
          display: flex;
          gap: 12px;
          margin-top: 18px;
          padding: 15px;
          border: 1px solid #ddd8ff;
          background: #f8f7ff;
          border-radius: 10px;
          color: #5b3df5;
        }

        .generated-box strong {
          color: #222b3d;
          font-size: 14px;
        }

        .generated-box p {
          margin: 4px 0 0;
          color: #71809b;
          font-size: 12px;
        }

        .error-box {
          margin-top: 15px;
          padding: 12px;
          border-radius: 9px;
          background: #fff1f1;
          border: 1px solid #ffcaca;
          color: #e53935;
          font-size: 13px;
          line-height: 1.5;
          word-break: break-word;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 25px;
        }

        .cancel-btn {
          border: 1px solid #dfe3eb;
          background: white;
          color: #344054;
          padding: 11px 18px;
          border-radius: 9px;
          cursor: pointer;
          font-weight: 600;
        }

        .cancel-btn:hover {
          background: #f5f6f8;
        }

        .generate-btn:disabled,
        .cancel-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 900px) {
          .roadmap-grid {
            grid-template-columns: 1fr;
          }

          .roadmap-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }
        }

      `}</style>
    </div>
  );
}