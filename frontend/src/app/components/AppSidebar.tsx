import { 
  LayoutDashboard, 
  Sparkles, 
  Users, 
  FileText, 
  Zap,
  Settings,
  HelpCircle,
  CreditCard,
  Activity,
  ShieldCheck,
  BarChart2
} from "lucide-react";
import { Link, useLocation } from "react-router";
import { auth } from "../../lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/search", label: "AI Search", icon: Sparkles },
  { path: "/leads", label: "Leads", icon: Users },
  { path: "/reports", label: "Reports", icon: FileText },
  { path: "/telemetry", label: "Telemetry", icon: Activity },
  { path: "/behavior", label: "User Analytics", icon: BarChart2 },
];

const secondaryItems = [
  { path: "/audit-logs", label: "Audit Logs", icon: ShieldCheck },
  { path: "/settings", label: "Settings", icon: Settings },
  { path: "/help", label: "Help Center", icon: HelpCircle },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-[#0F172A]">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0078D7] to-[#10B981] flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden">
            <span className="font-bold text-sm tracking-tight whitespace-nowrap">LeadGen Pro</span>
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Enterprise</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/30 px-2 py-4">Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.label}
                      className={`
                        transition-all duration-300
                        ${isActive 
                          ? 'bg-[#0078D7]/10 text-[#0078D7] shadow-[inset_0_0_0_1px_rgba(0,120,215,0.2)]' 
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                        }
                      `}
                    >
                      <Link to={item.path}>
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-white/30 px-2 py-4">Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton 
                    asChild
                    tooltip={item.label}
                    className="text-white/60 hover:text-white hover:bg-white/5"
                  >
                    <Link to={item.path}>
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="glass-card p-3 rounded-xl border-white/5 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Credits</span>
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#10B981]" />
              <span className="text-xs font-bold">2,450</span>
            </div>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#0078D7] to-[#10B981] w-[75%]" />
          </div>
          <button 
            onClick={() => {
              auth.clearToken();
              window.location.href = "/login";
            }}
            className="w-full mt-3 py-1.5 text-[10px] font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
          >
            SIGN OUT
          </button>
        </div>
        
        {/* Compact version for collapsed state */}
        <div className="hidden group-data-[collapsible=icon]:flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center border border-[#10B981]/20">
                <CreditCard className="w-4 h-4 text-[#10B981]" />
            </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
