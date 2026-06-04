import { useState } from "react";
import { useListAdminSignRequests, useApproveSignRequest, useRejectSignRequest, getListAdminSignRequestsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Check, X, Search, FileText, Download, Loader2 } from "lucide-react";

export default function AdminSignRequests() {
  const { data: requests, isLoading } = useListAdminSignRequests();
  const approveMutation = useApproveSignRequest();
  const rejectMutation = useRejectSignRequest();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [search, setSearch] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleApprove = (id: number) => {
    approveMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Berhasil", description: "Dokumen berhasil ditandatangani." });
        queryClient.invalidateQueries({ queryKey: getListAdminSignRequestsQueryKey() });
      },
    });
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectId || !rejectReason) return;
    rejectMutation.mutate({ id: rejectId, data: { reason: rejectReason } }, {
      onSuccess: () => {
        toast({ title: "Berhasil", description: "Permintaan tanda tangan ditolak." });
        queryClient.invalidateQueries({ queryKey: getListAdminSignRequestsQueryKey() });
        setRejectId(null);
        setRejectReason("");
      },
    });
  };

  const handleDownloadDocument = async (signRequestId: number, docName: string) => {
    setDownloadingId(signRequestId);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/admin/sign-requests/${signRequestId}/document`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = docName || `dokumen-${signRequestId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Gagal", description: "Tidak dapat mengunduh dokumen.", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredReqs = requests?.filter(
    (r) =>
      r.userName?.toLowerCase().includes(search.toLowerCase()) ||
      r.documentName?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Permintaan Tanda Tangan</h1>
        <p className="text-muted-foreground">Otorisasi proses penyematan Digital ID pada dokumen PDF.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>Antrean Tanda Tangan</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari nama atau dokumen..."
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
                  <TableHead>Dokumen</TableHead>
                  <TableHead>Pemohon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal Pengajuan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6">Memuat...</TableCell></TableRow>
                ) : filteredReqs.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Tidak ada permintaan</TableCell></TableRow>
                ) : (
                  filteredReqs.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                          <span className="font-medium text-sm truncate max-w-[220px]" title={req.documentName || ""}>
                            {(() => { const n = req.documentName || `Doc #${req.documentId}`; return n.length > 35 ? n.slice(0, 35) + "…" : n; })()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{req.userName}</TableCell>
                      <TableCell>
                        {req.status === "pending" && <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Pending</Badge>}
                        {req.status === "approved" && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Selesai</Badge>}
                        {req.status === "rejected" && <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Ditolak</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(req.createdAt).toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => handleDownloadDocument(req.id, req.documentName ?? "")}
                            disabled={downloadingId === req.id}
                            title="Unduh dokumen untuk diperiksa"
                          >
                            {downloadingId === req.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <><Download className="h-4 w-4 mr-1" /> Lihat</>
                            )}
                          </Button>
                          {req.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(req.id)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={approveMutation.isPending}
                              >
                                <Check className="h-4 w-4 mr-1" /> Proses TTD
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => setRejectId(req.id)}
                              >
                                <X className="h-4 w-4 mr-1" /> Tolak
                              </Button>
                            </>
                          )}
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

      <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan Penandatanganan</DialogTitle>
            <DialogDescription>Berikan alasan pembatalan proses tanda tangan ini.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReject} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Alasan Pembatalan</Label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
                placeholder="Contoh: Dokumen tidak valid..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRejectId(null)}>Kembali</Button>
              <Button type="submit" variant="destructive" disabled={rejectMutation.isPending}>Batalkan Proses</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
