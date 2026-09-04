// src/pages/PRDGenerator.jsx

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Wand2,
  Copy,
  RefreshCw,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Target,
  ListChecks,
  ShieldCheck,
  BarChart3,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";

import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import api from "../services/api";


/* =========================================================
   HELPER FUNCTIONS
========================================================= */

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) =>
        item
          .replace(/^[-*•]\s*/, "")
          .trim()
      )
      .filter(Boolean);
  }

  return [];
}


/* =========================================================
   CLEAN AI TEXT
========================================================= */

function cleanText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/\*\*\*/g, "")
    .replace(/\*\*/g, "")
    .replace(/^#+\s*/gm, "")
    .trim();
}


/* =========================================================
   NORMALIZE USER STORIES
========================================================= */

function normalizeUserStories(stories) {
  if (!Array.isArray(stories)) {
    return [];
  }

  return stories.map((item) => {

    /*
      If backend returns a string
    */

    if (typeof item === "string") {
      return {
        story: cleanText(item),
        acceptance_criteria: [],
      };
    }

    /*
      Normal structured user story
    */

    return {
      story: cleanText(
        item?.story ||
        item?.user_story ||
        item?.userStory ||
        ""
      ),

      acceptance_criteria: toArray(
        item?.acceptance_criteria ||
        item?.acceptanceCriteria ||
        []
      ).map(cleanText),
    };
  });
}


/* =========================================================
   NORMALIZE PRD RESPONSE
========================================================= */

function normalizePRD(data) {

  if (!data) {
    return null;
  }

  /*
    Backend can return:

    {
      prd: {...}
    }

    OR

    {
      prd: "{...}"
    }

    OR

    {
      title: "...",
      ...
    }
  */

  let raw = data?.prd ?? data;


  /* =======================================================
     If PRD is returned as a JSON string
  ======================================================= */

  if (typeof raw === "string") {

    try {

      let cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      raw = JSON.parse(cleaned);

    } catch (error) {

      /*
        Old/plain-text PRD fallback
      */

      return {
        title: "Product Requirements Document",

        raw_text: cleanText(raw),

        problem_statement: "",

        objectives: [],

        user_stories: [],

        functional_requirements: [],

        non_functional_requirements: [],

        acceptance_criteria: [],

        risks: [],

        success_metrics: [],
      };
    }
  }


  /* =======================================================
     Return normalized PRD object
  ======================================================= */

  return {

    title: cleanText(
      raw?.title ||
      "Product Requirements Document"
    ),

    problem_statement: cleanText(
      raw?.problem_statement ||
      raw?.problemStatement ||
      ""
    ),

    objectives: toArray(
      raw?.objectives
    ).map(cleanText),

    user_stories: normalizeUserStories(
      raw?.user_stories ||
      raw?.userStories ||
      []
    ),

    functional_requirements: toArray(
      raw?.functional_requirements ||
      raw?.functionalRequirements ||
      []
    ).map(cleanText),

    non_functional_requirements: toArray(
      raw?.non_functional_requirements ||
      raw?.nonFunctionalRequirements ||
      []
    ).map(cleanText),

    acceptance_criteria: toArray(
      raw?.acceptance_criteria ||
      raw?.acceptanceCriteria ||
      []
    ).map(cleanText),

    risks: toArray(
      raw?.risks
    ).map(cleanText),

    success_metrics: toArray(
      raw?.success_metrics ||
      raw?.successMetrics ||
      []
    ).map(cleanText),

    raw_text: cleanText(
      raw?.raw_text ||
      ""
    ),
  };
}


/* =========================================================
   PRD SECTION
========================================================= */

function PRDSection({
  icon: Icon,
  title,
  children,
  iconClassName = "text-primary",
}) {

  return (
    <section className="mb-8">

      <div className="flex items-center gap-2 mb-3">

        {Icon && (
          <Icon
            className={`h-5 w-5 ${iconClassName}`}
          />
        )}

        <h2 className="text-lg font-semibold text-text-primary">
          {title}
        </h2>

      </div>

      {children}

    </section>
  );
}


/* =========================================================
   BULLET LIST
========================================================= */

function BulletList({ items }) {

  if (!items || items.length === 0) {

    return (
      <p className="text-sm text-text-secondary italic">
        No information provided.
      </p>
    );
  }

  return (

    <ul className="space-y-2.5 pl-1">

      {items.map((item, index) => (

        <li
          key={index}
          className="flex items-start gap-3 text-sm leading-6 text-text-primary"
        >

          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />

          <span>
            {item}
          </span>

        </li>

      ))}

    </ul>
  );
}


/* =========================================================
   USER STORY CARD
========================================================= */

function UserStoryCard({
  story,
  index,
}) {

  const acceptanceCriteria =
    story?.acceptance_criteria || [];


  return (

    <div className="border border-border rounded-xl p-5 mb-4 bg-background/40">

      {/* User Story Header */}

      <div className="flex items-start gap-3 mb-5">

        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary text-sm font-semibold shrink-0">

          {index + 1}

        </div>


        <div className="min-w-0 flex-1">

          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary mb-1">

            User Story

          </p>


          <p className="text-sm leading-6 text-text-primary font-medium">

            {story?.story ||
              "User story not provided."}

          </p>

        </div>

      </div>


      {/* Acceptance Criteria */}

      <div className="ml-11">

        <div className="flex items-center gap-2 mb-3">

          <CheckCircle2 className="h-4 w-4 text-green-600" />

          <h4 className="text-sm font-semibold text-text-primary">

            Acceptance Criteria

          </h4>

        </div>


        {acceptanceCriteria.length > 0 ? (

          <ol className="space-y-2">

            {acceptanceCriteria.map(
              (criterion, criterionIndex) => (

                <li
                  key={criterionIndex}
                  className="flex items-start gap-3 text-sm leading-6 text-text-secondary"
                >

                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-green-500/10 text-green-600 text-xs font-medium shrink-0 mt-0.5">

                    {criterionIndex + 1}

                  </span>


                  <span>
                    {criterion}
                  </span>

                </li>

              )
            )}

          </ol>

        ) : (

          <p className="text-sm text-danger italic">

            No acceptance criteria were generated
            for this user story.

          </p>

        )}

      </div>

    </div>
  );
}


/* =========================================================
   PRD VIEWER
========================================================= */

function PRDViewer({ prd }) {

  if (!prd) {
    return null;
  }


  /* =======================================================
     FALLBACK FOR OLD TEXT PRDS
  ======================================================= */

  if (
    prd.raw_text &&
    !prd.problem_statement &&
    prd.user_stories.length === 0
  ) {

    return (

      <div className="p-8">

        <div className="rounded-xl border border-border bg-background p-6">

          <h1 className="text-2xl font-bold text-text-primary mb-5">

            {prd.title}

          </h1>


          <pre className="whitespace-pre-wrap text-sm leading-7 text-text-primary font-sans">

            {prd.raw_text}

          </pre>

        </div>

      </div>

    );
  }


  /* =======================================================
     STRUCTURED PRD
  ======================================================= */

  return (

    <div className="p-8 max-w-4xl mx-auto">


      {/* ===================================================
          TITLE
      =================================================== */}

      <div className="mb-8 pb-6 border-b border-border">

        <div className="flex items-center gap-3">

          <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-primary/10">

            <FileText className="h-6 w-6 text-primary" />

          </div>


          <div>

            <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">

              Product Requirements Document

            </p>


            <h1 className="text-2xl font-bold text-text-primary mt-1">

              {prd.title}

            </h1>

          </div>

        </div>

      </div>


      {/* ===================================================
          PROBLEM STATEMENT
      =================================================== */}

      <PRDSection
        icon={Target}
        title="Problem Statement"
      >

        <div className="rounded-xl border border-border bg-background/50 p-5">

          <p className="text-sm leading-7 text-text-primary">

            {prd.problem_statement ||
              "No problem statement provided."}

          </p>

        </div>

      </PRDSection>


      {/* ===================================================
          OBJECTIVES
      =================================================== */}

      <PRDSection
        icon={Target}
        title="Objectives"
      >

        <BulletList
          items={prd.objectives}
        />

      </PRDSection>


      {/* ===================================================
          USER STORIES
      =================================================== */}

      <PRDSection
        icon={ListChecks}
        title="User Stories"
      >

        {prd.user_stories.length > 0 ? (

          prd.user_stories.map(
            (story, index) => (

              <UserStoryCard
                key={index}
                story={story}
                index={index}
              />

            )
          )

        ) : (

          <p className="text-sm text-text-secondary italic">

            No user stories were generated.

          </p>

        )}

      </PRDSection>


      {/* ===================================================
          FUNCTIONAL REQUIREMENTS
      =================================================== */}

      <PRDSection
        icon={ListChecks}
        title="Functional Requirements"
      >

        <BulletList
          items={prd.functional_requirements}
        />

      </PRDSection>


      {/* ===================================================
          NON-FUNCTIONAL REQUIREMENTS
      =================================================== */}

      <PRDSection
        icon={ShieldCheck}
        title="Non-Functional Requirements"
      >

        <BulletList
          items={prd.non_functional_requirements}
        />

      </PRDSection>


      {/* ===================================================
          OVERALL ACCEPTANCE CRITERIA
      =================================================== */}

      <PRDSection
        icon={CheckCircle2}
        title="Overall Acceptance Criteria"
        iconClassName="text-green-600"
      >

        {prd.acceptance_criteria.length > 0 ? (

          <div className="space-y-2.5">

            {prd.acceptance_criteria.map(
              (criteria, index) => (

                <div
                  key={index}
                  className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3"
                >

                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-1" />

                  <p className="text-sm leading-6 text-text-primary">

                    {criteria}

                  </p>

                </div>

              )
            )}

          </div>

        ) : (

          <p className="text-sm text-text-secondary italic">

            No overall acceptance criteria provided.

          </p>

        )}

      </PRDSection>


      {/* ===================================================
          RISKS
      =================================================== */}

      <PRDSection
        icon={AlertTriangle}
        title="Risks"
        iconClassName="text-orange-500"
      >

        <BulletList
          items={prd.risks}
        />

      </PRDSection>


      {/* ===================================================
          SUCCESS METRICS
      =================================================== */}

      <PRDSection
        icon={BarChart3}
        title="Success Metrics"
        iconClassName="text-blue-500"
      >

        <BulletList
          items={prd.success_metrics}
        />

      </PRDSection>

    </div>

  );
}


/* =========================================================
   MAIN PRD GENERATOR
========================================================= */

export function PRDGenerator() {

  const [isGenerating, setIsGenerating] =
    useState(false);

  const [prdContent, setPrdContent] =
    useState(null);

  const [prdId, setPrdId] =
    useState(null);


  /* =======================================================
     FORM STATE
  ======================================================= */

  const [featureName, setFeatureName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [priority, setPriority] =
    useState("High");

  const [businessGoal, setBusinessGoal] =
    useState("");

  const [targetUsers, setTargetUsers] =
    useState("");


  /* =======================================================
     ERROR
  ======================================================= */

  const [error, setError] =
    useState("");


  /* =======================================================
     PREVIOUS PRDS
  ======================================================= */

  const [prevPRDs, setPrevPRDs] =
    useState([]);

  const [prdSearch, setPrdSearch] =
    useState("");

  const [showPrev, setShowPrev] =
    useState(false);


  /* =========================================================
     PREFILL FROM FEATURE REQUESTS
  ========================================================= */

  useEffect(() => {

    const prefill =
      localStorage.getItem("prd_prefill");


    if (prefill) {

      try {

        const data =
          JSON.parse(prefill);


        setFeatureName(
          data.feature_name ?? ""
        );

        setDescription(
          data.description ?? ""
        );

        setPriority(
          data.priority ?? "High"
        );

        setBusinessGoal(
          data.business_goal ?? ""
        );

        setTargetUsers(
          data.target_users ?? ""
        );


        localStorage.removeItem(
          "prd_prefill"
        );

      } catch {

        // Ignore invalid localStorage data

      }

    }

  }, []);


  /* =========================================================
     FETCH PREVIOUS PRDS
  ========================================================= */

  const fetchPrevPRDs =
    useCallback(async () => {

      try {

        const res =
          await api.get("/prd/");


        setPrevPRDs(

          Array.isArray(res.data)
            ? res.data
            : res.data?.prds || []

        );

      } catch (err) {

        console.error(
          "Failed to fetch previous PRDs:",
          err
        );

      }

    }, []);


  useEffect(() => {

    fetchPrevPRDs();

  }, [fetchPrevPRDs]);


  /* =========================================================
     GENERATE PRD
  ========================================================= */

  const handleGenerate =
    async () => {

      if (!featureName.trim()) {

        setError(
          "Feature name is required."
        );

        return;
      }


      setIsGenerating(true);
      setError("");
      setPrdContent(null);


      try {

        const res =
          await api.post(
            "/prd/generate",
            {
              feature_name:
                featureName,

              description:
                description,

              priority:
                priority,

              business_goal:
                businessGoal,

              target_users:
                targetUsers,
            }
          );


        console.log(
          "PRD API response:",
          res.data
        );


        const normalized =
          normalizePRD(res.data);


        if (!normalized) {

          throw new Error(
            "Backend returned an empty PRD."
          );

        }


        setPrdContent(
          normalized
        );


        setPrdId(

          res.data?.document_id ??
          res.data?.prd_id ??
          null

        );


        await fetchPrevPRDs();

      } catch (err) {

        console.error(
          "PRD generation error:",
          err
        );


        const msg =
          err.response?.data?.detail ??
          err.message ??
          "Error generating PRD. Check backend.";


        setError(msg);

      } finally {

        setIsGenerating(false);

      }

    };


  /* =========================================================
     COPY PRD
  ========================================================= */

  const buildPlainTextPRD =
    (prd) => {

      const lines = [];


      /* Title */

      lines.push(
        prd.title ||
        "Product Requirements Document"
      );

      lines.push("");


      /* Problem */

      lines.push(
        "PROBLEM STATEMENT"
      );

      lines.push(
        prd.problem_statement ||
        "Not provided"
      );

      lines.push("");


      /* Objectives */

      lines.push(
        "OBJECTIVES"
      );


      if (
        prd.objectives?.length > 0
      ) {

        prd.objectives.forEach(
          (objective, index) => {

            lines.push(
              `${index + 1}. ${objective}`
            );

          }
        );

      } else {

        lines.push(
          "Not provided"
        );

      }


      lines.push("");


      /* User Stories */

      lines.push(
        "USER STORIES"
      );


      if (
        prd.user_stories?.length > 0
      ) {

        prd.user_stories.forEach(
          (userStory, index) => {

            lines.push("");

            lines.push(
              `User Story ${index + 1}`
            );

            lines.push(
              userStory.story ||
              "Not provided"
            );

            lines.push("");

            lines.push(
              "Acceptance Criteria"
            );


            if (
              userStory.acceptance_criteria?.length > 0
            ) {

              userStory.acceptance_criteria.forEach(
                (criteria, criteriaIndex) => {

                  lines.push(
                    `${criteriaIndex + 1}. ${criteria}`
                  );

                }
              );

            } else {

              lines.push(
                "No acceptance criteria provided."
              );

            }

          }
        );

      } else {

        lines.push(
          "No user stories provided."
        );

      }


      lines.push("");


      /* Functional Requirements */

      lines.push(
        "FUNCTIONAL REQUIREMENTS"
      );


      if (
        prd.functional_requirements?.length > 0
      ) {

        prd.functional_requirements.forEach(
          (requirement, index) => {

            lines.push(
              `${index + 1}. ${requirement}`
            );

          }
        );

      } else {

        lines.push(
          "Not provided"
        );

      }


      lines.push("");


      /* Non Functional Requirements */

      lines.push(
        "NON-FUNCTIONAL REQUIREMENTS"
      );


      if (
        prd.non_functional_requirements?.length > 0
      ) {

        prd.non_functional_requirements.forEach(
          (requirement, index) => {

            lines.push(
              `${index + 1}. ${requirement}`
            );

          }
        );

      } else {

        lines.push(
          "Not provided"
        );

      }


      lines.push("");


      /* Overall Acceptance Criteria */

      lines.push(
        "OVERALL ACCEPTANCE CRITERIA"
      );


      if (
        prd.acceptance_criteria?.length > 0
      ) {

        prd.acceptance_criteria.forEach(
          (criteria, index) => {

            lines.push(
              `${index + 1}. ${criteria}`
            );

          }
        );

      } else {

        lines.push(
          "Not provided"
        );

      }


      lines.push("");


      /* Risks */

      lines.push(
        "RISKS"
      );


      if (
        prd.risks?.length > 0
      ) {

        prd.risks.forEach(
          (risk, index) => {

            lines.push(
              `${index + 1}. ${risk}`
            );

          }
        );

      } else {

        lines.push(
          "Not provided"
        );

      }


      lines.push("");


      /* Success Metrics */

      lines.push(
        "SUCCESS METRICS"
      );


      if (
        prd.success_metrics?.length > 0
      ) {

        prd.success_metrics.forEach(
          (metric, index) => {

            lines.push(
              `${index + 1}. ${metric}`
            );

          }
        );

      } else {

        lines.push(
          "Not provided"
        );

      }


      return lines.join("\n");

    };


  /* =========================================================
     COPY BUTTON
  ========================================================= */

  const handleCopy =
    async () => {

      if (!prdContent) {
        return;
      }


      try {

        const text =
          buildPlainTextPRD(
            prdContent
          );


        await navigator.clipboard.writeText(
          text
        );

      } catch (err) {

        console.error(
          "Copy failed:",
          err
        );

      }

    };


  /* =========================================================
     LOAD PREVIOUS PRD
  ========================================================= */

  const handleLoadPRD =
    (prd) => {

      const normalized =
        normalizePRD(prd);


      setPrdContent(
        normalized
      );


      setPrdId(
        prd.id ??
        prd.document_id ??
        null
      );


      setFeatureName(
        prd.feature_name ||
        prd.title ||
        ""
      );


      setDescription(
        prd.description ||
        ""
      );


      setPriority(
        prd.priority ||
        "High"
      );


      setBusinessGoal(
        prd.business_goal ||
        ""
      );


      setTargetUsers(
        prd.target_users ||
        ""
      );


      setError("");
      setShowPrev(false);

    };


  /* =========================================================
     FILTER PREVIOUS PRDS
  ========================================================= */

  const filteredPRDs =
    prevPRDs.filter(
      (prd) =>
        !prdSearch ||
        prd.title
          ?.toLowerCase()
          .includes(
            prdSearch.toLowerCase()
          )
    );


  /* =========================================================
     RETURN UI
  ========================================================= */

  return (

    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">


      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">

        <div>

          <h1 className="text-2xl font-bold tracking-tight text-text-primary">

            PRD Generator

          </h1>


          <p className="mt-1 text-sm text-text-secondary">

            Automatically draft Product Requirements Documents using AI.

          </p>

        </div>


        <Button
          variant="outline"
          onClick={() =>
            setShowPrev(true)
          }
        >

          <Clock className="mr-2 h-4 w-4" />

          Previous PRDs ({prevPRDs.length})

        </Button>

      </div>


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">


        {/* ===================================================
            LEFT PANEL
        =================================================== */}

        <Card className="w-full lg:w-1/3 flex flex-col h-full bg-surface">


          <CardHeader className="border-b border-border py-4 px-6 shrink-0">

            <CardTitle className="text-lg">

              Feature Details

            </CardTitle>

          </CardHeader>


          <CardContent className="p-6 flex-1 overflow-y-auto space-y-5">


            {/* Feature Name */}

            <div>

              <label className="mb-1.5 block text-sm font-medium text-text-primary">

                Feature Name{" "}

                <span className="text-danger">
                  *
                </span>

              </label>


              <Input
                value={featureName}
                onChange={(e) =>
                  setFeatureName(
                    e.target.value
                  )
                }
                placeholder="e.g., Dark Mode"
              />

            </div>


            {/* Description */}

            <div>

              <label className="mb-1.5 block text-sm font-medium text-text-primary">

                Description

              </label>


              <textarea
                className="w-full p-3 border border-border rounded-lg bg-background text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary text-sm min-h-[100px] resize-y"
                placeholder="Briefly describe what this feature does…"
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
              />

            </div>


            {/* Priority */}

            <div>

              <label className="mb-1.5 block text-sm font-medium text-text-primary">

                Priority

              </label>


              <select
                className="w-full h-10 px-3 py-2 border border-border rounded-lg bg-background text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                value={priority}
                onChange={(e) =>
                  setPriority(
                    e.target.value
                  )
                }
              >

                {[
                  "Critical",
                  "High",
                  "Medium",
                  "Low",
                ].map((p) => (

                  <option
                    key={p}
                    value={p}
                  >
                    {p}
                  </option>

                ))}

              </select>

            </div>


            {/* Business Goal */}

            <div>

              <label className="mb-1.5 block text-sm font-medium text-text-primary">

                Business Goal

              </label>


              <Input
                value={businessGoal}
                onChange={(e) =>
                  setBusinessGoal(
                    e.target.value
                  )
                }
                placeholder="e.g., Increase user retention"
              />

            </div>


            {/* Target Users */}

            <div>

              <label className="mb-1.5 block text-sm font-medium text-text-primary">

                Target Users

              </label>


              <Input
                value={targetUsers}
                onChange={(e) =>
                  setTargetUsers(
                    e.target.value
                  )
                }
                placeholder="e.g., Enterprise Admins"
              />

            </div>


            {/* Error */}

            {error && (

              <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">

                <p className="text-sm text-danger">

                  {error}

                </p>

              </div>

            )}

          </CardContent>


          {/* Generate Button */}

          <div className="p-6 border-t border-border shrink-0">

            <Button
              onClick={handleGenerate}
              disabled={
                isGenerating ||
                !featureName.trim()
              }
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


        {/* ===================================================
            RIGHT PANEL
        =================================================== */}

        <Card className="w-full lg:w-2/3 flex flex-col h-full bg-surface shadow-sm">


          {prdContent ? (

            <>

              {/* Document Header */}

              <div className="flex items-center justify-between px-8 py-4 border-b border-border shrink-0 bg-background/50 rounded-t-xl">

                <div className="flex items-center text-sm font-medium text-text-secondary">

                  <FileText className="h-4 w-4 mr-2" />

                  Generated Document


                  {prdId && (

                    <span className="ml-2 text-xs text-text-muted">

                      #{prdId}

                    </span>

                  )}

                </div>


                <div className="flex items-center gap-2">

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-text-secondary hover:text-text-primary"
                    onClick={handleCopy}
                  >

                    <Copy className="h-4 w-4 mr-1.5" />

                    Copy

                  </Button>


                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >

                    <RefreshCw className="h-4 w-4 mr-1.5" />

                    Regenerate

                  </Button>

                </div>

              </div>


              {/* =================================================
                  STRUCTURED PRD VIEWER
              ================================================= */}

              <CardContent className="p-0 flex-1 overflow-y-auto">

                <PRDViewer
                  prd={prdContent}
                />

              </CardContent>

            </>

          ) : (


            /* =================================================
               EMPTY STATE
            ================================================= */

            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">

              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">

                <Wand2 className="h-8 w-8 text-primary" />

              </div>


              <h3 className="text-xl font-semibold text-text-primary mb-2">

                AI-Powered PRD Generator

              </h3>


              <p className="text-text-secondary max-w-md">

                Fill out the details in the left panel
                and click Generate. AI will structure
                a comprehensive Product Requirements
                Document and save it to your database.

              </p>

            </div>

          )}

        </Card>

      </div>


      {/* =====================================================
          PREVIOUS PRDS MODAL
      ===================================================== */}

      <Modal
        isOpen={showPrev}
        onClose={() =>
          setShowPrev(false)
        }
        title="Previous PRDs"
        className="max-w-lg"
      >

        <div className="space-y-4">


          {/* Search */}

          <div className="relative">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />


            <Input
              type="text"
              placeholder="Search PRDs…"
              className="pl-9"
              value={prdSearch}
              onChange={(e) =>
                setPrdSearch(
                  e.target.value
                )
              }
            />

          </div>


          {/* PRD LIST */}

          <div className="max-h-80 overflow-y-auto space-y-2">

            {filteredPRDs.length === 0 ? (

              <p className="text-sm text-text-secondary text-center py-8">

                {prdSearch
                  ? "No PRDs match your search."
                  : "No PRDs generated yet."}

              </p>

            ) : (

              filteredPRDs.map(
                (prd) => (

                  <button
                    key={prd.id}
                    onClick={() =>
                      handleLoadPRD(prd)
                    }
                    className="w-full text-left p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-surface-hover transition-colors"
                  >

                    <div className="flex items-center justify-between">

                      <div className="flex items-center gap-3 min-w-0">

                        <FileText className="h-4 w-4 text-primary shrink-0" />


                        <div className="min-w-0">

                          <p className="text-sm font-medium text-text-primary truncate">

                            {prd.title}

                          </p>


                          <p className="text-xs text-text-secondary mt-0.5">

                            {prd.created_at}

                          </p>

                        </div>

                      </div>


                      <span className="text-xs text-primary font-medium shrink-0 ml-3">

                        Load →

                      </span>

                    </div>

                  </button>

                )
              )

            )}

          </div>

        </div>

      </Modal>

    </div>
  );
}