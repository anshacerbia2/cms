import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { Bell, Search, Menu, KeyRound, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChangeOwnPasswordDialog } from "@/features/auth/components/ChangeOwnPasswordDialog";

function Header() {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <>
    <header
      style={{
        left: undefined, // controlled by className below
      }}
      className={cn(
        "fixed top-0 right-0 h-20 bg-background/80 backdrop-blur-xl z-40 border-b border-primary/10 transition-all duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]",
        // Mobile: left-0 (full width, sidebar slides off-screen)
        // Desktop: left offset matches sidebar width
        isCollapsed
          ? "left-0 lg:left-20"
          : "left-0 lg:left-[240px] xl:left-[280px]",
      )}
    >
      <div className="h-full px-4 md:px-10 flex justify-between items-center">
        {/* Left Side */}
        <div className="flex items-center gap-4 md:gap-8">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-xl text-primary hover:bg-muted transition-all active:scale-95"
          >
            <Menu size={24} />
          </button>

          <div className="relative hidden sm:block">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-muted-foreground">
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Search resource..."
              className="bg-muted border border-primary/5 rounded-full py-2.5 pl-11 pr-6 text-[13px] w-72 focus:bg-white focus:border-primary/10 transition-all duration-300 outline-none placeholder:text-muted-foreground font-medium text-foreground"
            />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-5">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[9px] font-extrabold text-muted-foreground tracking-[0.2em] uppercase mb-0.5">
              Access Level
            </span>
            <span className="text-[11px] font-extrabold text-primary tracking-tight uppercase">
              {user?.role || "Administrator"}
            </span>
          </div>

          <div className="flex gap-1.5 items-center">
            <button className="p-2.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-primary transition-all duration-200 relative group active:scale-95 shadow-sm border border-border">
              <Bell size={18} className="group-hover:rotate-6 transition-transform" />
              <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-sidebar-primary rounded-full border border-background shadow-sm" />
            </button>
          </div>

          <div className="flex items-center gap-3 pl-4 border-l border-primary/5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-sm shadow-sm ring-2 ring-transparent hover:ring-primary/10 transition-all duration-200 cursor-pointer">
                  {user?.name?.charAt(0) || "U"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-premium border-primary/10 p-1 bg-white">
                <DropdownMenuLabel className="px-3 py-2">
                  <div className="text-[13px] font-bold text-primary truncate">{user?.name}</div>
                  <div className="text-[11px] font-medium text-muted-foreground truncate">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setPasswordOpen(true)}
                  className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground focus:text-primary"
                >
                  <KeyRound size={14} />
                  Ubah Password
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => { logout(); navigate("/login"); }}
                  className="gap-2 px-3 py-2.5 rounded-lg cursor-pointer font-bold text-xs uppercase tracking-wider text-muted-foreground focus:text-primary"
                >
                  <LogOut size={14} />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
    <ChangeOwnPasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  );
}

function LayoutContent() {
  const { isCollapsed, closeSidebar } = useSidebar();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Sidebar - fixed positioned */}
      <AppSidebar />

      {/* Main Content Area - uses margin-left to sit next to sidebar */}
      <div
        className={cn(
          "min-h-screen flex flex-col transition-all duration-300 [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]",
          isCollapsed
            ? "ml-0 lg:ml-20"
            : "ml-0 lg:ml-[240px] xl:ml-[280px]",
        )}
      >
        <Header />

        <main className="mt-20 py-6 md:py-10 flex-1 flex flex-col">
          <div className="flex-1 px-6 md:px-12">
            <div className="w-full">
              <Outlet />
            </div>
          </div>
        </main>

        <footer className="py-6 px-6 md:px-12 border-t border-primary/10 flex justify-between items-center text-muted-foreground/30">
          <p className="text-[9px] font-bold tracking-[0.3em] uppercase">
            © 2026 Panconvince • CMS Enterprise v1.0.0
          </p>
        </footer>
      </div>

      {/* Mobile Backdrop */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => closeSidebar()}
        />
      )}
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
}
