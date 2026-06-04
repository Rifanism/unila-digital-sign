import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@workspace/api-client-react";
import { LayoutDashboard, ShieldAlert, FileSignature, LogOut, ShieldCheck } from "lucide-react";
import LogoUnila from "@assets/Logo_unila.png";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => logout(),
    });
  };

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/digital-ids", label: "Permintaan Digital ID", icon: ShieldAlert },
    { href: "/admin/sign-requests", label: "Permintaan Tanda Tangan", icon: FileSignature },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top header bar */}
      <header className="bg-[#1a3a6b] text-white h-14 flex items-center px-6 fixed inset-x-0 top-0 z-30 shadow-md">
        <div className="flex items-center gap-3 flex-1">
          <img src={LogoUnila} alt="Unila" className="h-8 w-auto" />
          <div className="border-l border-white/30 pl-3">
            <p className="font-bold text-sm leading-tight">Admin Panel</p>
            <p className="text-xs text-blue-200">Unila Digital Sign</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
            <ShieldCheck size={14} className="text-yellow-300" />
            <span className="text-xs font-medium">{user?.name}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 hover:text-white h-8 px-3 gap-1.5"
            onClick={handleLogout}
          >
            <LogOut size={14} />
            <span className="text-xs">Keluar</span>
          </Button>
        </div>
      </header>

      <div className="flex pt-14">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-200 fixed inset-y-0 top-14 shadow-sm">
          <div className="py-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">Menu Admin</p>
            <nav className="space-y-0.5 px-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href || location.startsWith(`${item.href}/`);
                return (
                  <Link key={item.href} href={item.href}>
                    <a
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-[#1a3a6b] text-white"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <Icon size={16} className={isActive ? "text-white" : "text-gray-400"} />
                      {item.label}
                    </a>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-56 p-6">
          <div className="max-w-5xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
