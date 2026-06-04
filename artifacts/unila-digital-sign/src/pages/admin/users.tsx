import { useState } from "react";
import { useListAdminUsers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function AdminUsers() {
  const { data: users, isLoading } = useListAdminUsers();
  const [search, setSearch] = useState("");

  const filteredUsers = users?.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manajemen Pengguna</h1>
        <p className="text-muted-foreground">Daftar dosen dan mahasiswa dalam sistem Unila Digital Sign.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>Semua Pengguna</CardTitle>
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
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead>Keamanan (2FA)</TableHead>
                  <TableHead>Status Digital ID</TableHead>
                  <TableHead>Gambar TTD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-6">Memuat...</TableCell></TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Tidak ada pengguna</TableCell></TableRow>
                ) : (
                  filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell className="capitalize">{user.role}</TableCell>
                      <TableCell>
                        {user.otpEnabled ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Aktif</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Belum</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.digitalIdStatus === 'approved' ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Memiliki ID</Badge>
                        ) : user.digitalIdStatus === 'pending' ? (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Pengajuan</Badge>
                        ) : (
                          <span className="text-sm text-gray-500">Tidak ada</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.hasSignature ? (
                          <span className="text-sm text-green-600 font-medium">Tersimpan</span>
                        ) : (
                          <span className="text-sm text-gray-400">Kosong</span>
                        )}
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
