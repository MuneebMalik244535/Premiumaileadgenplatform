import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Webhook, 
  Plus, 
  Trash2, 
  Key, 
  CheckCircle2, 
  ShieldAlert, 
  ExternalLink,
  Send
} from "lucide-react";
import { api } from "../../lib/api";

interface WebhookItem {
  id: number;
  url: string;
  secret: string;
  events: string;
  created_at: string;
}

export function Settings() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [newEvent, setNewEvent] = useState("lead.qualified");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const data = await api.get<WebhookItem[]>("/webhooks");
      setWebhooks(data);
    } catch (err: any) {
      console.error("Error fetching webhooks:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    try {
      setIsSubmitting(true);
      const created = await api.post<WebhookItem>("/webhooks", {
        url: newUrl,
        events: newEvent,
      });
      setWebhooks([created, ...webhooks]);
      setNewUrl("");
      setNotification({ message: "Webhook subscription created successfully with HMAC signature key!", type: "success" });
    } catch (err: any) {
      setNotification({ message: err.message || "Failed to add webhook", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWebhook = async (id: number) => {
    try {
      await api.delete(`/webhooks/${id}`);
      setWebhooks(webhooks.filter((w) => w.id !== id));
      setNotification({ message: "Webhook deleted successfully", type: "success" });
    } catch (err: any) {
      setNotification({ message: err.message || "Failed to delete webhook", type: "error" });
    }
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
          <Building2 className="w-7 h-7 text-[#0078D7]" />
          Organization & Developer Settings
        </h1>
        <p className="text-sm text-white/50 mt-1">
          Manage multi-tenant team access, webhook dispatchers, and API integrations.
        </p>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border ${
            notification.type === "success"
              ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          <div className="flex items-center gap-3">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs opacity-60 hover:opacity-100 uppercase font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Organization Info Card */}
        <div className="lg:col-span-1 glass-card p-6 rounded-2xl border-white/5 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/5">
            <div className="w-10 h-10 rounded-xl bg-[#0078D7]/10 flex items-center justify-center border border-[#0078D7]/20">
              <Building2 className="w-5 h-5 text-[#0078D7]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Tenant Organization</h3>
              <p className="text-xs text-white/40">SaaS Data Isolation Active</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-white/40 font-bold uppercase tracking-wider block mb-1">Organization Name</label>
              <div className="bg-white/5 px-3 py-2 rounded-lg text-white font-medium border border-white/5">
                Enterprise Production Workspace
              </div>
            </div>
            <div>
              <label className="text-white/40 font-bold uppercase tracking-wider block mb-1">Tenant ID Scoping</label>
              <div className="bg-white/5 px-3 py-2 rounded-lg text-white/70 font-mono text-[11px] border border-white/5">
                org_tenant_isolated_rls_active
              </div>
            </div>
            <div>
              <label className="text-white/40 font-bold uppercase tracking-wider block mb-1">API Authentication</label>
              <div className="flex items-center gap-2 bg-[#10B981]/5 px-3 py-2 rounded-lg text-[#10B981] border border-[#10B981]/20 font-mono text-[11px]">
                <Key className="w-4 h-4" />
                <span>JWT Bearer (256-bit PBKDF2)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Webhooks Section */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border-white/5 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center border border-[#10B981]/20">
                <Webhook className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Real-Time Webhooks</h3>
                <p className="text-xs text-white/40">HMAC-SHA256 Signed Event Dispatcher</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
              {webhooks.length} Active
            </span>
          </div>

          {/* Add Webhook Form */}
          <form onSubmit={handleAddWebhook} className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#0078D7]" /> Add New Webhook Endpoint
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <input
                  type="url"
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#0078D7]"
                  required
                />
              </div>
              <div>
                <select
                  value={newEvent}
                  onChange={(e) => setNewEvent(e.target.value)}
                  className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#0078D7]"
                >
                  <option value="lead.qualified">lead.qualified</option>
                  <option value="task.completed">task.completed</option>
                  <option value="*">All Events (*)</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-[#0078D7] to-[#10B981] text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-[#0078D7]/20"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? "Registering..." : "Register Webhook"}
            </button>
          </form>

          {/* Webhooks Table */}
          {loading ? (
            <div className="text-center py-8 text-xs text-white/40">Loading Webhooks...</div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8 text-xs text-white/40 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
              No webhook endpoints registered yet. Add a Zapier / HubSpot URL above!
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-white truncate max-w-md">
                        {sub.url}
                      </span>
                      <a href={sub.url} target="_blank" rel="noreferrer" className="text-white/30 hover:text-white">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-white/40">Event: <strong className="text-[#10B981]">{sub.events}</strong></span>
                      <span className="text-white/30">•</span>
                      <span className="text-white/40 font-mono">Secret: <code className="text-white/60">{sub.secret.slice(0, 14)}...</code></span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteWebhook(sub.id)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/20 self-start md:self-auto"
                    title="Delete Webhook"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
