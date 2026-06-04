import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useGetDocument, useGetSignatureImage, useSignDocument, getGetDocumentQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronLeft, ChevronRight, PenTool } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PdfPageCanvas } from "@/components/pdf-page-canvas";

export default function SignDocument() {
  const params = useParams();
  const documentId = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: document, isLoading: isLoadingDoc } = useGetDocument(documentId, {
    query: { enabled: !!documentId, queryKey: getGetDocumentQueryKey(documentId) },
  });

  const { data: signature } = useGetSignatureImage();
  const signMutation = useSignDocument();

  const [otpCode, setOtpCode] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [sigPos, setSigPos] = useState({ x: 50, y: 75, width: 20, height: 10 });

  const handleSign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase) {
      toast({ title: "Error", description: "Masukkan passphrase Digital ID Anda", variant: "destructive" });
      return;
    }
    if (!otpCode || otpCode.length !== 6) {
      toast({ title: "Error", description: "Masukkan 6 digit kode OTP", variant: "destructive" });
      return;
    }

    signMutation.mutate(
      {
        id: documentId,
        data: {
          otpCode,
          passphrase,
          signaturePage: currentPage,
          signatureX: Math.round(sigPos.x),
          signatureY: Math.round(sigPos.y),
          signatureWidth: Math.round(sigPos.width),
          signatureHeight: Math.round(sigPos.height),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Berhasil", description: "Permintaan tanda tangan telah diajukan." });
          queryClient.invalidateQueries({ queryKey: getGetDocumentQueryKey(documentId) });
          setLocation("/documents");
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          toast({ title: "Gagal", description: msg ?? "Periksa kembali kode OTP Anda.", variant: "destructive" });
        },
      },
    );
  };

  if (isLoadingDoc) return <div className="p-8 flex items-center gap-2"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" /> Memuat dokumen...</div>;
  if (!document) return <div className="p-8">Dokumen tidak ditemukan.</div>;

  const docRaw = document as unknown as Record<string, unknown>;
  const fileData = docRaw.fileData as string | undefined;
  const totalPages = (docRaw.pageCount as number | null) ?? pageCount;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/documents")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tandatangani Dokumen</h1>
          <p className="text-muted-foreground">{document.name}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* PDF Preview */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="py-3 border-b bg-gray-50/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Pratinjau Dokumen</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Hal. {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 bg-gray-100 flex justify-center overflow-auto min-h-[500px]">
              {fileData ? (
                <div className="w-full max-w-[560px]">
                  {signature ? (
                    <PdfPageCanvas
                      pdfData={fileData}
                      currentPage={currentPage}
                      onPageCount={(n) => setPageCount(n)}
                      sigPos={sigPos}
                      onSigPosChange={setSigPos}
                      signatureImageData={signature.imageData}
                    />
                  ) : (
                    <>
                      <PdfPageCanvas
                        pdfData={fileData}
                        currentPage={currentPage}
                        onPageCount={(n) => setPageCount(n)}
                        sigPos={sigPos}
                        onSigPosChange={setSigPos}
                      />
                      <div className="mt-4 p-4 bg-white shadow rounded-xl border border-red-100 text-center">
                        <PenTool className="h-8 w-8 text-red-500 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-900 mb-1">Tanda Tangan Belum Diatur</p>
                        <Button asChild size="sm" className="mt-2">
                          <Link href="/signature">Atur Tanda Tangan</Link>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center w-full text-muted-foreground text-sm">
                  Tidak dapat memuat pratinjau dokumen.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Posisi & Otorisasi</CardTitle>
              <CardDescription>
                Drag kotak tanda tangan pada pratinjau, lalu masukkan OTP untuk menyetujui.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSign} className="space-y-5">
                <div className="space-y-3 pb-4 border-b">
                  <h4 className="text-sm font-medium text-gray-900">Posisi Tanda Tangan</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Halaman</Label>
                      <Input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1)))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Posisi X (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={Math.round(sigPos.x)}
                        onChange={(e) => setSigPos((p) => ({ ...p, x: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Posisi Y (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={Math.round(sigPos.y)}
                        onChange={(e) => setSigPos((p) => ({ ...p, y: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Lebar (%)</Label>
                      <Input
                        type="number"
                        min={5}
                        max={80}
                        value={Math.round(sigPos.width)}
                        onChange={(e) => setSigPos((p) => ({ ...p, width: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tip: Drag kotak tanda tangan langsung pada pratinjau PDF.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">Passphrase Digital ID</h4>
                  <Input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Masukkan passphrase Digital ID"
                  />
                  <p className="text-xs text-muted-foreground">
                    Passphrase yang Anda daftarkan saat pengajuan Digital ID.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">Kode OTP</h4>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Dari aplikasi Google Authenticator Anda.
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={!signature || signMutation.isPending || otpCode.length !== 6 || !passphrase}>
                  {signMutation.isPending ? "Memproses..." : "Tandatangani Dokumen"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
