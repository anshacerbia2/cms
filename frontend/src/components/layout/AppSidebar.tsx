import {
  LayoutDashboard,
  Users,
  Package,
  Truck,
  UserCog,
  Briefcase,
  FileText,
  CreditCard,
  Wallet,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Database,
  ClipboardList,
  ArrowRightLeft,
  BarChart3,
  ArrowDownUp,
  FileBarChart,
  Repeat,
  PieChart,
  History,
  RefreshCw,
  ShoppingCart,
  ArrowDownRight,
  ArrowUpRight,
  TrendingDown,
} from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";
import { useAuthStore } from "@/store/authStore";
import { useNavigate, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Package,
  Truck,
  UserCog,
  Briefcase,
  FileText,
  CreditCard,
  Wallet,
  Landmark,
  Database,
  ClipboardList,
  ArrowRightLeft,
  BarChart3,
  ArrowDownUp,
  FileBarChart,
  Repeat,
  PieChart,
  History,
  RefreshCw,
  ShoppingCart,
  ArrowDownRight,
  ArrowUpRight,
  TrendingDown,
};

function SidebarNavItem({ icon: Icon, label, to, end = true }: { icon: LucideIcon; label: string; to: string; end?: boolean }) {
  const { isCollapsed } = useSidebar();

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center rounded-xl transition-all duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] group overflow-hidden relative w-full text-left select-none py-2",
          isActive
            ? "bg-slate-100 text-primary"
            : "text-muted-foreground hover:text-primary hover:bg-slate-100/50",
        )
      }
    >
      {({ isActive }) => (
        <>
          <div className="w-12 flex-shrink-0 flex justify-center items-center">
            <Icon
              size={18}
              className={cn(
                "transition-all duration-300",
                isActive ? "opacity-100 scale-110 text-primary" : "opacity-60 group-hover:opacity-100 scale-100",
              )}
            />
          </div>
          <span
            className={cn(
              "font-bold text-[10px] tracking-[0.15em] uppercase transition-all duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap overflow-hidden will-change-transform",
              isCollapsed
                ? "opacity-0 translate-x-4 invisible"
                : "opacity-100 translate-x-0 visible ml-0",
              isActive ? "text-primary" : "",
            )}
          >
            {label}
          </span>
          {/* Active Indicator */}
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-r-full group-hover:h-6 transition-all duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]" />
          )}
        </>
      )}
    </NavLink>
  );
}

export function AppSidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  console.log('Sidebar User Menus:', user?.menus);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col py-8 z-50 transition-all duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] select-none will-change-[width,transform]",
        isCollapsed
          ? "w-[240px] -translate-x-full lg:translate-x-0 lg:w-20"
          : "w-[240px] translate-x-0 lg:w-[240px] xl:w-[280px]",
      )}
    >
      {/* Internal Content Wrapper */}
      <div className="flex flex-col h-full w-full overflow-hidden">
        {/* Brand Logo */}
        <div
          className={cn(
            "mb-10 flex items-center transition-all duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] select-none px-4",
            isCollapsed ? "justify-center" : "justify-start",
          )}
        >
          <div className="flex items-center w-full">
            <div className={cn(
              "transition-all duration-500 flex items-center justify-center w-full overflow-hidden",
            )}>
              {isCollapsed ? (
                <img 
                  src="/images/logo-icon.png" 
                  alt="Icon" 
                  className="h-[calc(var(--spacing)*10)] w-auto animate-in fade-in zoom-in-75 duration-500 brightness-0"
                />
              ) : (
                <img 
                  src="/images/logo.png" 
                  alt="Logo" 
                  className="h-[calc(var(--spacing)*10)] w-auto object-contain animate-in fade-in slide-in-from-left-4 duration-500 brightness-0"
                />
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6 px-4 overflow-y-auto overflow-x-hidden no-scrollbar">
          {(user?.menus || []).map((section) => (
            <div key={section.group}>
              <div
                className={cn(
                  "text-[9px] font-bold text-primary/50 uppercase tracking-[0.25em] mb-2 transition-opacity duration-300 px-3 whitespace-nowrap",
                  isCollapsed ? "opacity-0" : "opacity-100",
                )}
              >
                {section.group}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <SidebarNavItem
                    key={`${section.group}-${item.title}`}
                    icon={iconMap[item.icon] || Landmark}
                    label={item.title}
                    to={item.url}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sign Out */}
        <div className="px-4 mt-4">
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="flex items-center rounded-xl w-full py-2 text-muted-foreground hover:text-primary hover:bg-muted/50 transition-all duration-300 group"
          >
            <div className="w-12 flex-shrink-0 flex justify-center items-center">
              <LogOut size={18} className="opacity-40 group-hover:opacity-100 transition-opacity" />
            </div>
            <span
              className={cn(
                "font-bold text-[10px] tracking-[0.15em] uppercase transition-all duration-300 whitespace-nowrap overflow-hidden",
                isCollapsed ? "opacity-0 invisible" : "opacity-100 visible",
              )}
            >
              Sign Out
            </span>
          </button>
        </div>
      </div>

      {/* Floating Toggle Button */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "absolute -right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-sidebar rounded-full flex items-center justify-center text-primary shadow-premium border border-sidebar-border transition-all duration-300 z-[60] group cursor-pointer",
          isCollapsed ? "max-lg:hidden" : "flex",
        )}
      >
        {isCollapsed ? (
          <ChevronRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
        ) : (
          <ChevronLeft size={16} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
        )}
      </button>
    </aside>
  );
}
