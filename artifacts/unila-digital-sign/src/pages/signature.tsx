import { useState, useRef, useEffect } from "react";
import { useGetSignatureImage, useUploadSignatureImage, getGetSignatureImageQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, PenTool, Trash2, Check, Loader2 } from "lucide-react";

export default function Signature() {
  const { data: signature, isLoading } = useGetSignatureImage({
    query: { retry: false },
  });
  const uploadMutation = useUploadSignatureImage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("upload");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    ctx.beginPath();
    let x, y;
    if ("touches" in e) {
      const rect = canvas.getBoundingClientRect();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    }
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let x, y;
    if ("touches" in e) {
      const rect = canvas.getBoundingClientRect();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    }
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    if (activeTab === "draw" && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#000000";
      }
    }
  }, [activeTab]);

  const handleSave = () => {
    let imageData = "";
    if (activeTab === "upload" && selectedFile) {
      imageData = selectedFile;
    } else if (activeTab === "draw" && canvasRef.current) {
      imageData = canvasRef.current.toDataURL("image/png");
    }

    if (!imageData) {
      toast({ title: "Gagal", description: "Tidak ada tanda tangan yang akan disimpan.", variant: "destructive" });
      return;
    }

    const base64Data = imageData.split(",")[1] || imageData;
    uploadMutation.mutate(
      { data: { imageData: base64Data } },
      {
        onSuccess: () => {
          toast({ title: "Berhasil", description: "Tanda tangan telah diperbarui." });
          queryClient.invalidateQueries({ queryKey: getGetSignatureImageQueryKey() });
          setSelectedFile(null);
          if (activeTab === "draw") clearCanvas();
        },
        onError: () => {
          toast({ title: "Gagal", description: "Gagal menyimpan tanda tangan.", variant: "destructive" });
        },
      },
    );
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
        <h1 className="text-2xl font-bold tracking-tight">Kelola Tanda Tangan</h1>
        <p className="text-muted-foreground">Atur gambar tanda tangan yang akan disisipkan ke dalam dokumen PDF.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tanda Tangan Saat Ini</CardTitle>
            <CardDescription>Ini adalah tanda tangan yang akan digunakan pada dokumen Anda.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[200px] border-2 border-dashed rounded-lg m-4 bg-gray-50 relative overflow-hidden">
            {signature?.imageData ? (
              <img
                src={`data:image/png;base64,${signature.imageData}`}
                alt="Tanda Tangan"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-center text-gray-400">
                <PenTool className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Belum ada tanda tangan</p>
                <p className="text-xs mt-1 text-gray-300">Gunakan panel di sebelah kanan untuk menambahkan</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Perbarui Tanda Tangan</CardTitle>
            <CardDescription>Unggah gambar (.png transparan disarankan) atau gambar langsung di kanvas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Unggah Gambar</TabsTrigger>
                <TabsTrigger value="draw">Gambar Langsung</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4 pt-4">
                <label className="block border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 min-h-[200px] cursor-pointer hover:bg-gray-100 transition-colors relative">
                  {selectedFile ? (
                    <img src={selectedFile} alt="Preview" className="max-w-full max-h-[180px] object-contain" />
                  ) : (
                    <>
                      <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 mb-1">Klik untuk pilih gambar</p>
                      <p className="text-xs text-gray-400">PNG, JPG atau JPEG</p>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
              </TabsContent>

              <TabsContent value="draw" className="space-y-4 pt-4">
                <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={200}
                    className="w-full bg-white cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={clearCanvas}>
                    <Trash2 className="mr-2 h-4 w-4" /> Hapus
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6">
              <Button
                onClick={handleSave}
                disabled={uploadMutation.isPending || (activeTab === "upload" && !selectedFile)}
                className="w-full"
              >
                {uploadMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
                ) : (
                  <><Check className="mr-2 h-4 w-4" /> Simpan Tanda Tangan</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
