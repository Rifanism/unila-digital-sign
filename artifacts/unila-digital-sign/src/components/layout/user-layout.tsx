import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useLogout, useGetDigitalIdStatus, useListSignRequests } from "@workspace/api-client-react";
import LogoUnila from "@assets/Logo_unila.png";
import {
  LayoutDashboard,
  FileText,
  Image as ImageIcon,
  Shield,
  LogOut,
  Settings,
  Key,
  ShieldCheck,
} from "lucide-react";

const LS_SEEN_DOCS = "seen_doc_notifications";

function getSeenDocIds(): number[] {
  try { return JSON.parse(localStorage.getItem(LS_SEEN_DOCS) ?? "[]"); }
  catch { return []; }
}

function markDocsSeen(ids: number[]) {
  const existing = getSeenDocIds();
  const merged = Array.from(new Set([...existing, ...ids]));
  localStorage.setItem(LS_SEEN_DOCS, JSON.stringify(merged));
}

export function UserLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const logoutMutation = useLogout();

  const { data: digitalId } = useGetDigitalIdStatus({ query: { retry: false } });
  const { data: signRequests } = useListSignRequests({ query: { retry: false } });

  const digitalIdStatus = (digitalId as { status?: string } | undefined)?.status;
  const showDigitalIdDot = digitalIdStatus !== "approved";

  const completedSignRequests = (signRequests ?? []).filter(
    (r) => r.status === "approved" || r.status === "rejected"
  );

  const seenIds = getSeenDocIds();
  const showDocDot = completedSignRequests.some((r) => !seenIds.includes(r.id));

  useEffect(() => {
    if (location === "/documents" && completedSignRequests.length > 0) {
      markDocsSeen(completedSignRequests.map((r) => r.id));
    }
  }, [location, completedSignRequests]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, { onSuccess: () => logout() });
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/digital-id", label: "Digital ID", icon: Shield, dot: showDigitalIdDot ? "permanent" as const : null },
    { href: "/certificate", label: "Sertifikat", icon: Key },
    { href: "/signature", label: "Tanda Tangan", icon: ImageIcon },
    { href: "/documents", label: "Dokumen", icon: FileText, dot: showDocDot ? "seen" as const : null },
    { href: "/verify", label: "Verifikasi", icon: ShieldCheck },
    { href: "/settings", label: "Pengaturan", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <img src={LogoUnila} alt="Unila" className="h-8 w-auto" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-gray-900 leading-tight">Unila Digital Sign</h1>
            <p className="text-xs text-gray-500">Universitas Lampung</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || location.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-primary" : "text-gray-400"} />
                  <span className="flex-1">{item.label}</span>
                  {item.dot && (
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
              {user?.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
            onClick={handleLogout}
          >
            <LogOut size={16} className="mr-2" />
            Keluar
          </Button>
        </div>
      </aside>

      <main className="flex-1 ml-64">
        <div className="max-w-6xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
