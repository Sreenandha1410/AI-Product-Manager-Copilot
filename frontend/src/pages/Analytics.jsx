// src/pages/Analytics.jsx
import React, { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";
import api from "../services/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Sparkles, TrendingUp, ThumbsUp, Layers, List } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend,
} from "recharts";

export function Analytics() {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/analytics/");
      setData(res.data);
    } catch (err) {
      console.error("Analytics error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const growthData       = data?.feedback_growth    ?? [];
  const sentimentData    = data?.sentiment          ?? [];
  const categoryData     = data?.categories         ?? [];
  const priorityData     = data?.priority           ?? [];
  const featureTrends    = data?.feature_trends     ?? [];
  const aiRecommendations= data?.ai_recommendations ?? [];

  // Filter feature trends and categories by search
  const filteredFeatures = featureTrends.filter(f =>
    !searchTerm || f.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredCategories = categoryData.filter(c =>
    !searchTerm || c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">
            Product Feedback Analytics
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Deep dive into user feedback trends, sentiment, and categories.
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <Input
            type="text"
            placeholder="Search features or categories…"
            className="pl-9"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* AI Recommendations */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-start gap-4">
          <div className="rounded-full bg-primary/20 p-2 text-primary shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary mb-2 text-sm">AI Recommendations</h3>
            {aiRecommendations.length > 0 ? (
              <ul className="text-sm text-text-secondary space-y-1 list-disc pl-4">
                {aiRecommendations.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-text-secondary">
                No AI recommendations yet. Add feedback and run the analytics pipeline.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Feedback",     value: data?.total_feedback            ?? 0 },
          { label: "Avg Priority Score", value: data?.average_priority_score    ?? 0 },
          { label: "Categories",         value: categoryData.length             ?? 0 },
          { label: "Feature Trends",     value: featureTrends.length            ?? 0 },
        ].map((k, i) => (
          <Card key={i} className="p-4 text-center">
            <div className="text-2xl font-bold text-text-primary">{k.value}</div>
            <div className="text-xs text-text-secondary mt-1 uppercase tracking-wider">{k.label}</div>
          </Card>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Feedback Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-text-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {growthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData}>
                    <defs>
                      <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB" }} />
                    <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorGrowth)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-text-secondary text-sm">
                  No feedback growth data yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Sentiment Analysis</CardTitle>
            <ThumbsUp className="h-4 w-4 text-text-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              {sentimentData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%" cy="50%"
                      innerRadius={80} outerRadius={110}
                      paddingAngle={5} dataKey="value"
                    >
                      {sentimentData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB" }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-text-secondary">No sentiment data yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Category Analysis</CardTitle>
            <Layers className="h-4 w-4 text-text-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {filteredCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredCategories} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                    <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB" }} />
                    <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-text-secondary text-sm">
                  {searchTerm ? "No categories match your search." : "No category data yet."}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Priority Distribution</CardTitle>
            <List className="h-4 w-4 text-text-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {priorityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#E5E7EB" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "#4B5563", fontSize: 12, fontWeight: 500 }} />
                    <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB" }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {priorityData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-text-secondary text-sm">
                  No priority data yet. Run the PrioritizationAgent.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Request Trends (Top Requested)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            {filteredFeatures.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredFeatures} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                  <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB" }} />
                  <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-text-secondary text-sm">
                {searchTerm ? "No features match your search." : "No feature trend data yet."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}