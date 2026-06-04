import { useAuth } from "@/lib/auth";
import { useGetDigitalIdStatus, useRequestDigitalId, getGetDigitalIdStatusQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, CheckCircle2, Clock, ShieldCheck, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function DigitalId() {
  const { user } = useAuth();
  const { data: status, isLoading, isError } = useGetDigitalIdStatus({
    query: { retry: false },
  });
  const requestMutation = useRequestDigitalId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDownloading, setIsDownloading] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    role: (user?.role === "dosen" || user?.role === "mahasiswa" ? user.role : "mahasiswa") as "dosen" | "mahasiswa",
    nimNip: "",
    passphrase: "",
    confirmPassphrase: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.passphrase) {
      toast({ title: "Error", description: "Passphrase wajib diisi", variant: "destructive" });
      return;
    }
    if (formData.passphrase !== formData.confirmPassphrase) {
      toast({ title: "Error", description: "Passphrase tidak cocok", variant: "destructive" });
      return;
    }

    requestMutation.mutate(
      { data: { name: formData.name, email: formData.email, role: formData.role, passphrase: formData.passphrase, nimNip: formData.nimNip || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Berhasil", description: "Permintaan Digital ID telah dikirim" });
          queryClient.invalidateQueries({ queryKey: getGetDigitalIdStatusQueryKey() });
        },
        onError: (err: unknown) => {
          const msg = (err as { data?: { error?: string } })?.data?.error ?? "Gagal mengirim permintaan Digital ID";
          toast({ title: "Gagal", description: msg, variant: "destructive" });
        },
      },
    );
  };

  const handleDownloadP12 = async () => {
    setIsDownloading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/digital-id/download", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Gagal mengunduh");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = response.headers.get("content-disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match ? match[1] : "digitalid.p12";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Gagal", description: "Tidak dapat mengunduh file P12.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasRequest = status && !isError;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Digital ID</h1>
        <p className="text-muted-foreground">Kelola identitas digital (Sertifikat Elektronik) Anda</p>
      </div>

      {hasRequest ? (
        <Card>
          <CardHeader>
            <CardTitle>Status Pengajuan</CardTitle>
            <CardDescription>Informasi terkini mengenai Digital ID Anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              className={`flex items-center gap-4 p-4 rounded-lg border ${
                status.status === "approved"
                  ? "bg-green-50 border-green-200"
                  : status.status === "rejected"
                    ? "bg-red-50 border-red-200"
                    : "bg-blue-50 border-blue-200"
              }`}
            >
              <div
                className={`p-3 rounded-full ${
                  status.status === "approved"
                    ? "bg-green-100 text-green-600"
                    : status.status === "rejected"
                      ? "bg-red-100 text-red-600"
                      : "bg-blue-100 text-blue-600"
                }`}
              >
                {status.status === "approved" ? (
                  <ShieldCheck size={24} />
                ) : status.status === "rejected" ? (
                  <ShieldAlert size={24} />
                ) : (
                  <Clock size={24} />
                )}
              </div>
              <div>
                <p className="font-semibold text-lg">
                  {status.status === "approved"
                    ? "Disetujui"
                    : status.status === "rejected"
                      ? "Ditolak"
                      : "Menunggu Persetujuan"}
                </p>
                <p className="text-sm text-gray-600">
                  {status.status === "approved"
                    ? "Digital ID Anda aktif dan siap digunakan."
                    : status.status === "rejected"
                      ? "Pengajuan Anda ditolak oleh Admin."
                      : "Pengajuan Anda sedang diproses oleh Admin."}
                </p>
                {status.rejectionReason && (
                  <p className="text-sm text-red-600 mt-1 font-medium">
                    Alasan: {status.rejectionReason}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Detail Pengajuan</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-1">Nama</p>
                  <p className="font-medium">{status.name}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-1">Peran</p>
                  <p className="font-medium capitalize">{status.role}</p>
                </div>
                {status.nimNip && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs mb-1">{status.role === "dosen" ? "NIP" : "NIM"}</p>
                    <p className="font-medium">{status.nimNip}</p>
                  </div>
                )}
                <div className={`bg-gray-50 rounded-lg p-3 ${status.nimNip ? "" : "col-span-2"}`}>
                  <p className="text-muted-foreground text-xs mb-1">Email</p>
                  <p className="font-medium">{status.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Progres Penerbitan</h3>
              <div className="space-y-2">
                {[
                  { done: status.isApproved, label: "Disetujui oleh Admin" },
                  { done: status.isReady, label: "Sertifikat digenerate oleh sistem" },
                  { done: status.isSent, label: "Sertifikat dikirim ke BSrE" },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {step.done ? (
                      <CheckCircle2 className="text-green-500 shrink-0" size={18} />
                    ) : (
                      <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300 shrink-0" />
                    )}
                    <span className={step.done ? "text-gray-900" : "text-gray-400"}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          {status.status === "approved" && (
            <CardFooter className="bg-gray-50 border-t flex justify-end p-4">
              <Button onClick={handleDownloadP12} disabled={isDownloading} className="gap-2">
                {isDownloading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Membuat P12...</>
                ) : (
                  <><Download size={16} /> Unduh Sertifikat P12</>
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Ajukan Digital ID</CardTitle>
            <CardDescription>
              Isi formulir berikut untuk mendapatkan Sertifikat Elektronik dari Universitas Lampung
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Unila</Label>
                <Input id="email" type="email" value={formData.email} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Peran</Label>
                <Select
                  value={formData.role}
                  onValueChange={(val: "dosen" | "mahasiswa") => setFormData({ ...formData, role: val })}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Pilih peran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dosen">Dosen</SelectItem>
                    <SelectItem value="mahasiswa">Mahasiswa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nimNip">{formData.role === "dosen" ? "NIP" : "NIM"}</Label>
                <Input
                  id="nimNip"
                  value={formData.nimNip}
                  onChange={(e) => setFormData({ ...formData, nimNip: e.target.value })}
                  placeholder={formData.role === "dosen" ? "Nomor Induk Pegawai" : "Nomor Induk Mahasiswa"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passphrase">Passphrase Sertifikat</Label>
                <Input
                  id="passphrase"
                  type="password"
                  value={formData.passphrase}
                  onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassphrase">Konfirmasi Passphrase</Label>
                <Input
                  id="confirmPassphrase"
                  type="password"
                  value={formData.confirmPassphrase}
                  onChange={(e) => setFormData({ ...formData, confirmPassphrase: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Kata sandi ini melindungi file .p12 Anda. Simpan dengan aman — tidak dapat dipulihkan jika lupa.
                </p>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button type="submit" disabled={requestMutation.isPending}>
                {requestMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengirim...</>
                ) : (
                  "Kirim Pengajuan"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  );
}
