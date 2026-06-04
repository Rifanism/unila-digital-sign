import { useGetAdminDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, ShieldCheck, FileSignature, Activity, ArrowRight, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a3a6b]" />
      </div>
    );
  }

  const pendingDigitalIds = stats?.pendingDigitalIdRequests ?? 0;
  const pendingSignRequests = stats?.pendingSignRequests ?? 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
        <div className="bg-[#1a3a6b]/10 p-3 rounded-xl">
          <ShieldCheck className="h-8 w-8 text-[#1a3a6b]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Administrator</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Kelola persetujuan Digital ID dan permintaan tanda tangan dokumen
          </p>
        </div>
      </div>

      {/* Pending Actions — most important for admin */}
      {(pendingDigitalIds > 0 || pendingSignRequests > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <Clock size={16} /> Membutuhkan Tindakan Anda
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {pendingDigitalIds > 0 && (
              <Link href="/admin/digital-ids">
                <a className="flex items-center justify-between bg-white border border-amber-200 rounded-lg px-4 py-3 hover:bg-amber-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded-md">
                      <ShieldCheck size={18} className="text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {pendingDigitalIds} Permintaan Digital ID
                      </p>
                      <p className="text-xs text-gray-500">Menunggu persetujuan</p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-gray-400" />
                </a>
              </Link>
            )}
            {pendingSignRequests > 0 && (
              <Link href="/admin/sign-requests">
                <a className="flex items-center justify-between bg-white border border-amber-200 rounded-lg px-4 py-3 hover:bg-amber-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-md">
                      <FileSignature size={18} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {pendingSignRequests} Permintaan Tanda Tangan
                      </p>
                      <p className="text-xs text-gray-500">Menunggu proses</p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-gray-400" />
                </a>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Pengguna",
            value: stats?.totalUsers ?? 0,
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Digital ID Aktif",
            value: stats?.approvedDigitalIds ?? 0,
            icon: CheckCircle2,
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "Pending Digital ID",
            value: pendingDigitalIds,
            icon: ShieldCheck,
            color: "text-orange-600",
            bg: "bg-orange-50",
          },
          {
            label: "Pending Tanda Tangan",
            value: pendingSignRequests,
            icon: FileSignature,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border border-gray-200">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`${s.bg} p-2 rounded-lg`}>
                    <Icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick access + recent activity */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-base">Akses Cepat</CardTitle>
            <CardDescription>Navigasi ke halaman pengelolaan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/digital-ids">
              <a className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-[#1a3a6b]/30 hover:bg-[#1a3a6b]/5 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-2 rounded-md">
                    <ShieldCheck size={16} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Permintaan Digital ID</p>
                    <p className="text-xs text-gray-400">Setujui atau tolak pengajuan sertifikat</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-[#1a3a6b] transition-colors" />
              </a>
            </Link>
            <Link href="/admin/sign-requests">
              <a className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-[#1a3a6b]/30 hover:bg-[#1a3a6b]/5 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-2 rounded-md">
                    <FileSignature size={16} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Permintaan Tanda Tangan</p>
                    <p className="text-xs text-gray-400">Proses atau tolak pengajuan TTD</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-[#1a3a6b] transition-colors" />
              </a>
            </Link>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity size={16} className="text-gray-400" />
              Aktivitas Terkini
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivity.slice(0, 5).map((act) => (
                  <div key={act.id} className="flex items-start gap-3">
                    <div className="mt-0.5 bg-gray-100 p-1.5 rounded-full shrink-0">
                      <Activity size={12} className="text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 leading-snug">{act.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(act.createdAt).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <Activity size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Belum ada aktivitas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
