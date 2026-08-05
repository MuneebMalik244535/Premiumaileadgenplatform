import { useState, useEffect, useRef } from "react";
import { Search, Sparkles, Loader2, CheckCircle, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLocation } from "react-router";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { auth } from "../../lib/auth";
import { api } from "../../lib/api";

export function AISearch() {
  const location = useLocation();
  const initialQuery = (location.state as any)?.query || "";
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedLead, setSelectedLead] = useState<number | null>(null);
  
  const ws = useRef<WebSocket | null>(null);

  // Auto-search if query came from dashboard
  useEffect(() => {
    if (initialQuery) {
      handleSearch();
    }
    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setShowResults(false);
    setLogs(["Queuing task..."]);
    setLeads([]);
    setSelectedLead(null);
    
    toast.info("Initializing AI Scraper...", { description: `Searching for: ${searchQuery}` });

    try {
      // 1. Get Task ID from API
      const { task_id } = await api.post("/scrape", { query: searchQuery });
      
      if (!task_id) {
        throw new Error("Failed to get task ID");
      }

      // 2. Connect to WebSocket to monitor this task
      const socket = new WebSocket(api.getWsUrl());
      ws.current = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: "monitor_task", task_id }));
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "log") {
          setLogs(prev => [...prev, data.message]);
        } else if (data.type === "status") {
          if (data.status === "FAILURE") {
            setLogs(prev => [...prev, "❌ Task failed. Please try again."]);
            setIsSearching(false);
            toast.error("Scraping task failed. Please try again.");
          }
        } else if (data.type === "complete") {
          setLeads(data.leads);
          setIsSearching(false);
          setShowResults(true);
          socket.close();
          
          if (data.leads && data.leads.length > 0) {
            toast.success(`Success! Found ${data.leads.length} leads.`);
            
            // Trigger Confetti Celebration!
            const duration = 3000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
            
            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function() {
              const timeLeft = animationEnd - Date.now();

              if (timeLeft <= 0) {
                return clearInterval(interval);
              }

              const particleCount = 50 * (timeLeft / duration);
              confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
              confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
            }, 250);
          } else {
            toast.warning("Task completed, but no leads were found.");
          }
        }
      };

      socket.onerror = () => {
        setLogs(prev => [...prev, "Error: Connection lost."]);
        setIsSearching(false);
        toast.error("WebSocket connection lost.");
      };

    } catch (error) {
      console.error("Search error:", error);
      setLogs(prev => [...prev, "Error: Could not start search."]);
      setIsSearching(false);
      toast.error("Could not start search. Ensure Backend is running.");
    }
  };

  const handleExport = async () => {
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
          AI-Powered Lead Search
        </h1>
        <p className="text-white/60">Use natural language to find your perfect leads</p>
      </motion.div>

      {/* Magic Search Bar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="glass-card p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0078D7] to-[#10B981] flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Magic Search
            </h2>
            <p className="text-sm text-white/50">Describe what you're looking for in plain English</p>
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g., Software companies in London..."
            className={`
              w-full glow-input text-lg
              ${isFocused && !isSearching ? 'pulse-border' : ''}
            `}
            disabled={isSearching}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="!absolute right-3 top-1/2 -translate-y-1/2 premium-btn px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </button>
        </div>
      </motion.div>

      {/* AI Analysis Panel */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-6 overflow-hidden"
          >
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-6 h-6 text-[#0078D7] animate-spin" />
              <h3 className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                AI Processing
              </h3>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {logs.map((log, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3"
                >
                  {index < logs.length - 1 ? (
                    <CheckCircle className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-[#0078D7] animate-spin flex-shrink-0" />
                  )}
                  <span className="text-sm text-white/80 font-mono">
                    {">"} {log}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Found {leads.length} Qualified Leads
              </h3>
              <button 
                onClick={handleExport}
                className="premium-btn px-6 py-2 flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                Export Report (PDF)
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {leads.map((lead, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="glass-card p-6 cursor-pointer"
                  onClick={() => setSelectedLead(selectedLead === index ? null : index)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-xl font-bold">{lead.name || lead.company}</h4>
                        <span className={`
                          score-badge
                          ${lead.score >= 70 ? 'score-high' : lead.score >= 40 ? 'score-medium' : 'score-low'}
                        `}>
                          ⭐ {lead.score}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm text-white/60">
                        <span>{lead.industry || "General"}</span>
                        <span>•</span>
                        <span>{lead.location || lead.address || "Unknown"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-white/50 mb-1">Website</p>
                      <a 
                        href={lead.link || lead.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-[#0078D7] hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {lead.link || lead.website}
                      </a>
                    </div>
                    <div>
                      <p className="text-xs text-white/50 mb-1">Email</p>
                      <p className="text-sm">{lead.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50 mb-1">Phone</p>
                      <p className="text-sm">{lead.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50 mb-1">Score</p>
                      <p className="text-sm font-bold">{lead.score}/100</p>
                    </div>
                  </div>

                  <AnimatePresence>
                    {selectedLead === index && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-white/10 pt-4 mt-4"
                      >
                        <div className="mb-4">
                          <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#0078D7]" />
                            Address:
                          </h5>
                          <p className="text-sm text-white/70">{lead.address || "N/A"}</p>
                        </div>
                        <div className="flex gap-3">
                          <button className="premium-btn px-4 py-2 flex-1">
                            Save Lead
                          </button>
                          <button className="px-4 py-2 flex-1 rounded-lg border border-white/20 hover:bg-white/5 transition-all">
                            Contact
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
