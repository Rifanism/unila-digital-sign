import { useState } from "react";
import { useGetCaCertificateInfo } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Info, Shield, Monitor, BookOpen, Terminal, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Certificate() {
  const { data: certInfo, isLoading } = useGetCaCertificateInfo({
    query: { retry: false },
  });
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/certificate/ca", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "UniversitasLampung-CA.crt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Gagal", description: "Tidak dapat mengunduh sertifikat.", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sertifikat CA Unila</h1>
        <p className="text-muted-foreground">
          Unduh dan instal Root CA Universitas Lampung agar dokumen yang ditandatangani dikenali sebagai valid.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Informasi Sertifikat
                </CardTitle>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Aktif
                </Badge>
              </div>
              <CardDescription>Detail CA Certificate resmi Universitas Lampung.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {certInfo ? (
                <>
                  {[
                    { label: "Nama", value: certInfo.name },
                    { label: "Penerbit (Issuer)", value: certInfo.issuer },
                    { label: "Algoritma", value: certInfo.algorithm },
                    {
                      label: "Berlaku Dari",
                      value: new Date(certInfo.validFrom).toLocaleDateString("id-ID", {
                        day: "numeric", month: "long", year: "numeric",
                      }),
                    },
                    {
                      label: "Berlaku Sampai",
                      value: new Date(certInfo.validTo).toLocaleDateString("id-ID", {
                        day: "numeric", month: "long", year: "numeric",
                      }),
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-start py-2 border-b last:border-0">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-medium text-right max-w-[55%]">{item.value}</span>
                    </div>
                  ))}

                  <div className="pt-3">
                    <Button className="w-full gap-2" onClick={handleDownload} disabled={downloading}>
                      {downloading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Mengunduh...</>
                      ) : (
                        <><Download className="h-4 w-4" /> Unduh Sertifikat CA (.crt)</>
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      File: <code>UniversitasLampung-CA.crt</code> — Format X.509 PEM
                    </p>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center text-muted-foreground">Informasi tidak tersedia</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Panduan Instalasi
              </CardTitle>
              <CardDescription>Langkah-langkah mempercayai sertifikat ini di perangkat Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-sm">
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-red-500" /> Adobe Acrobat Reader
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-600 pl-1">
                  <li>Unduh file sertifikat CA (.crt).</li>
                  <li>Buka Adobe Acrobat Reader.</li>
                  <li>Pilih <strong>Edit › Preferences</strong> (Mac: Acrobat › Preferences).</li>
                  <li>Pilih kategori <strong>Signatures</strong>.</li>
                  <li>Pada <em>Identities & Trusted Certificates</em>, klik <strong>More...</strong></li>
                  <li>Klik <strong>Import</strong>, pilih file .crt yang diunduh.</li>
                  <li>Klik <strong>Trust...</strong> → centang <em>"Use this certificate as a trusted root"</em>.</li>
                </ol>
              </div>

              <div className="space-y-2 border-t pt-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-blue-500" /> Foxit Reader
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-600 pl-1">
                  <li>Unduh file sertifikat CA (.crt).</li>
                  <li>Buka <strong>Foxit Reader</strong>, pilih menu <strong>File › Preferences</strong>.</li>
                  <li>Pilih kategori <strong>Trust Manager</strong>.</li>
                  <li>Klik <strong>Import</strong> pada bagian <em>Trusted Certificates</em>.</li>
                  <li>Pilih file <code>UniversitasLampung-CA.crt</code> yang diunduh.</li>
                  <li>Centang <em>"Use this certificate as a trusted root for signing"</em>, klik OK.</li>
                </ol>
              </div>

              <div className="space-y-2 border-t pt-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-gray-600" /> Linux (CLI)
                </h4>
                <div className="bg-gray-900 text-gray-100 rounded-md p-3 text-xs font-mono space-y-1">
                  <p className="text-gray-400"># Ubuntu/Debian</p>
                  <p>sudo cp UniversitasLampung-CA.crt \</p>
                  <p>&nbsp;&nbsp;/usr/local/share/ca-certificates/</p>
                  <p>sudo update-ca-certificates</p>
                  <p className="text-gray-400 mt-2"># Fedora/Red Hat</p>
                  <p>sudo cp UniversitasLampung-CA.crt \</p>
                  <p>&nbsp;&nbsp;/etc/pki/ca-trust/source/anchors/</p>
                  <p>sudo update-ca-trust extract</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
