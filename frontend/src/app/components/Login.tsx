import { useState } from "react";
import { useNavigate } from "react-router";
import { Zap, Lock, Mail, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { auth } from "../../lib/auth";
import { api } from "../../lib/api";

export function Login() {
  const [username, setUsername] = useState("admin@leadgen.pro");
  const [password, setPassword] = useState("admin123");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await api.post("/auth/login", { username, password });
      auth.setToken(data.access_token);
      toast.success("Welcome back!", { description: "Logged in successfully." });
      navigate("/");
    } catch (error: any) {
      toast.error("Authentication Error", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0F172A] relative overflow-hidden font-inter">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#0078D7]/20 blur-[140px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#10B981]/15 blur-[140px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 glass-card border border-white/10 rounded-2xl relative z-10 mx-4"
      >
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0078D7] to-[#10B981] flex items-center justify-center shadow-lg mb-3">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            LeadGen Pro Enterprise
          </h1>
          <p className="text-sm text-white/50 mt-1">Sign in to access your B2B lead generation suite</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-white/60 font-medium mb-1 block">Email Address</label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full glow-input pl-10 text-sm"
                placeholder="admin@leadgen.pro"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/60 font-medium mb-1 block">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glow-input pl-10 text-sm"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full premium-btn mt-6 py-3 flex items-center justify-center gap-2 font-medium"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In to Platform"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-white/40">
          Default Dev Credentials: <span className="text-white/80 font-mono">admin@leadgen.pro / admin123</span>
        </div>
      </motion.div>
    </div>
  );
}
