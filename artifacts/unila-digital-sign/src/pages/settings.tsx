import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { User, ShieldCheck, ShieldAlert, RefreshCw, Loader2, Lock } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [resetting, setResetting] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSetupOtp = () => {
    setLocation("/setup-otp");
  };

  const handleResetOtp = async () => {
    if (!confirm("Reset OTP? Anda harus setup ulang Google Authenticator setelah ini.")) return;
    setResetting(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/otp/disable", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      await queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      toast({ title: "OTP Direset", description: "Silakan setup OTP baru." });
      setLocation("/setup-otp");
    } catch {
      toast({ title: "Gagal", description: "Tidak dapat mereset OTP.", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Gagal", description: "Password baru dan konfirmasi tidak cocok.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Gagal", description: "Password baru minimal 6 karakter.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword, newPassword, otpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengubah password");
      toast({ title: "Berhasil", description: "Password berhasil diubah." });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOtpCode("");
    } catch (err) {
      toast({
        title: "Gagal",
        description: err instanceof Error ? err.message : "Tidak dapat mengubah password.",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan Akun</h1>
        <p className="text-muted-foreground">Kelola profil dan keamanan akun Anda.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-400" /> Informasi Profil
          </CardTitle>
          <CardDescription>Data akun Anda dari sistem institusi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nama Lengkap</Label>
            <Input value={user?.name || ""} disabled className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label>Email Institusi</Label>
            <Input value={user?.email || ""} disabled className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label>Peran</Label>
            <Input value={(user?.role || "").charAt(0).toUpperCase() + (user?.role || "").slice(1)} disabled className="bg-gray-50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-gray-400" /> Ubah Kata Sandi
          </CardTitle>
          <CardDescription>Konfirmasi dengan password lama dan kode OTP dari Google Authenticator.</CardDescription>
        </CardHeader>
        <CardContent>
          {!user?.otpEnabled ? (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-900">OTP diperlukan</p>
                <p className="text-xs text-orange-700 mt-1">
                  Aktifkan Two-Factor Authentication (OTP) terlebih dahulu sebelum dapat mengubah password.
                </p>
                <Button size="sm" className="mt-3" onClick={handleSetupOtp}>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Setup OTP Sekarang
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old-password">Password Lama</Label>
                <Input
                  id="old-password"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Masukkan password lama"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Password Baru</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Konfirmasi Password Baru</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp-code">Kode OTP</Label>
                <Input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="6 digit dari Google Authenticator"
                  required
                />
              </div>
              <Button type="submit" disabled={changingPassword} className="w-full sm:w-auto">
                {changingPassword ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
                ) : (
                  <><Lock className="mr-2 h-4 w-4" /> Ubah Password</>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-gray-400" /> Two-Factor Authentication (OTP)
          </CardTitle>
          <CardDescription>Kelola Google Authenticator untuk akun Anda.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-gray-50">
            <div>
              <p className="font-medium text-sm text-gray-900">Status OTP</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {user?.otpEnabled
                  ? "Aktif — akun Anda dilindungi 2FA"
                  : "Belum dikonfigurasi"}
              </p>
            </div>
            <Badge
              variant="outline"
              className={
                user?.otpEnabled
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }
            >
              {user?.otpEnabled ? "Aktif" : "Tidak Aktif"}
            </Badge>
          </div>

          {!user?.otpEnabled ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">OTP belum diaktifkan</p>
                <p className="text-xs text-blue-700 mt-1">
                  Aktifkan Two-Factor Authentication untuk meningkatkan keamanan akun Anda.
                </p>
                <Button size="sm" className="mt-3" onClick={handleSetupOtp}>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Setup OTP Sekarang
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">Reset OTP</p>
                <p className="text-xs text-amber-700 mt-1">
                  Jika Anda kehilangan akses ke aplikasi authenticator atau ingin mengganti perangkat,
                  reset OTP lalu lakukan setup ulang.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 border-amber-300 text-amber-800 hover:bg-amber-100"
                  onClick={handleResetOtp}
                  disabled={resetting}
                >
                  {resetting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mereset...</>
                  ) : (
                    <><RefreshCw className="mr-2 h-4 w-4" /> Reset &amp; Setup Ulang OTP</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
