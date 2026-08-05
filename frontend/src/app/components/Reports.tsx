import { useState, useEffect } from "react";
import { FileText, Download, Share2, Calendar, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { auth } from "../../lib/auth";
import { api, API_BASE_URL } from "../../lib/api";

const reportTypes = ["All Types", "Monthly", "Quarterly", "Industry", "Custom"];

export function Reports() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState("All Types");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const data = await api.get("/reports");
      setReports(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      await api.post("/reports/generate?title=Lead%20Generation%20Summary&report_type=Custom");
      toast.success("Report Generated!", { description: "PDF report has been created successfully." });
      fetchReports();
    } catch (error: any) {
      toast.error("Generation Failed", { description: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = () => {
    const token = auth.getToken();
    const downloadUrl = `${API_BASE_URL}/download-report${token ? `?token=${token}` : ""}`;
    window.open(downloadUrl, "_blank");
  };

  const filteredReports = reports.filter(report => {
    const matchesType = selectedType === "All Types" || report.report_type === selectedType;
    const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Reports & Export History
        </h1>
        <p className="text-white/60">Access and manage your generated AI lead reports</p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-card p-6"
      >
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports..."
              className="w-full glow-input"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="glow-input cursor-pointer min-w-[200px]"
          >
            {reportTypes.map(type => (
              <option key={type} value={type} className="bg-[#0F2041]">
                {type}
              </option>
            ))}
          </select>

          {/* Generate New Report Button */}
          <button 
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="premium-btn px-6 py-3 flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
            Generate New
          </button>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Reports", value: reports.length, icon: FileText },
          { label: "Total Leads Exported", value: reports.reduce((acc, r) => acc + (r.leads_count || 0), 0).toLocaleString(), icon: TrendingUp },
          { label: "Avg Score", value: reports.length > 0 ? (reports.reduce((acc, r) => acc + (r.avg_score || 0), 0) / reports.length).toFixed(1) : "0.0", icon: TrendingUp },
          { label: "Latest Generation", value: reports.length > 0 ? new Date(reports[0].created_at).toLocaleDateString() : "N/A", icon: Calendar }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.05 }}
              className="glass-card p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0078D7] to-[#10B981] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
              </div>
              <div className="text-sm text-white/50">{stat.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Reports Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="glass-card p-6 h-64 skeleton"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredReports.map((report, index) => (
            <motion.div
              key={report.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.05 }}
              className="report-card glass-card p-6 cursor-pointer group"
            >
              {/* Thumbnail */}
              <div className="w-full aspect-square bg-gradient-to-br from-[#0078D7]/20 to-[#10B981]/20 rounded-xl mb-4 flex items-center justify-center text-6xl relative overflow-hidden">
                <span className="relative z-10">📄</span>
              </div>

              {/* Report Info */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold mb-1 line-clamp-2 group-hover:text-[#0078D7] transition-colors">
                    {report.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <Calendar className="w-3 h-3" />
                    {new Date(report.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between py-3 border-t border-b border-white/10">
                  <div>
                    <div className="text-sm text-white/50">Leads</div>
                    <div className="font-semibold">{report.leads_count}</div>
                  </div>
                  <div>
                    <div className="text-sm text-white/50">Avg Score</div>
                    <div className="font-semibold">{report.avg_score}</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={handleDownloadReport}
                    className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-[#0078D7] to-[#0056a6] hover:shadow-lg hover:shadow-[#0078D7]/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm font-medium">Download</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredReports.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <FileText className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No reports found</h3>
          <p className="text-white/50 mb-6">Generate your first PDF report from current database leads</p>
          <button 
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="premium-btn px-6 py-3 inline-flex items-center gap-2"
          >
            <FileText className="w-5 h-5" />
            Generate Your First Report
          </button>
        </motion.div>
      )}
    </div>
  );
}
