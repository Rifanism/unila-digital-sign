import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, ShieldCheck, Smartphone, ExternalLink, Lock, FileCheck } from "lucide-react";

interface VerifyQrResult {
  isValid: boolean;
  documentName: string;
  signerName: string;
  signerEmail: string;
  signerRole: string;
  nimNip: string | null;
  signedAt: string;
}

export default function VerifyQr() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [result, setResult] = useState<VerifyQrResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setError("Token tidak valid"); setLoading(false); return; }
    fetch(`/api/verify/qr/${token}`)
      .then((r) => {
        if (r.status === 404) throw new Error("Token tidak ditemukan. Dokumen mungkin tidak valid atau QR kode rusak.");
        if (!r.ok) throw new Error("Gagal memverifikasi dokumen.");
        return r.json();
      })
      .then((data) => { setResult(data); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, [token]);

  const roleLabel = (role: string) => {
    if (role === "dosen") return "Dosen";
    if (role === "mahasiswa") return "Mahasiswa";
    return role;
  };

  const idLabel = (role: string) => (role === "dosen" ? "NIP" : "NPM");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-full mb-4">
            <ShieldCheck className="h-8 w-8 text-blue-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verifikasi Tanda Tangan Digital</h1>
          <p className="text-sm text-gray-500 mt-1">Universitas Lampung — Unila Digital Sign</p>
        </div>

        {}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Cara Memverifikasi Keaslian Dokumen
            </h3>
            <div className="space-y-2 text-sm text-blue-900">
              <p className="flex items-start gap-2">
                <span className="bg-blue-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
                <span>Arahkan kamera ponsel ke <strong>QR code</strong> pada stamp tanda tangan di dokumen.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="bg-blue-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
                <span>Browser akan membuka halaman verifikasi resmi <strong>Universitas Lampung</strong>.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="bg-blue-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
                <span>Jika muncul tanda <strong className="text-green-700">"Dokumen Valid & Asli"</strong> dengan detail penandatangan, dokumen tersebut asli.</span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-100 rounded-md px-3 py-2">
              <Lock className="h-3.5 w-3.5" />
              <span>QR code berisi token unik yang tersimpan di server Universitas Lampung. Token tidak dapat dipalsukan.</span>
            </div>
          </CardContent>
        </Card>

        {loading && (
          <Card>
            <CardContent className="flex items-center justify-center py-10 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-gray-600">Memverifikasi dokumen...</span>
            </CardContent>
          </Card>
        )}

        {error && !loading && (
          <Card className="border-l-4 border-l-red-500">
            <CardHeader>
              <div className="flex items-center gap-3">
                <XCircle className="h-7 w-7 text-red-500 flex-shrink-0" />
                <CardTitle className="text-red-700">Verifikasi Gagal</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {result && !loading && (
          <Card className={`border-l-4 ${result.isValid ? "border-l-green-500" : "border-l-red-500"}`}>
            <CardHeader>
              <div className="flex items-center gap-3">
                {result.isValid ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-500 flex-shrink-0" />
                )}
                <div>
                  <CardTitle className={result.isValid ? "text-green-700" : "text-red-700"}>
                    {result.isValid ? "Dokumen Valid & Asli" : "Dokumen Tidak Valid"}
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {result.isValid
                      ? "Dokumen ini telah ditandatangani secara digital oleh Universitas Lampung."
                      : "Dokumen ini tidak dapat diverifikasi."}
                  </p>
                </div>
              </div>
            </CardHeader>

            {result.isValid && (
              <CardContent>
                <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
                  <Row label="Nama Dokumen" value={result.documentName} />
                  <Row label="Ditandatangani oleh" value={result.signerName} bold />
                  <Row label="Jabatan" value={roleLabel(result.signerRole)} />
                  <Row label={idLabel(result.signerRole)} value={result.nimNip ?? "-"} />
                  <Row label="Email" value={result.signerEmail} />
                  <Row
                    label="Tanggal Tanda Tangan"
                    value={new Date(result.signedAt).toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-4 text-center">
                  Diverifikasi oleh sistem Unila Digital Sign &mdash; Universitas Lampung
                </p>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="grid grid-cols-5 gap-2 border-b last:border-b-0 pb-2 last:pb-0">
      <span className="col-span-2 text-sm text-gray-500">{label}</span>
      <span className={`col-span-3 text-sm ${bold ? "font-semibold text-blue-800" : "text-gray-800"}`}>{value}</span>
    </div>
  );
}
