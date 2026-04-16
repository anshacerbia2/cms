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
} from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";
import { useAuthStore } from "@/store/authStore";
import { useNavigate, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const navigation = [
  { group: "Overview", items: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  ]},
  { group: "Master Data", items: [
    { title: "Customers", url: "/customers", icon: Users },
    { title: "Suppliers", url: "/suppliers", icon: Truck },
    { title: "Products", url: "/products", icon: Package },
    { title: "Bank Settings", url: "/banks", icon: Landmark },
    { title: "Staff", url: "/users", icon: UserCog },
  ]},
  { group: "Finance", items: [
    { title: "Invoices", url: "/invoices", icon: FileText },
    { title: "Receive Vouchers", url: "/rvs", icon: CreditCard },
    { title: "Payment Vouchers", url: "/pvs", icon: Wallet },
    { title: "Financial Reports", url: "/finance", icon: Landmark },
  ]},
  { group: "Operations", items: [
    { title: "Projects", url: "/projects", icon: Briefcase },
  ]},
];

function SidebarNavItem({ icon: Icon, label, to }: { icon: LucideIcon; label: string; to: string }) {
  const { isCollapsed } = useSidebar();

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center rounded-xl transition-all duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] group overflow-hidden relative w-full text-left select-none py-3",
          isActive
            ? "bg-white/10 text-white shadow-sm"
            : "text-white/40 hover:text-white hover:bg-white/5",
        )
      }
    >
      {({ isActive }) => (
        <>
          <div className="w-12 flex-shrink-0 flex justify-center items-center">
            <Icon
              size={20}
              className={cn(
                "transition-all duration-300",
                isActive ? "opacity-100" : "opacity-50 group-hover:opacity-100",
              )}
            />
          </div>
          <span
            className={cn(
              "font-extrabold text-[11px] tracking-[0.15em] uppercase transition-all duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] whitespace-nowrap overflow-hidden will-change-transform",
              isCollapsed
                ? "opacity-0 translate-x-4 invisible"
                : "opacity-100 translate-x-0 visible ml-0",
              isActive ? "text-white" : "",
            )}
          >
            {label}
          </span>
          {/* Active Indicator */}
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-primary rounded-r-full group-hover:h-8 transition-all duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]" />
          )}
        </>
      )}
    </NavLink>
  );
}

export function AppSidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen sidebar-gradient flex flex-col py-8 z-50 shadow-premium transition-all duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] select-none will-change-[width,transform]",
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
            "mb-14 flex items-center transition-all duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] select-none px-4",
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
                  className="h-[calc(var(--spacing)*10)] w-auto animate-in fade-in zoom-in-75 duration-500"
                />
              ) : (
                <img 
                  src="/images/logo.png" 
                  alt="Logo" 
                  className="h-[calc(var(--spacing)*10)] w-auto object-contain animate-in fade-in slide-in-from-left-4 duration-500"
                />
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6 px-4 overflow-y-auto overflow-x-hidden">
          {navigation.map((section) => (
            <div key={section.group}>
              <div
                className={cn(
                  "text-[9px] font-extrabold text-white/20 uppercase tracking-[0.25em] mb-3 transition-opacity duration-300 px-3 whitespace-nowrap",
                  isCollapsed ? "opacity-0" : "opacity-100",
                )}
              >
                {section.group}
              </div>
              <div className="space-y-1.5">
                {section.items.map((item) => (
                  <SidebarNavItem
                    key={item.url}
                    icon={item.icon}
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
            className="flex items-center rounded-xl w-full py-3 text-white/30 hover:text-white hover:bg-white/5 transition-all duration-300 group"
          >
            <div className="w-12 flex-shrink-0 flex justify-center items-center">
              <LogOut size={20} className="opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
            <span
              className={cn(
                "font-extrabold text-[11px] tracking-[0.15em] uppercase transition-all duration-300 whitespace-nowrap overflow-hidden",
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
          "absolute -right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-sidebar rounded-full flex items-center justify-center text-white shadow-premium border border-white/10 transition-all duration-300 z-[60] group cursor-pointer",
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
