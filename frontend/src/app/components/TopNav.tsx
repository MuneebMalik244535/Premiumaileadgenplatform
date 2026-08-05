import { SidebarTrigger } from "./ui/sidebar";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "./ui/breadcrumb";
import { useLocation } from "react-router";
import { Bell, Search, UserCircle } from "lucide-react";

export function TopNav() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-4 border-b border-white/5 bg-[#0F172A]/50 backdrop-blur-xl sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1 text-white/60 hover:text-white" />
        <div className="h-4 w-[1px] bg-white/10 mx-2" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="text-white/40 hover:text-[#0078D7] transition-colors">
                Platform
              </BreadcrumbLink>
            </BreadcrumbItem>
            {pathnames.length > 0 && <BreadcrumbSeparator className="text-white/20" />}
            {pathnames.map((name, index) => {
              const isLast = index === pathnames.length - 1;
              const label = name.charAt(0) + name.slice(1);
              return (
                <div key={name} className="flex items-center gap-2">
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="text-[#0078D7] font-semibold uppercase tracking-wider text-[10px]">
                        {label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={`/${name}`} className="text-white/40 hover:text-white">
                        {label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator className="text-white/20" />}
                </div>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative group hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-[#0078D7] transition-colors" />
          <input 
            type="text" 
            placeholder="Search commands..." 
            className="bg-white/5 border border-white/5 rounded-full py-1.5 pl-10 pr-4 text-xs w-64 focus:outline-none focus:ring-1 focus:ring-[#0078D7]/30 transition-all"
          />
        </div>
        <button className="p-2 rounded-full hover:bg-white/5 text-white/60 hover:text-white transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#0078D7] rounded-full border-2 border-[#0F172A]" />
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-white/10">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white leading-tight">Zain Malik</p>
            <p className="text-[10px] text-[#10B981] font-medium leading-tight">Pro Plan</p>
          </div>
          <button className="w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors overflow-hidden">
            <UserCircle className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  );
}
