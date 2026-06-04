import { useAuth } from "@/lib/auth";
import { useGetDigitalIdStatus, useGetSignatureImage, useListDocuments } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, FileSignature, FileText, ArrowRight, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: digitalId } = useGetDigitalIdStatus();
  const { data: signature } = useGetSignatureImage();
  const { data: documents } = useListDocuments();

  const pendingDocs = documents?.filter(d => d.status === "pending_sign") || [];
  const recentDocs = documents?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Selamat datang kembali, {user?.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Digital ID</CardTitle>
            <Shield className={`h-4 w-4 ${digitalId?.status === 'approved' ? 'text-green-500' : 'text-gray-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {digitalId?.status ? digitalId.status : 'Belum Ada'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {digitalId?.status === 'approved' ? 'Digital ID aktif dan siap digunakan' : 'Silakan ajukan Digital ID'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tanda Tangan</CardTitle>
            <FileSignature className={`h-4 w-4 ${signature ? 'text-green-500' : 'text-gray-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {signature ? 'Tersedia' : 'Belum Diatur'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {signature ? 'Gambar tanda tangan tersimpan' : 'Atur gambar tanda tangan Anda'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dokumen Menunggu</CardTitle>
            <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingDocs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Dokumen perlu ditandatangani
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tindakan Cepat</CardTitle>
            <CardDescription>Langkah selanjutnya untuk melengkapi profil Anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {digitalId?.status === 'approved' ? <CheckCircle2 className="text-green-500" /> : <Shield className="text-blue-500" />}
                <div>
                  <p className="font-medium">1. Ajukan Digital ID</p>
                  <p className="text-sm text-muted-foreground">Diperlukan untuk menandatangani dokumen</p>
                </div>
              </div>
              <Button variant={digitalId?.status === 'approved' ? "outline" : "default"} asChild>
                <Link href="/digital-id">
                  {digitalId?.status === 'approved' ? 'Lihat' : 'Ajukan'} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {signature ? <CheckCircle2 className="text-green-500" /> : <FileSignature className="text-blue-500" />}
                <div>
                  <p className="font-medium">2. Atur Tanda Tangan</p>
                  <p className="text-sm text-muted-foreground">Gambar visual tanda tangan Anda</p>
                </div>
              </div>
              <Button variant={signature ? "outline" : "default"} asChild>
                <Link href="/signature">
                  {signature ? 'Ubah' : 'Atur'} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dokumen Terkini</CardTitle>
            <CardDescription>Dokumen yang baru saja diunggah atau ditandatangani</CardDescription>
          </CardHeader>
          <CardContent>
            {recentDocs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>Belum ada dokumen</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentDocs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <FileText className="text-blue-500 h-5 w-5" />
                      <div>
                        <p className="font-medium text-sm truncate w-48">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString('id-ID')}</p>
                      </div>
                    </div>
                    <div>
                      {doc.status === 'signed' && <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">Ditandatangani</span>}
                      {doc.status === 'pending_sign' && <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20">Menunggu TTD</span>}
                      {doc.status === 'uploaded' && <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">Diunggah</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t">
              <Button variant="ghost" className="w-full" asChild>
                <Link href="/documents">Lihat Semua Dokumen</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
