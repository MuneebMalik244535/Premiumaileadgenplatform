import React, { useState, useEffect } from "react";
import { 
  Users, 
  Clock, 
  MousePointerClick, 
  Eye, 
  BarChart2, 
  RefreshCw, 
  TrendingUp, 
  Globe, 
  Compass 
} from "lucide-react";
import { api } from "../../lib/api";

interface PageStat {
  page_path: string;
  views: number;
  avg_duration_seconds: number;
}

interface ClickStat {
  target: string;
  clicks: number;
}

interface RecentEvent {
  id: number;
  session_id: string;
  user_email: string | null;
  page_path: string;
  duration_seconds: number;
  click_target: string;
  ip_address: string;
  created_at: string;
}

interface AnalyticsSummary {
  total_events: number;
  unique_sessions: number;
  page_performance: PageStat[];
  popular_clicks: ClickStat[];
  recent_events: RecentEvent[];
}

export function UserBehavior() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await api.get<AnalyticsSummary>("/analytics/summary");
      setSummary(data);
    } catch (err: any) {
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <BarChart2 className="w-7 h-7 text-[#0078D7]" />
            User Behavior & Page Dwell Telemetry
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Real-time analytics tracking pageviews, user dwell time, and feature click heatmaps.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/10 transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 text-[#0078D7] ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40 font-bold uppercase tracking-wider">Total Telemetry Events</span>
            <Eye className="w-5 h-5 text-[#0078D7]" />
          </div>
          <div className="text-3xl font-extrabold text-white">{summary?.total_events.toLocaleString() || "0"}</div>
          <p className="text-[11px] text-white/40">Pageviews & interaction events recorded</p>
        </div>

        <div className="glass-card p-6 rounded-2xl border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40 font-bold uppercase tracking-wider">Unique Visitor Sessions</span>
            <Users className="w-5 h-5 text-[#10B981]" />
          </div>
          <div className="text-3xl font-extrabold text-white">{summary?.unique_sessions.toLocaleString() || "0"}</div>
          <p className="text-[11px] text-white/40">Distinct client session tokens</p>
        </div>

        <div className="glass-card p-6 rounded-2xl border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40 font-bold uppercase tracking-wider">Top Visited Path</span>
            <Compass className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono truncate">
            {summary?.page_performance[0]?.page_path || "/"}
          </div>
          <p className="text-[11px] text-white/40">
            {summary?.page_performance[0]?.views || 0} pageviews • Avg {summary?.page_performance[0]?.avg_duration_seconds || 0}s stay
          </p>
        </div>
      </div>

      {/* Grid: Page Performance & Feature Clicks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Page Dwell Time Table */}
        <div className="glass-card p-6 rounded-2xl border-white/5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#10B981]" />
              <h3 className="font-bold text-white text-base">Page Dwell Duration & Traffic</h3>
            </div>
          </div>

          <div className="space-y-3">
            {summary?.page_performance.map((page, idx) => (
              <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-white">{page.page_path}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-white/60">Views: <strong className="text-white">{page.views}</strong></span>
                    <span className="text-[#10B981] font-bold">{page.avg_duration_seconds}s avg stay</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#0078D7] to-[#10B981]" 
                    style={{ width: `${Math.min(100, (page.views / (summary?.total_events || 1)) * 100 * 2)}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Click Heatmap */}
        <div className="glass-card p-6 rounded-2xl border-white/5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <MousePointerClick className="w-5 h-5 text-[#0078D7]" />
              <h3 className="font-bold text-white text-base">Feature & Button Click Heatmap</h3>
            </div>
          </div>

          {summary?.popular_clicks.length === 0 ? (
            <div className="text-center py-10 text-xs text-white/40">No click telemetry recorded yet.</div>
          ) : (
            <div className="space-y-3">
              {summary?.popular_clicks.map((click, idx) => (
                <div key={idx} className="bg-white/5 p-3.5 rounded-xl border border-white/5 flex items-center justify-between">
                  <span className="font-mono text-xs text-white/80">{click.target}</span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#0078D7]/10 text-[#0078D7] border border-[#0078D7]/20">
                    {click.clicks} Clicks
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Session Telemetry Logs */}
      <div className="glass-card p-6 rounded-2xl border-white/5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-white/5">
          <Globe className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-white text-base">Live Visitor Telemetry Stream</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-white/40 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Session Token</th>
                <th className="py-3 px-4">Page Path</th>
                <th className="py-3 px-4">Dwell Duration</th>
                <th className="py-3 px-4">Click Target</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {summary?.recent_events.map((evt) => (
                <tr key={evt.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-4 font-mono text-[11px] text-white/50">{evt.session_id.slice(0, 16)}...</td>
                  <td className="py-3 px-4 font-mono font-bold text-white">{evt.page_path}</td>
                  <td className="py-3 px-4 text-[#10B981] font-bold">{evt.duration_seconds}s</td>
                  <td className="py-3 px-4 font-mono text-white/60">{evt.click_target || "-"}</td>
                  <td className="py-3 px-4 font-mono text-white/40">{evt.ip_address}</td>
                  <td className="py-3 px-4 text-white/30 text-[11px]">{new Date(evt.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
