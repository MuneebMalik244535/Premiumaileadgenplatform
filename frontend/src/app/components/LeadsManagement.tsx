import { useState, useEffect } from "react";
import { Search, Download, Mail, Filter, ChevronDown, Sparkles, ExternalLink, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { auth } from "../../lib/auth";
import { api } from "../../lib/api";

const industries = ["All Industries", "SaaS", "E-commerce", "Analytics", "Fashion", "Cloud Services", "FinTech", "EdTech", "HealthTech", "Retail Tech", "IoT"];

export function LeadsManagement() {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [selectedIndustry, setSelectedIndustry] = useState("All Industries");
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLead, setSelectedLead] = useState<number | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const data = await api.get("/leads");
      setLeads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const company = lead.name || lead.company || "";
    const email = lead.email || "";
    const location = lead.location || lead.address || "";
    
    const matchesSearch = company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesScore = lead.score >= minScore;
    const matchesIndustry = selectedIndustry === "All Industries" || (lead.industry && lead.industry === selectedIndustry);
    return matchesSearch && matchesScore && matchesIndustry;
  });

  const toggleLeadSelection = (id: number) => {
    setSelectedLeads(prev =>
      prev.includes(id) ? prev.filter(leadId => leadId !== id) : [...prev, id]
    );
  };

  const toggleAllLeads = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'score-high';
    if (score >= 40) return 'score-medium';
    return 'score-low';
  };

  const handleExport = () => {
    window.open("http://localhost:8000/api/download-report", "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Leads Management
        </h1>
        <p className="text-white/60">Manage and organize your generated leads</p>
      </motion.div>

      {/* Filters Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-card p-6"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads..."
                className="w-full glow-input pl-12"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-6 py-3 rounded-lg border border-white/20 hover:bg-white/5 transition-all flex items-center gap-2"
          >
            <Filter className="w-5 h-5" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Action Buttons */}
          <button 
            onClick={handleExport}
            className="premium-btn px-6 py-3 flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export PDF Report
          </button>
        </div>

        {/* Expandable Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden"
            >
              {/* Minimum Score Slider */}
              <div>
                <label className="text-sm text-white/70 mb-2 block">
                  Minimum Lead Score: {minScore}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0078D7] [&::-webkit-slider-thumb]:cursor-pointer"
                />
              </div>

              {/* Industry Filter */}
              <div>
                <label className="text-sm text-white/70 mb-2 block">Industry</label>
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="w-full glow-input cursor-pointer"
                >
                  {industries.map(industry => (
                    <option key={industry} value={industry} className="bg-[#0F2041]">
                      {industry}
                    </option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex flex-wrap gap-4 text-sm"
      >
        <div className="glass-card px-4 py-2">
          <span className="text-white/50">Total Leads:</span>
          <span className="ml-2 font-semibold">{filteredLeads.length}</span>
        </div>
        <div className="glass-card px-4 py-2">
          <span className="text-white/50">Avg Score:</span>
          <span className="ml-2 font-semibold">
            {filteredLeads.length > 0 
              ? (filteredLeads.reduce((acc, lead) => acc + lead.score, 0) / filteredLeads.length).toFixed(1)
              : "0.0"}
          </span>
        </div>
        <button 
          onClick={fetchLeads}
          className="text-white/50 hover:text-white transition-colors ml-auto flex items-center gap-2"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Refresh Data
        </button>
      </motion.div>

      {/* Leads Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="glass-card overflow-hidden"
      >
        {isLoading ? (
          <div className="overflow-x-auto p-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-sm font-semibold text-white/70">Company</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/70">Website</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/70">Email</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/70">Phone</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/70">Score</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((_, idx) => (
                  <tr key={idx} className="border-b border-white/5 h-[72px]">
                    <td className="p-4"><div className="skeleton w-32 h-5 mb-2"></div><div className="skeleton w-20 h-3"></div></td>
                    <td className="p-4"><div className="skeleton w-24 h-4"></div></td>
                    <td className="p-4"><div className="skeleton w-40 h-4"></div></td>
                    <td className="p-4"><div className="skeleton w-28 h-4"></div></td>
                    <td className="p-4"><div className="skeleton w-16 h-8 rounded-lg"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-sm font-semibold text-white/70">Company</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/70">Website</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/70">Email</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/70">Phone</th>
                  <th className="text-left p-4 text-sm font-semibold text-white/70">Score</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead, index) => (
                  <motion.tr
                    key={lead.id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="table-row cursor-pointer"
                    onClick={() => setSelectedLead(selectedLead === lead.id ? null : lead.id)}
                  >
                    <td className="p-4">
                      <div className="font-semibold">{lead.name || lead.company}</div>
                      <div className="text-xs text-white/50">{lead.industry || "General"}</div>
                    </td>
                    <td className="p-4">
                      <a 
                        href={lead.link || lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0078D7] hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {lead.link || lead.website}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="p-4 text-sm">{lead.email}</td>
                    <td className="p-4 text-sm">{lead.phone}</td>
                    <td className="p-4">
                      <span className={`score-badge ${getScoreColor(lead.score)}`}>
                        ⭐ {lead.score}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            {filteredLeads.length === 0 && (
              <div className="p-12 text-center">
                <Sparkles className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No leads found</h3>
                <p className="text-white/50">Try adjusting your filters or run a new search</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
