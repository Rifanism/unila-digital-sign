import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVerifyDocument } from "@workspace/api-client-react";
import { CheckCircle2, XCircle, Upload, ShieldCheck, FileText } from "lucide-react";

export default function Verify() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const verifyMutation = useVerifyDocument();
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      
      verifyMutation.mutate({ 
        data: { fileData: base64Data } 
      }, {
        onSuccess: (data) => {
          setResult(data);
        }
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-full mb-4">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Verifikasi Dokumen</h1>
        <p className="text-muted-foreground mt-2">
          Periksa keaslian tanda tangan digital pada dokumen yang diterbitkan oleh Universitas Lampung.
        </p>
      </div>

      <Card className="border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle>Unggah Dokumen PDF</CardTitle>
          <CardDescription>Pastikan dokumen yang diunggah adalah dokumen asli yang belum dimodifikasi.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="border-2 border-dashed rounded-lg p-8 text-center bg-gray-50 relative hover:bg-gray-100 transition-colors">
              <input 
                type="file" 
                accept="application/pdf" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-3">
                <FileText className="h-10 w-10 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{selectedFile ? selectedFile.name : "Pilih atau tarik file PDF ke sini"}</p>
                  <p className="text-sm text-gray-500">Maksimal 10MB</p>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={!selectedFile || verifyMutation.isPending}>
              {verifyMutation.isPending ? "Sedang Memverifikasi..." : "Verifikasi Sekarang"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className={`border-l-4 ${result.isValid ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <CardHeader>
            <div className="flex items-center gap-3">
              {result.isValid ? (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              ) : (
                <XCircle className="h-8 w-8 text-red-500" />
              )}
              <div>
                <CardTitle>{result.isValid ? 'Dokumen Valid & Asli' : 'Dokumen Tidak Valid'}</CardTitle>
                <CardDescription>{result.message}</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          {result.isValid && (
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 border">
                <div className="grid grid-cols-3 gap-2 border-b pb-2">
                  <span className="text-sm font-medium text-gray-500">Penandatangan</span>
                  <span className="col-span-2 font-medium">{result.signerName || '-'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b pb-2">
                  <span className="text-sm font-medium text-gray-500">Email</span>
                  <span className="col-span-2">{result.signerEmail || '-'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 border-b pb-2">
                  <span className="text-sm font-medium text-gray-500">Waktu TTD</span>
                  <span className="col-span-2">{result.signedAt ? new Date(result.signedAt).toLocaleString('id-ID') : '-'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-sm font-medium text-gray-500">Detail</span>
                  <span className="col-span-2 text-sm text-gray-600">{result.details || 'Tanda tangan diverifikasi dan dokumen tidak mengalami perubahan sejak ditandatangani.'}</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
