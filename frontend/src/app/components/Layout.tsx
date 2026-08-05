import { Outlet } from "react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarInset } from "./ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopNav } from "./TopNav";

export function Layout() {
  // Create floating particles
  useEffect(() => {
    const particles: HTMLDivElement[] = [];
    for (let i = 0; i < 15; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 20}s`;
      particle.style.animationDuration = `${15 + Math.random() * 10}s`;
      document.body.appendChild(particle);
      particles.push(particle);
    }
    return () => {
      particles.forEach(p => p.remove());
    };
  }, []);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen relative flex w-full bg-[#0F172A] text-slate-50 overflow-hidden font-inter tracking-tight">
        {/* Animated Background Layers */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#0078D7]/10 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#10B981]/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="animated-bg opacity-30" />
        </div>
        
        <AppSidebar />
        
        <SidebarInset className="relative z-10 flex flex-col bg-transparent overflow-y-auto">
          <TopNav />
          
          <main className="flex-1 p-6 md:p-8 xl:p-10 max-w-[1600px] mx-auto w-full">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
              <Outlet />
            </div>
          </main>
          
          <footer className="px-6 py-6 border-t border-white/5 text-[10px] text-white/20 font-medium tracking-[0.2em] flex justify-between items-center bg-[#0F172A]/30 backdrop-blur-sm">
            <span>DIGITAL LEADGEN PRO V2.0</span>
            <div className="flex gap-6">
              <span className="hover:text-white/40 cursor-pointer transition-colors">SYSTEM STATUS: OPTIMAL</span>
              <span className="hover:text-white/40 cursor-pointer transition-colors">ENGINE: AI-NLP-01</span>
            </div>
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

