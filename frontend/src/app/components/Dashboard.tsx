import { TrendingUp, Users, Zap, Wallet, Search, Activity } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from "motion/react";
import { useState } from "react";
import { useNavigate } from "react-router";

const statsData = [
  { 
    label: "Total Leads Generated", 
    value: "12,847", 
    change: "+12.5%", 
    icon: Users,
    gradient: "from-[#0078D7] to-[#0056a6]"
  },
  { 
    label: "Average Lead Score", 
    value: "76.2", 
    change: "+8.3%", 
    icon: TrendingUp,
    gradient: "from-[#10B981] to-[#059669]"
  },
  { 
    label: "Active Scrapes", 
    value: "23", 
    change: "+5", 
    icon: Activity,
    gradient: "from-[#8B5CF6] to-[#6D28D9]"
  },
  { 
    label: "Credits Remaining", 
    value: "2,450", 
    change: "-230", 
    icon: Wallet,
    gradient: "from-[#F59E0B] to-[#D97706]"
  },
];

const chartData = [
  { date: 'Mar 7', leads: 420 },
  { date: 'Mar 14', leads: 580 },
  { date: 'Mar 21', leads: 750 },
  { date: 'Mar 28', leads: 690 },
  { date: 'Apr 4', leads: 890 },
  { date: 'Apr 11', leads: 1100 },
  { date: 'Apr 18', leads: 980 },
];

const recentActivity = [
  { company: "TechFlow Solutions", score: 92, time: "2 min ago", industry: "SaaS" },
  { company: "GreenLeaf Organics", score: 78, time: "5 min ago", industry: "E-commerce" },
  { company: "UrbanStyle Co", score: 85, time: "12 min ago", industry: "Fashion" },
  { company: "DataStream Analytics", score: 67, time: "18 min ago", industry: "Analytics" },
  { company: "CloudNine Hosting", score: 91, time: "25 min ago", industry: "Cloud Services" },
];

export function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate('/search', { state: { query: searchQuery } });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Welcome Back 👋
        </h1>
        <p className="text-white/60">Here's what's happening with your leads today</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card p-6 relative overflow-hidden group cursor-pointer"
            >
              {/* Background Glow */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity duration-500`} />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className={`text-sm font-semibold px-2 py-1 rounded-md ${
                    stat.change.startsWith('+') ? 'text-[#10B981] bg-[#10B981]/10' : 'text-[#EF4444] bg-[#EF4444]/10'
                  }`}>
                    {stat.change}
                  </span>
                </div>
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-white/50">{stat.label}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Search Widget */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="glass-card p-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-6 h-6 text-[#0078D7]" />
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Quick AI Search
          </h2>
        </div>
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Find eCommerce brands in Dubai selling sustainable products..."
            className={`
              w-full glow-input text-lg
              ${isFocused ? 'pulse-border' : ''}
            `}
          />
          <button
            type="submit"
            className="!absolute right-3 top-1/2 -translate-y-1/2 premium-btn px-6 py-2"
          >
            <Search className="w-5 h-5" />
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-sm text-white/50">Try:</span>
          {["SaaS companies in San Francisco", "E-commerce stores in UK", "AI startups Series A+"].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setSearchQuery(suggestion)}
              className="text-sm px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all border border-white/10 hover:border-[#0078D7]/50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Analytics Chart and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analytics Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="lg:col-span-2 glass-card p-6"
        >
          <h3 className="text-xl font-bold mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Lead Generation - Last 30 Days
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0078D7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0078D7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="date" 
                stroke="rgba(255,255,255,0.3)"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.3)"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(15, 32, 65, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="leads" 
                stroke="#0078D7" 
                strokeWidth={3}
                fill="url(#colorLeads)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="glass-card p-6"
        >
          <h3 className="text-xl font-bold mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Recent Leads
          </h3>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                className="p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 hover:border-[#0078D7]/30 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{activity.company}</div>
                    <div className="text-xs text-white/50">{activity.industry}</div>
                  </div>
                  <span className={`
                    score-badge text-xs px-2 py-1
                    ${activity.score >= 80 ? 'score-high' : activity.score >= 60 ? 'score-medium' : 'score-low'}
                  `}>
                    {activity.score}
                  </span>
                </div>
                <div className="text-xs text-white/40">{activity.time}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
