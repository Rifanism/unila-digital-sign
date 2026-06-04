import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield } from "lucide-react";
import LogoUnila from "@assets/Logo_unila.png";
import { useQueryClient } from "@tanstack/react-query";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useLogin();
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: async (data) => {
          queryClient.setQueryData(getGetCurrentUserQueryKey(), data.user);
          login(data.token);
          if (data.user.role === "admin") {
            setLocation("/admin/dashboard");
          } else if (!data.user.otpEnabled) {
            setLocation("/setup-otp");
          } else {
            setLocation("/dashboard");
          }
        },
        onError: () => {
          toast({
            title: "Login Gagal",
            description: "Email atau kata sandi tidak valid.",
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <img src={LogoUnila} alt="Universitas Lampung" className="h-20 w-auto mb-6" />
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          Unila Digital Sign
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Portal Tanda Tangan Digital Resmi Universitas Lampung
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="shadow-lg border-0 ring-1 ring-gray-900/5">
          <CardHeader>
            <CardTitle>Masuk ke Akun</CardTitle>
            <CardDescription>Gunakan email resmi unila</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Masukkan email unila"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Kata Sandi</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</>
                ) : (
                  "Masuk"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center justify-center text-sm text-gray-500 gap-2">
          <Shield size={14} className="text-primary" />
          <span>Dilindungi oleh sistem keamanan Unila</span>
        </div>
      </div>
    </div>
  );
}
