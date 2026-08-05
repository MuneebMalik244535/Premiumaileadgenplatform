import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  Globe, 
  User, 
  Clock, 
  Terminal,
  Filter
} from "lucide-react";
import { api } from "../../lib/api";

interface AuditLogItem {
  id: number;
  organization_id: number | null;
  user_email: string | null;
  action: string;
  resource: string;
  ip_address: string;
  user_agent: string;
  details: string;
  created_at: string;
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string>("ALL");

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const data = await api.get<AuditLogItem[]>("/audit-logs");
      setLogs(data);
    } catch (err: any) {
      console.error("Audit logs fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.action || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.user_email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.ip_address || "").includes(searchQuery) ||
      (log.resource || "").toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesAction = selectedAction === "ALL" || log.action === selectedAction;
    return matchesSearch && matchesAction;
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes("LOGIN") || action.includes("REGISTER")) return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (action.includes("SCRAPE") || action.includes("TRIGGER")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (action.includes("DELETE") || action.includes("EXCEEDED")) return "bg-red-500/10 text-red-400 border-red-500/20";
    return "bg-[#0078D7]/10 text-[#0078D7] border-[#0078D7]/20";
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-[#0078D7]" />
            SOC2 Security Audit Log Trail
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Immutable security event ledger recording all tenant data accesses and API operations.
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          disabled={loading}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/10 transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 text-[#0078D7] ${loading ? "animate-spin" : ""}`} />
          <span>Sync Audit Trail</span>
        </button>
      </div>

      {/* Search & Action Filters */}
      <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search action, email, IP, or resource..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0F172A] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#0078D7]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-white/40" />
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="bg-[#0F172A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0078D7]"
          >
            <option value="ALL">All Event Types</option>
            <option value="USER_LOGIN">USER_LOGIN</option>
            <option value="SCRAPE_TRIGGERED">SCRAPE_TRIGGERED</option>
            <option value="REPORT_GENERATED">REPORT_GENERATED</option>
            <option value="WEBHOOK_CREATED">WEBHOOK_CREATED</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-card rounded-2xl border-white/5 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-xs text-white/40">Fetching immutable audit logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-xs text-white/40">No matching audit logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-white/40 uppercase font-bold text-[10px] tracking-wider border-b border-white/5">
                <tr>
                  <th className="py-3.5 px-4">Event Action</th>
                  <th className="py-3.5 px-4">User Email</th>
                  <th className="py-3.5 px-4">Resource Endpoint</th>
                  <th className="py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-4">Timestamp (UTC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border ${getActionBadgeColor(log.action)}`}>
                        <Terminal className="w-3 h-3" />
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-white/40" />
                        <span>{log.user_email || "System / Anonymous"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-white/60">
                      {log.resource}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5 text-white/70">
                        <Globe className="w-3.5 h-3.5 text-[#0078D7]" />
                        <span>{log.ip_address}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-white/40 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
