// src/pages/RoadmapPlanner.jsx

import React, { useEffect, useState, useCallback } from "react";
import {
  Calendar,
  Plus,
  Sparkles,
  Trash2,
  FileText,
  CheckCircle,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";

import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";

import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";


const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const STATUS_OPTIONS = [
  "Planned",
  "In Progress",
  "Completed",
  "Backlog",
];

const PROGRESS_MAP = {
  Completed: 100,
  "In Progress": 65,
  Planned: 0,
  Backlog: 0,
};


/* ============================================================
   PRODUCT REQUEST + PRD + ROADMAP MODAL
============================================================ */

function ProductPlanningModal({
  isOpen,
  onClose,
  onSuccess,
}) {
  const { user } = useAuth();

  const [request, setRequest] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState("");
  const [prd, setPrd] = useState(null);

  const reset = () => {
    setRequest("");
    setLoading(false);
    setStep("");
    setError("");
    setPrd(null);
  };

  const handleClose = () => {
    if (loading) return;

    reset();
    onClose();
  };

  const handleGenerate = async () => {
    if (!request.trim()) {
      setError("Please enter a product request.");
      return;
    }

    setLoading(true);
    setError("");
    setPrd(null);

    try {
      /* -------------------------------------------------------
         STEP 1: Create Feature Request
      ------------------------------------------------------- */

      setStep("Creating feature request...");

      const featureResponse = await api.post("/feature-requests/", {
  title:
    request.trim().length > 150
      ? request.trim().slice(0, 147) + "..."
      : request.trim(),

  description: request.trim(),

  votes: 0,

  user_id: user?.user_id || null,
});

const feature = featureResponse.data;

      if (!feature || !feature.id) {
        throw new Error(
          "Feature request was created, but no feature ID was returned."
        );
      }


      /* -------------------------------------------------------
         STEP 2: Generate PRD
      ------------------------------------------------------- */

      setStep("Generating PRD...");

      const prdResponse = await api.post(
  "/prd/generate",
  {
    feature_name: feature.title,
    description: feature.description || request.trim(),
    priority: "High",
    business_goal: request.trim(),
    target_users: "Existing product users",
  }
);

      const generatedPrd = prdResponse.data;

      setPrd(generatedPrd);


      /* -------------------------------------------------------
         STEP 3: Create Roadmap
      ------------------------------------------------------- */

      setStep("Creating roadmap...");

      /*
       * The existing roadmap_items table is linked to
       * feature_requests using feature_id.
       *
       * Therefore the generated roadmap items use the
       * same feature created from the user's request.
       */

      const roadmapItems = [
        {
          phase: "Q1",
          status: "Planned",
        },
        {
          phase: "Q2",
          status: "Planned",
        },
        {
          phase: "Q3",
          status: "Planned",
        },
        {
          phase: "Q4",
          status: "Planned",
        },
      ];

      for (const item of roadmapItems) {
        await api.post("/roadmap/", {
          feature_id: feature.id,
          phase: item.phase,
          status: item.status,
          user_id: user?.user_id || null,
        });
      }


      /* -------------------------------------------------------
         COMPLETE
      ------------------------------------------------------- */

      setStep("Roadmap created successfully.");

      await onSuccess();

      setTimeout(() => {
        reset();
        onClose();
      }, 700);

    } catch (err) {
      console.error(
        "Product planning error:",
        err
      );

      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Something went wrong while creating the roadmap.";

      setError(message);
      setStep("");
    } finally {
      setLoading(false);
    }
  };


  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Product Roadmap"
    >
      <div className="space-y-5">

        {/* Product Request */}

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Product Request
          </label>

          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            disabled={loading}
            rows={5}
            placeholder="Example: Users need a faster way to export reports as PDF."
            className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm text-text-primary resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />

          <p className="text-xs text-text-secondary mt-1.5">
            Enter the product problem or feature you want to plan.
          </p>
        </div>


        {/* Progress */}

        {step && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">

            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}

            <span>{step}</span>

          </div>
        )}


        {/* Generated PRD */}

        {prd && (
          <div className="rounded-lg border border-border bg-surface-hover/50 p-4">

            <div className="flex items-center gap-2 mb-2">

              <FileText className="h-4 w-4 text-primary" />

              <span className="text-sm font-semibold text-text-primary">
                PRD Generated
              </span>

            </div>

            <p className="text-sm text-text-secondary">
              {prd.title ||
                prd.name ||
                "Product Requirements Document generated successfully."}
            </p>

          </div>
        )}


        {/* Error */}

        {error && (
          <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
            {error}
          </div>
        )}


        {/* Buttons */}

        <div className="flex justify-end gap-3 pt-2">

          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            onClick={handleGenerate}
            disabled={
              loading ||
              !request.trim()
            }
          >
            {loading ? (
              "Processing..."
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate PRD & Roadmap
              </>
            )}
          </Button>

        </div>

      </div>
    </Modal>
  );
}


/* ============================================================
   ADD MILESTONE MODAL
============================================================ */

function AddMilestoneModal({
  isOpen,
  onClose,
  onSuccess,
}) {
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState("Q1");
  const [status, setStatus] = useState("Planned");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setTitle("");
    setPhase("Q1");
    setStatus("Planned");
    setError("");
  };

  const handleCreate = async () => {

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setBusy(true);
    setError("");

    try {

      /*
       * Existing backend supports creating a feature request
       * automatically when only title is provided.
       */

      await api.post("/roadmap/", {
        title: title.trim(),
        phase: phase,
        status: status,
        user_id: user?.user_id || null,
      });

      await onSuccess();

      reset();
      onClose();

    } catch (err) {

      console.error(
        "Milestone creation error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
        "Failed to create milestone."
      );

    } finally {
      setBusy(false);
    }
  };


  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!busy) {
          reset();
          onClose();
        }
      }}
      title="Add Milestone"
    >

      <div className="space-y-4">

        {/* Title */}

        <div>

          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Title
            <span className="text-danger ml-1">
              *
            </span>
          </label>

          <Input
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            disabled={busy}
            placeholder="e.g., Authentication & Security"
          />

        </div>


        {/* Quarter */}

        <div>

          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Quarter
          </label>

          <select
            value={phase}
            onChange={(e) =>
              setPhase(e.target.value)
            }
            disabled={busy}
            className="w-full h-10 px-3 border border-border rounded-lg bg-background text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >

            {QUARTERS.map((quarter) => (
              <option
                key={quarter}
                value={quarter}
              >
                {quarter}
              </option>
            ))}

          </select>

        </div>


        {/* Status */}

        <div>

          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Status
          </label>

          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value)
            }
            disabled={busy}
            className="w-full h-10 px-3 border border-border rounded-lg bg-background text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >

            {STATUS_OPTIONS.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}

          </select>

        </div>


        {/* Error */}

        {error && (
          <p className="text-sm text-danger">
            {error}
          </p>
        )}


        {/* Buttons */}

        <div className="flex gap-3 justify-end pt-2">

          <Button
            variant="outline"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={busy}
          >
            Cancel
          </Button>

          <Button
            onClick={handleCreate}
            disabled={
              busy ||
              !title.trim()
            }
          >
            {busy
              ? "Creating..."
              : "Add Milestone"}
          </Button>

        </div>

      </div>

    </Modal>
  );
}


/* ============================================================
   ROADMAP CARD
============================================================ */

function RoadmapCard({
  item,
  onStatusChange,
  onDelete,
}) {

  const status =
    item.status || "Planned";

  const progress =
    PROGRESS_MAP[status] || 0;


  return (
    <div className="flex flex-col p-4 bg-background border border-border rounded-lg shadow-sm hover:border-primary/50 transition-colors group relative">

      {/* Delete */}

      <button
        onClick={() =>
          onDelete(item.id)
        }
        title="Delete milestone"
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-text-muted hover:text-danger"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>


      {/* Title */}

      <h4 className="font-medium text-sm text-text-primary leading-snug pr-6 mb-3">

        {item.title ||
          "Roadmap Initiative"}

      </h4>


      {/* Status */}

      <div className="flex items-center justify-between mb-3">

        <select
          value={status}
          onChange={(e) =>
            onStatusChange(
              item.id,
              e.target.value
            )
          }
          className="text-xs border border-border rounded-md px-1.5 py-1 bg-background text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >

          {STATUS_OPTIONS.map((itemStatus) => (
            <option
              key={itemStatus}
              value={itemStatus}
            >
              {itemStatus}
            </option>
          ))}

        </select>


        <span className="text-[10px] text-text-muted">
          Feature #{item.feature_id || "-"}
        </span>

      </div>


      {/* Progress */}

      <div className="flex items-center gap-2">

        <div className="h-1.5 flex-1 bg-surface-hover rounded-full overflow-hidden">

          <div
            className={
              "h-full rounded-full transition-all duration-300 " +
              (
                progress === 100
                  ? "bg-success"
                  : "bg-primary"
              )
            }
            style={{
              width: `${progress}%`,
            }}
          />

        </div>

        <span className="text-[10px] text-text-secondary w-7 text-right">
          {progress}%
        </span>

      </div>

    </div>
  );
}


/* ============================================================
   MAIN ROADMAP PLANNER
============================================================ */

export function RoadmapPlanner() {

  const [roadmap, setRoadmap] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [showPlanningModal, setShowPlanningModal] =
    useState(false);

  const [showMilestoneModal, setShowMilestoneModal] =
    useState(false);

  const [message, setMessage] =
    useState("");


  /* ==========================================================
     FETCH ROADMAP
  ========================================================== */

  const fetchRoadmap = useCallback(
    async () => {

      try {

        const response =
          await api.get("/roadmap/");

        const data =
          Array.isArray(response.data)
            ? response.data
            : [];

        const counters = {};

        const formatted =
          data.map((item) => {

            const quarter =
              item.quarter ||
              item.phase ||
              "Q1";

            counters[quarter] =
              (counters[quarter] || 0) + 1;

            return {
              ...item,
              quarter: quarter,
              order: counters[quarter],
            };
          });

        setRoadmap(formatted);

      } catch (err) {

        console.error(
          "Failed to load roadmap:",
          err
        );

      }

    },
    []
  );


  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {

    const load = async () => {

      setLoading(true);

      await fetchRoadmap();

      setLoading(false);

    };

    load();

  }, [fetchRoadmap]);


  /* ==========================================================
     STATUS UPDATE
  ========================================================== */

  const handleStatusChange =
    async (id, status) => {

      try {

        await api.put(
          `/roadmap/${id}/status?status=${encodeURIComponent(status)}`
        );

        setRoadmap((previous) =>
          previous.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: status,
                  progress:
                    PROGRESS_MAP[status] || 0,
                }
              : item
          )
        );

      } catch (err) {

        console.error(
          "Failed to update status:",
          err
        );

        alert(
          err?.response?.data?.detail ||
          "Failed to update status."
        );

      }

    };


  /* ==========================================================
     DELETE
  ========================================================== */

  const handleDelete =
    async (id) => {

      if (
        !window.confirm(
          "Delete this roadmap item?"
        )
      ) {
        return;
      }

      try {

        await api.delete(
          `/roadmap/${id}`
        );

        setRoadmap((previous) =>
          previous.filter(
            (item) => item.id !== id
          )
        );

      } catch (err) {

        console.error(
          "Failed to delete roadmap item:",
          err
        );

        alert(
          err?.response?.data?.detail ||
          "Failed to delete roadmap item."
        );

      }

    };


  /* ==========================================================
     SUCCESS
  ========================================================== */

  const handlePlanningSuccess =
    async () => {

      await fetchRoadmap();

      setMessage(
        "PRD generated and roadmap created successfully."
      );

      setTimeout(
        () => setMessage(""),
        4000
      );

    };


  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {

    return (
      <div className="flex items-center justify-center h-64">

        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />

      </div>
    );
  }


  /* ==========================================================
     PAGE
  ========================================================== */

  return (

    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>

          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Roadmap Planner
          </h1>

          <p className="mt-1 text-sm text-text-secondary">
            Create a product request, generate its PRD, and plan the roadmap.
          </p>

        </div>


        <div className="flex gap-3">

          <Button
            variant="outline"
            onClick={() =>
              setShowPlanningModal(true)
            }
            className="text-primary border-primary/20 bg-primary/5 hover:bg-primary/10"
          >

            <Sparkles className="mr-2 h-4 w-4" />

            Plan Product

          </Button>


          <Button
            onClick={() =>
              setShowMilestoneModal(true)
            }
          >

            <Plus className="mr-2 h-4 w-4" />

            Add Milestone

          </Button>

        </div>

      </div>


      {/* SUCCESS MESSAGE */}

      {message && (

        <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 p-3 text-sm text-success">

          <CheckCircle className="h-4 w-4" />

          {message}

        </div>

      )}


      {/* WORKFLOW */}

      <Card>

        <CardContent className="p-4">

          <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">

            <Badge variant="outline">
              Product Request
            </Badge>

            <span>→</span>

            <Badge variant="outline">
              PRD
            </Badge>

            <span>→</span>

            <Badge variant="outline">
              Roadmap
            </Badge>

            <span>→</span>

            <Badge variant="outline">
              Q1 - Q4
            </Badge>

          </div>

        </CardContent>

      </Card>


      {/* ROADMAP */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

        {QUARTERS.map((quarter) => {

          const items =
            roadmap.filter(
              (item) =>
                (
                  item.quarter ||
                  item.phase
                ) === quarter
            );


          return (

            <Card
              key={quarter}
              className="bg-surface-hover/50 h-full flex flex-col"
            >

              <CardHeader className="pb-3 flex flex-row items-center justify-between shrink-0">

                <CardTitle className="text-lg flex items-center">

                  <Calendar className="mr-2 h-5 w-5 text-text-secondary" />

                  {quarter}

                </CardTitle>

                <Badge variant="outline">
                  {items.length}
                </Badge>

              </CardHeader>


              <CardContent className="space-y-3 flex-1 overflow-y-auto">

                {items.length === 0 ? (

                  <p className="text-xs text-text-secondary text-center py-4">
                    No items planned
                  </p>

                ) : (

                  items.map((item) => (

                    <RoadmapCard
                      key={item.id}
                      item={item}
                      onStatusChange={
                        handleStatusChange
                      }
                      onDelete={
                        handleDelete
                      }
                    />

                  ))

                )}


                {/* ADD */}

                <button
                  onClick={() =>
                    setShowMilestoneModal(true)
                  }
                  className="w-full py-3 border-2 border-dashed border-border rounded-lg text-text-secondary text-sm font-medium hover:border-primary hover:text-primary transition-colors flex items-center justify-center"
                >

                  <Plus className="mr-2 h-4 w-4" />

                  Add initiative

                </button>

              </CardContent>

            </Card>

          );

        })}

      </div>


      {/* PRODUCT PLANNING MODAL */}

      <ProductPlanningModal
        isOpen={showPlanningModal}
        onClose={() =>
          setShowPlanningModal(false)
        }
        onSuccess={
          handlePlanningSuccess
        }
      />


      {/* ADD MILESTONE MODAL */}

      <AddMilestoneModal
        isOpen={showMilestoneModal}
        onClose={() =>
          setShowMilestoneModal(false)
        }
        onSuccess={
          fetchRoadmap
        }
      />

    </div>

  );
}