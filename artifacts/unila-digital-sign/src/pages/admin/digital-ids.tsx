import { useState } from "react";
import {
  useListAdminDigitalIdRequests,
  useApproveDigitalIdRequest,
  useRejectDigitalIdRequest,
  useRevokeDigitalIdRequest,
  useReactivateDigitalIdRequest,
  getListAdminDigitalIdRequestsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Check, X, Search, Eye, ShieldOff, ShieldCheck } from "lucide-react";

type DigitalIdRequest = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  rejectionReason?: string | null;
  createdAt: string;
  userName?: string | null;
};

export default function AdminDigitalIds() {
  const { data: requests, isLoading } = useListAdminDigitalIdRequests();
  const approveMutation = useApproveDigitalIdRequest();
  const rejectMutation = useRejectDigitalIdRequest();
  const revokeMutation = useRevokeDigitalIdRequest();
  const reactivateMutation = useReactivateDigitalIdRequest();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [search, setSearch] = useState("");
  const [detailReq, setDetailReq] = useState<DigitalIdRequest | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAdminDigitalIdRequestsQueryKey() });

  const handleApprove = (id: number) => {
    approveMutation.mutate({ id }, {
      onSuccess: () => { toast({ title: "Berhasil", description: "Digital ID disetujui." }); invalidate(); },
    });
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectId || !rejectReason) return;
    rejectMutation.mutate({ id: rejectId, data: { reason: rejectReason } }, {
      onSuccess: () => {
        toast({ title: "Berhasil", description: "Permintaan ditolak." });
        invalidate();
        setRejectId(null);
        setRejectReason("");
      },
    });
  };

  const handleRevoke = (id: number) => {
    if (!confirm("Cabut Digital ID ini? User tidak bisa menandatangani dokumen hingga diaktifkan kembali.")) return;
    revokeMutation.mutate({ id }, {
      onSuccess: () => { toast({ title: "Dicabut", description: "Digital ID berhasil dicabut." }); invalidate(); },
    });
  };

  const handleReactivate = (id: number) => {
    reactivateMutation.mutate({ id }, {
      onSuccess: () => { toast({ title: "Berhasil", description: "Digital ID diaktifkan kembali." }); invalidate(); },
    });
  };

  const filteredReqs = (requests as DigitalIdRequest[] | undefined)?.filter(
    (r) => r.name.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: "Pending", cls: "bg-orange-50 text-orange-700 border-orange-200" },
      approved: { label: "Disetujui", cls: "bg-green-50 text-green-700 border-green-200" },
      rejected: { label: "Ditolak", cls: "bg-red-50 text-red-700 border-red-200" },
      revoked: { label: "Dicabut", cls: "bg-gray-100 text-gray-600 border-gray-300" },
    };
    const s = map[status] ?? { label: status, cls: "" };
    return <Badge variant="outline" className={s.cls}>{s.label}</Badge>;
  };

  const anyMutating = approveMutation.isPending || revokeMutation.isPending || reactivateMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Permintaan Digital ID</h1>
        <p className="text-muted-foreground">Persetujuan pendaftaran Sertifikat Elektronik baru.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>Daftar Pengajuan</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari nama atau email..."
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
                  <TableHead>Pengguna</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
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
                        <p className="font-medium text-sm">{req.name}</p>
                        <p className="text-xs text-muted-foreground">{req.email}</p>
                      </TableCell>
                      <TableCell className="capitalize">{req.role}</TableCell>
                      <TableCell>{statusBadge(req.status)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(req.createdAt).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-blue-600 hover:bg-blue-50"
                            onClick={() => setDetailReq(req)}
                          >
                            <Eye className="h-4 w-4 mr-1" /> Detail
                          </Button>

                          {req.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(req.id)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={anyMutating}
                              >
                                <Check className="h-4 w-4 mr-1" /> Setujui
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

                          {req.status === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleRevoke(req.id)}
                              disabled={anyMutating}
                            >
                              <ShieldOff className="h-4 w-4 mr-1" /> Cabut
                            </Button>
                          )}

                          {(req.status === "revoked" || req.status === "rejected") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => handleReactivate(req.id)}
                              disabled={anyMutating}
                            >
                              <ShieldCheck className="h-4 w-4 mr-1" /> Aktifkan
                            </Button>
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

      {/* Detail Dialog */}
      <Dialog open={!!detailReq} onOpenChange={(open) => !open && setDetailReq(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Pengajuan Digital ID</DialogTitle>
            <DialogDescription>Informasi lengkap yang diajukan oleh pengguna.</DialogDescription>
          </DialogHeader>
          {detailReq && (
            <div className="space-y-3 py-2">
              {[
                { label: "Nama", value: detailReq.name },
                { label: "Email", value: detailReq.email },
                { label: "Peran", value: detailReq.role === "dosen" ? "Dosen" : "Mahasiswa" },
                { label: "Status", value: statusBadge(detailReq.status) },
                {
                  label: "Tanggal Pengajuan",
                  value: new Date(detailReq.createdAt).toLocaleString("id-ID", {
                    dateStyle: "long", timeStyle: "short",
                  }),
                },
                ...(detailReq.rejectionReason
                  ? [{ label: "Alasan Penolakan", value: detailReq.rejectionReason }]
                  : []),
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-start gap-4 py-2 border-b last:border-0">
                  <span className="text-sm text-muted-foreground shrink-0">{item.label}</span>
                  <span className="text-sm font-medium text-right">{item.value}</span>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailReq(null)}>Tutup</Button>
            {detailReq?.status === "pending" && (
              <>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => { handleApprove(detailReq.id); setDetailReq(null); }}
                  disabled={anyMutating}
                >
                  <Check className="h-4 w-4 mr-1" /> Setujui
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => { setDetailReq(null); setRejectId(detailReq.id); }}
                >
                  <X className="h-4 w-4 mr-1" /> Tolak
                </Button>
              </>
            )}
            {detailReq?.status === "approved" && (
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => { handleRevoke(detailReq.id); setDetailReq(null); }}
                disabled={anyMutating}
              >
                <ShieldOff className="h-4 w-4 mr-1" /> Cabut Digital ID
              </Button>
            )}
            {(detailReq?.status === "revoked" || detailReq?.status === "rejected") && (
              <Button
                variant="outline"
                className="text-green-600 border-green-200 hover:bg-green-50"
                onClick={() => { handleReactivate(detailReq.id); setDetailReq(null); }}
                disabled={anyMutating}
              >
                <ShieldCheck className="h-4 w-4 mr-1" /> Aktifkan Kembali
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Permintaan</DialogTitle>
            <DialogDescription>Berikan alasan penolakan untuk pengguna ini.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReject} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Alasan Penolakan</Label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
                placeholder="Contoh: Data tidak sesuai..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRejectId(null)}>Batal</Button>
              <Button type="submit" variant="destructive" disabled={rejectMutation.isPending}>Tolak Permintaan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
