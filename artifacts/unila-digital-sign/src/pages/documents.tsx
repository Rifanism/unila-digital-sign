import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListDocuments, useUploadDocument, useDeleteDocument, getListDocumentsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Trash2, PenTool, Download, Search, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Documents() {
  const { data: documents, isLoading } = useListDocuments();
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [docName, setDocName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      if (!docName) {
        setDocName(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !docName) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(",")[1];
      uploadMutation.mutate(
        { data: { name: docName, fileData: base64Data, fileType: selectedFile.type } },
        {
          onSuccess: () => {
            toast({ title: "Berhasil", description: "Dokumen berhasil diunggah." });
            queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
            setIsUploadOpen(false);
            setDocName("");
            setSelectedFile(null);
          },
          onError: () => {
            toast({ title: "Gagal", description: "Gagal mengunggah dokumen.", variant: "destructive" });
          },
        },
      );
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDelete = (id: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus dokumen ini?")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            toast({ title: "Berhasil", description: "Dokumen berhasil dihapus." });
            queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
          },
        },
      );
    }
  };

  const handleDownload = async (id: number, name: string) => {
    setDownloadingId(id);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/documents/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Gagal", description: "Tidak dapat mengunduh dokumen.", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredDocs = documents?.filter((d) => d.name.toLowerCase().includes(search.toLowerCase())) || [];

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      uploaded: { label: "Diunggah", cls: "bg-blue-50 text-blue-700 ring-blue-600/20" },
      pending_sign: { label: "Menunggu TTD", cls: "bg-orange-50 text-orange-700 ring-orange-600/20" },
      signed: { label: "Ditandatangani", cls: "bg-green-50 text-green-700 ring-green-600/20" },
      rejected: { label: "Ditolak", cls: "bg-red-50 text-red-700 ring-red-600/20" },
    };
    const s = map[status];
    if (!s) return null;
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dokumen</h1>
          <p className="text-muted-foreground">Kelola dan tandatangani dokumen Anda.</p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Unggah Dokumen</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unggah Dokumen Baru</DialogTitle>
              <DialogDescription>Pilih file PDF yang akan ditandatangani.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="file">File PDF</Label>
                <Input id="file" type="file" accept="application/pdf" onChange={handleFileChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nama Dokumen</Label>
                <Input
                  id="name"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  required
                  placeholder="Contoh: Surat_Keterangan.pdf"
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" type="button">Batal</Button>
                </DialogClose>
                <Button type="submit" disabled={uploadMutation.isPending || !selectedFile}>
                  {uploadMutation.isPending ? "Mengunggah..." : "Unggah"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>Daftar Dokumen</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari dokumen..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Dokumen</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">Memuat data...</TableCell>
                  </TableRow>
                ) : filteredDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Tidak ada dokumen ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                          <span className="truncate max-w-[280px]" title={doc.name}>
                            {doc.name.length > 40 ? doc.name.slice(0, 40) + "…" : doc.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(doc.status)}
                          {doc.status === "rejected" && (doc as unknown as Record<string, unknown>).rejectionReason && (
                            <p className="text-xs text-red-600 max-w-[200px]">
                              Alasan: {String((doc as unknown as Record<string, unknown>).rejectionReason)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(doc.createdAt).toLocaleDateString("id-ID", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {(doc.status === "uploaded") && (
                            <Button size="sm" variant="default" onClick={() => setLocation(`/documents/${doc.id}/sign`)}>
                              <PenTool className="h-4 w-4 mr-1" /> TTD
                            </Button>
                          )}
                          {doc.status === "signed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(doc.id, doc.name)}
                              disabled={downloadingId === doc.id}
                            >
                              {downloadingId === doc.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <><Download className="h-4 w-4 mr-1" /> Unduh</>
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(doc.id)}
                            disabled={doc.status === "pending_sign"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
