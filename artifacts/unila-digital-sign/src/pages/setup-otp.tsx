import { useState } from "react";
import { useLocation } from "wouter";
import { useGetOtpSetup, useVerifyOtp, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Copy, Check, Loader2 } from "lucide-react";
import LogoUnila from "@assets/Logo_unila.png";
import { useQueryClient } from "@tanstack/react-query";

export default function SetupOtp() {
  const [otpCode, setOtpCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: otpSetup, isLoading } = useGetOtpSetup({
    query: { retry: false },
  });

  const verifyMutation = useVerifyOtp();

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) return;

    verifyMutation.mutate(
      { data: { code: otpCode } },
      {
        onSuccess: async () => {
          toast({ title: "Berhasil", description: "OTP telah berhasil diaktifkan." });
          await queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
          setLocation("/dashboard");
        },
        onError: () => {
          toast({
            title: "Verifikasi Gagal",
            description: "Kode OTP tidak valid. Pastikan waktu perangkat Anda sudah benar.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const copySecret = () => {
    if (otpSetup?.secret) {
      navigator.clipboard.writeText(otpSetup.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Tersalin", description: "Kode rahasia telah disalin ke clipboard." });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <img src={LogoUnila} alt="Universitas Lampung" className="h-20 w-auto mb-6" />
        <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900">
          Setup Two-Factor Authentication
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          Amankan akun Anda dengan Google Authenticator
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="shadow-lg border-0 ring-1 ring-gray-900/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="text-primary h-5 w-5" /> Pindai QR Code
            </CardTitle>
            <CardDescription>
              Buka aplikasi <strong>Google Authenticator</strong> atau <strong>Authy</strong>, lalu
              pindai QR code di bawah ini. Setelah itu masukkan 6 digit kode yang muncul.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {otpSetup ? (
              <>
                <div className="flex justify-center p-4 bg-white rounded-lg border border-gray-200">
                  <img src={otpSetup.qrCodeUrl} alt="QR Code OTP" className="w-52 h-52" />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Atau masukkan kode manual:
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                    <code className="text-sm font-mono text-gray-800 flex-1 break-all select-all">
                      {otpSetup.secret}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={copySecret}
                      className="h-8 w-8 shrink-0 text-gray-500 hover:text-gray-900"
                    >
                      {copied ? (
                        <Check size={15} className="text-green-600" />
                      ) : (
                        <Copy size={15} />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-5">
                  <form onSubmit={handleVerify} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="otp" className="text-sm font-medium text-gray-700">
                        Masukkan 6 digit kode dari aplikasi
                      </label>
                      <Input
                        id="otp"
                        type="text"
                        inputMode="numeric"
                        required
                        maxLength={6}
                        pattern="[0-9]{6}"
                        className="text-center text-2xl tracking-[0.5em] font-mono"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="000000"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={verifyMutation.isPending || otpCode.length !== 6}
                    >
                      {verifyMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memverifikasi...</>
                      ) : (
                        "Verifikasi & Aktifkan OTP"
                      )}
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Gagal memuat konfigurasi OTP. Coba muat ulang halaman.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
