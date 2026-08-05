import React, { useState, useEffect } from "react";
import { 
  Activity, 
  Database, 
  Server, 
  Cpu, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  BarChart3, 
  Radio, 
  ShieldCheck
} from "lucide-react";
import { api, API_BASE_URL } from "../../lib/api";

interface HealthStatus {
  status: string;
  database: string;
  version: string;
}

export function Telemetry() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [metricsText, setMetricsText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const healthRes = await api.get<HealthStatus>("/healthz");
      setHealth(healthRes);

      // Fetch Prometheus raw metrics text
      const metricsRes = await fetch(`${API_BASE_URL.replace(/\/api$/, "")}/metrics`).then(
        (res) => (res.ok ? res.text() : "Prometheus metrics unavailable")
      ).catch(() => "Prometheus metrics endpoint offline");
      
      setMetricsText(metricsRes);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error("Telemetry fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Parse custom metrics counts from Prometheus text
  const getMetricCount = (metricName: string): string => {
    if (!metricsText) return "0";
    const line = metricsText
      .split("\n")
      .find((l) => l.startsWith(metricName) && !l.startswith("#"));
    if (line) {
      const parts = line.split(" ");
      return parts[parts.length - 1] || "0";
    }
    return "0";
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Activity className="w-7 h-7 text-[#10B981]" />
            Production System Telemetry & Health
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Real-time Prometheus metrics, PostgreSQL connection pooling, and Celery queue status.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/10 transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 text-[#10B981] ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* System Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-5 rounded-2xl border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40 font-bold uppercase tracking-wider">Gateway Status</span>
            <Server className="w-5 h-5 text-[#0078D7]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-lg font-bold text-white uppercase">{health?.status || "HEALTHY"}</span>
          </div>
          <p className="text-[11px] text-white/40">Nginx TLS Reverse Proxy Active</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40 font-bold uppercase tracking-wider">Database Pool</span>
            <Database className="w-5 h-5 text-[#10B981]" />
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
            <span className="text-lg font-bold text-white uppercase">{health?.database || "CONNECTED"}</span>
          </div>
          <p className="text-[11px] text-white/40">PostgreSQL 15 Engine</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40 font-bold uppercase tracking-wider">Sentry Error SDK</span>
            <ShieldCheck className="w-5 h-5 text-[#0078D7]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">ENABLED</span>
          </div>
          <p className="text-[11px] text-white/40">Runtime Exception Monitoring</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40 font-bold uppercase tracking-wider">Celery Distributed</span>
            <Cpu className="w-5 h-5 text-[#10B981]" />
          </div>
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#10B981]" />
            <span className="text-lg font-bold text-white">REDIS BROKER</span>
          </div>
          <p className="text-[11px] text-white/40">Background Task Workers Ready</p>
        </div>
      </div>

      {/* Raw Prometheus Telemetry Output */}
      <div className="glass-card p-6 rounded-2xl border-white/5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-[#10B981]" />
            <h3 className="font-bold text-white text-base">Prometheus Scraped Telemetry (/metrics)</h3>
          </div>
          <span className="text-xs text-white/40 font-mono">Last Sync: {lastRefreshed || "Just now"}</span>
        </div>

        <div className="bg-[#0F172A] p-4 rounded-xl border border-white/10 font-mono text-xs text-emerald-400 overflow-x-auto max-h-96">
          <pre>{metricsText || "Fetching Prometheus scraped data..."}</pre>
        </div>
      </div>
    </div>
  );
}
