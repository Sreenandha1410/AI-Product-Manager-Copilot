// src/pages/Analytics.jsx

import React, {
  useEffect,
  useState,
  useCallback,
} from "react";

import {
  Search,
  Sparkles,
  TrendingUp,
  ThumbsUp,
  Layers,
  List,
  X,
} from "lucide-react";

import api from "../services/api";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";

import { Input } from "../components/ui/Input";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";


// ============================================================
// AI RECOMMENDATIONS POPUP
// ============================================================

function AIRecommendations({
  recommendations,
}) {
  const [open, setOpen] = useState(false);

  const items = Array.isArray(recommendations)
    ? recommendations
    : [];


  return (
    <div className="relative">

      {/* ======================================================
          SMALL AI BUTTON
      ======================================================= */}

      <button
        type="button"
        onClick={() =>
          setOpen((prev) => !prev)
        }
        className="
          inline-flex
          items-center
          gap-2
          px-3
          py-2
          rounded-lg
          border
          border-primary/20
          bg-primary/5
          text-primary
          text-sm
          font-medium
          hover:bg-primary/10
          transition-colors
        "
      >

        <Sparkles className="h-4 w-4" />

        AI Recommendations

      </button>


      {/* ======================================================
          POPUP
      ======================================================= */}

      {open && (

        <div
          className="
            absolute
            right-0
            top-full
            mt-2
            z-50
            w-[380px]
            max-w-[90vw]
            rounded-xl
            border
            border-border
            bg-background
            shadow-xl
            overflow-hidden
          "
        >

          {/* ==================================================
              POPUP HEADER
          =================================================== */}

          <div
            className="
              flex
              items-center
              justify-between
              px-4
              py-3
              border-b
              border-border
              bg-primary/5
            "
          >

            <div className="flex items-center gap-2">

              <div
                className="
                  flex
                  items-center
                  justify-center
                  h-7
                  w-7
                  rounded-full
                  bg-primary/10
                  text-primary
                "
              >

                <Sparkles className="h-4 w-4" />

              </div>


              <span
                className="
                  text-sm
                  font-semibold
                  text-text-primary
                "
              >
                AI Recommendations
              </span>

            </div>


            <button
              type="button"
              onClick={() => setOpen(false)}
              className="
                p-1
                rounded-md
                text-text-secondary
                hover:bg-surface-hover
                hover:text-text-primary
                transition-colors
              "
              aria-label="Close AI recommendations"
            >

              <X className="h-4 w-4" />

            </button>

          </div>


          {/* ==================================================
              POPUP CONTENT
          =================================================== */}

          <div className="p-4">

            {items.length > 0 ? (

              <ul className="space-y-3">

                {items.map(
                  (item, index) => (

                    <li
                      key={index}
                      className="
                        flex
                        items-start
                        gap-2
                        text-sm
                        text-text-secondary
                      "
                    >

                      <span
                        className="
                          mt-2
                          h-1.5
                          w-1.5
                          rounded-full
                          bg-primary
                          shrink-0
                        "
                      />

                      <span className="leading-6">

                        {typeof item === "string"
                          ? item
                          : item?.message ||
                            item?.recommendation ||
                            item?.text ||
                            JSON.stringify(item)}

                      </span>

                    </li>

                  )
                )}

              </ul>

            ) : (

              <div className="py-2">

                <p
                  className="
                    text-sm
                    text-text-secondary
                  "
                >
                  No AI recommendations yet.
                </p>

                <p
                  className="
                    text-xs
                    text-text-muted
                    mt-1
                  "
                >
                  Add feedback and run the
                  analytics pipeline.
                </p>

              </div>

            )}

          </div>

        </div>

      )}

    </div>
  );
}


// ============================================================
// ANALYTICS PAGE
// ============================================================

export function Analytics() {

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [searchTerm, setSearchTerm] =
    useState("");


  // ==========================================================
  // FETCH ANALYTICS
  // ==========================================================

  const fetchAnalytics =
    useCallback(async () => {

      setLoading(true);

      try {

        const res =
          await api.get("/analytics/");

        setData(res.data);

      } catch (err) {

        console.error(
          "Analytics error:",
          err
        );

      } finally {

        setLoading(false);

      }

    }, []);


  useEffect(() => {

    fetchAnalytics();

  }, [fetchAnalytics]);


  // ==========================================================
  // DATA
  // ==========================================================

  const growthData =
    data?.feedback_growth ?? [];

  const sentimentData =
    data?.sentiment ?? [];

  const categoryData =
    data?.categories ?? [];

  const priorityData =
    data?.priority ?? [];

  const featureTrends =
    data?.feature_trends ?? [];

  const aiRecommendations =
    data?.ai_recommendations ?? [];


  // ==========================================================
  // SEARCH FILTER
  // ==========================================================

  const filteredFeatures =
    featureTrends.filter(
      (f) =>
        !searchTerm ||
        f.name
          ?.toLowerCase()
          .includes(
            searchTerm.toLowerCase()
          )
    );


  const filteredCategories =
    categoryData.filter(
      (c) =>
        !searchTerm ||
        c.name
          ?.toLowerCase()
          .includes(
            searchTerm.toLowerCase()
          )
    );


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (

      <div
        className="
          flex
          items-center
          justify-center
          h-64
        "
      >

        <div
          className="
            h-8
            w-8
            animate-spin
            rounded-full
            border-4
            border-primary
            border-t-transparent
          "
        />

      </div>

    );

  }


  // ==========================================================
  // PAGE
  // ==========================================================

  return (

    <div className="space-y-6">


      {/* ======================================================
          HEADER
      ======================================================= */}

      <div
        className="
          flex
          flex-col
          sm:flex-row
          sm:items-center
          justify-between
          gap-4
        "
      >

        {/* TITLE */}

        <div>

          <h2
            className="
              text-2xl
              font-bold
              tracking-tight
              text-text-primary
            "
          >
            Product Feedback Analytics
          </h2>


          <p
            className="
              text-sm
              text-text-secondary
              mt-1
            "
          >
            Deep dive into user feedback
            trends, sentiment, and categories.
          </p>

        </div>


        {/* ==================================================
            ACTIONS
        =================================================== */}

        <div
          className="
            flex
            items-center
            gap-3
            flex-wrap
          "
        >

          {/* AI RECOMMENDATIONS */}

          <AIRecommendations
            recommendations={
              aiRecommendations
            }
          />


          {/* SEARCH */}

          <div
            className="
              relative
              w-64
            "
          >

            <Search
              className="
                absolute
                left-3
                top-1/2
                h-4
                w-4
                -translate-y-1/2
                text-text-secondary
              "
            />


            <Input
              type="text"
              placeholder="Search features or categories…"
              className="pl-9"
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(
                  e.target.value
                )
              }
            />

          </div>

        </div>

      </div>


      {/* ======================================================
          SUMMARY KPIs
      ======================================================= */}

      <div
        className="
          grid
          grid-cols-2
          md:grid-cols-4
          gap-4
        "
      >

        {[
          {
            label: "Total Feedback",
            value:
              data?.total_feedback ?? 0,
          },

          {
            label: "Avg Priority Score",
            value:
              data?.average_priority_score ??
              0,
          },

          {
            label: "Categories",
            value:
              categoryData.length,
          },

          {
            label: "Feature Trends",
            value:
              featureTrends.length,
          },

        ].map((k, i) => (

          <Card
            key={i}
            className="p-4 text-center"
          >

            <div
              className="
                text-2xl
                font-bold
                text-text-primary
              "
            >
              {k.value}
            </div>


            <div
              className="
                text-xs
                text-text-secondary
                mt-1
                uppercase
                tracking-wider
              "
            >
              {k.label}
            </div>

          </Card>

        ))}

      </div>


      {/* ======================================================
          CHARTS ROW
      ======================================================= */}

      <div
        className="
          grid
          gap-6
          md:grid-cols-2
        "
      >


        {/* ====================================================
            FEEDBACK GROWTH
        ===================================================== */}

        <Card>

          <CardHeader
            className="
              flex
              flex-row
              items-center
              justify-between
              pb-2
            "
          >

            <CardTitle>
              Feedback Growth
            </CardTitle>


            <TrendingUp
              className="
                h-4
                w-4
                text-text-muted
              "
            />

          </CardHeader>


          <CardContent>

            <div
              className="
                h-[300px]
                w-full
              "
            >

              {growthData.length > 0 ? (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <AreaChart
                    data={growthData}
                  >

                    <defs>

                      <linearGradient
                        id="colorGrowth"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >

                        <stop
                          offset="5%"
                          stopColor="#3B82F6"
                          stopOpacity={0.3}
                        />

                        <stop
                          offset="95%"
                          stopColor="#3B82F6"
                          stopOpacity={0}
                        />

                      </linearGradient>

                    </defs>


                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E5E7EB"
                    />


                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#9CA3AF",
                        fontSize: 12,
                      }}
                    />


                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#9CA3AF",
                        fontSize: 12,
                      }}
                    />


                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border:
                          "1px solid #E5E7EB",
                      }}
                    />


                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorGrowth)"
                    />

                  </AreaChart>

                </ResponsiveContainer>

              ) : (

                <div
                  className="
                    flex
                    items-center
                    justify-center
                    h-full
                    text-text-secondary
                    text-sm
                  "
                >
                  No feedback growth data yet.
                </div>

              )}

            </div>

          </CardContent>

        </Card>


        {/* ====================================================
            SENTIMENT ANALYSIS
        ===================================================== */}

        <Card>

          <CardHeader
            className="
              flex
              flex-row
              items-center
              justify-between
              pb-2
            "
          >

            <CardTitle>
              Sentiment Analysis
            </CardTitle>


            <ThumbsUp
              className="
                h-4
                w-4
                text-text-muted
              "
            />

          </CardHeader>


          <CardContent>

            <div
              className="
                h-[300px]
                w-full
                flex
                items-center
                justify-center
              "
            >

              {sentimentData.length > 0 ? (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <PieChart>

                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={5}
                      dataKey="value"
                    >

                      {sentimentData.map(
                        (entry, i) => (

                          <Cell
                            key={i}
                            fill={entry.color}
                          />

                        )
                      )}

                    </Pie>


                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border:
                          "1px solid #E5E7EB",
                      }}
                    />


                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                    />

                  </PieChart>

                </ResponsiveContainer>

              ) : (

                <p
                  className="
                    text-sm
                    text-text-secondary
                  "
                >
                  No sentiment data yet.
                </p>

              )}

            </div>

          </CardContent>

        </Card>


        {/* ====================================================
            CATEGORY ANALYSIS
        ===================================================== */}

        <Card>

          <CardHeader
            className="
              flex
              flex-row
              items-center
              justify-between
              pb-2
            "
          >

            <CardTitle>
              Category Analysis
            </CardTitle>


            <Layers
              className="
                h-4
                w-4
                text-text-muted
              "
            />

          </CardHeader>


          <CardContent>

            <div
              className="
                h-[300px]
                w-full
              "
            >

              {filteredCategories.length > 0 ? (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <BarChart
                    data={filteredCategories}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 0,
                      bottom: 5,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E5E7EB"
                    />


                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#9CA3AF",
                        fontSize: 11,
                      }}
                    />


                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#9CA3AF",
                        fontSize: 12,
                      }}
                    />


                    <Tooltip
                      cursor={{
                        fill: "transparent",
                      }}
                      contentStyle={{
                        borderRadius: "8px",
                        border:
                          "1px solid #E5E7EB",
                      }}
                    />


                    <Bar
                      dataKey="count"
                      fill="#8B5CF6"
                      radius={[
                        4,
                        4,
                        0,
                        0,
                      ]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              ) : (

                <div
                  className="
                    flex
                    items-center
                    justify-center
                    h-full
                    text-text-secondary
                    text-sm
                  "
                >

                  {searchTerm
                    ? "No categories match your search."
                    : "No category data yet."}

                </div>

              )}

            </div>

          </CardContent>

        </Card>


        {/* ====================================================
            PRIORITY DISTRIBUTION
        ===================================================== */}

        <Card>

          <CardHeader
            className="
              flex
              flex-row
              items-center
              justify-between
              pb-2
            "
          >

            <CardTitle>
              Priority Distribution
            </CardTitle>


            <List
              className="
                h-4
                w-4
                text-text-muted
              "
            />

          </CardHeader>


          <CardContent>

            <div
              className="
                h-[300px]
                w-full
              "
            >

              {priorityData.length > 0 ? (

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <BarChart
                    data={priorityData}
                    layout="vertical"
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal
                      vertical={false}
                      stroke="#E5E7EB"
                    />


                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#9CA3AF",
                        fontSize: 12,
                      }}
                    />


                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#4B5563",
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    />


                    <Tooltip
                      cursor={{
                        fill: "transparent",
                      }}
                      contentStyle={{
                        borderRadius: "8px",
                        border:
                          "1px solid #E5E7EB",
                      }}
                    />


                    <Bar
                      dataKey="count"
                      radius={[
                        0,
                        4,
                        4,
                        0,
                      ]}
                    >

                      {priorityData.map(
                        (entry, i) => (

                          <Cell
                            key={i}
                            fill={entry.color}
                          />

                        )
                      )}

                    </Bar>

                  </BarChart>

                </ResponsiveContainer>

              ) : (

                <div
                  className="
                    flex
                    items-center
                    justify-center
                    h-full
                    text-text-secondary
                    text-sm
                  "
                >
                  No priority data yet.
                  Run the PrioritizationAgent.
                </div>

              )}

            </div>

          </CardContent>

        </Card>

      </div>


      {/* ======================================================
          FEATURE REQUEST TRENDS
      ======================================================= */}

      <Card>

        <CardHeader>

          <CardTitle>
            Feature Request Trends (Top Requested)
          </CardTitle>

        </CardHeader>


        <CardContent>

          <div
            className="
              h-[350px]
              w-full
            "
          >

            {filteredFeatures.length > 0 ? (

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart
                  data={filteredFeatures}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 0,
                    bottom: 5,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E5E7EB"
                  />


                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#9CA3AF",
                      fontSize: 11,
                    }}
                  />


                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#9CA3AF",
                      fontSize: 12,
                    }}
                  />


                  <Tooltip
                    cursor={{
                      fill: "transparent",
                    }}
                    contentStyle={{
                      borderRadius: "8px",
                      border:
                        "1px solid #E5E7EB",
                    }}
                  />


                  <Bar
                    dataKey="count"
                    fill="#10B981"
                    radius={[
                      4,
                      4,
                      0,
                      0,
                    ]}
                  />

                </BarChart>

              </ResponsiveContainer>

            ) : (

              <div
                className="
                  flex
                  items-center
                  justify-center
                  h-full
                  text-text-secondary
                  text-sm
                "
              >

                {searchTerm
                  ? "No features match your search."
                  : "No feature trend data yet."}

              </div>

            )}

          </div>

        </CardContent>

      </Card>

    </div>

  );
}