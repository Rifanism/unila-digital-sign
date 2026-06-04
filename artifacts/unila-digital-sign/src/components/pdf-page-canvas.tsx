import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { Loader2 } from "lucide-react";

// Configure worker using Vite's asset URL resolution
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).href;

interface SigPos {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  pdfData: string;
  currentPage: number;
  onPageCount?: (count: number) => void;
  sigPos: SigPos;
  onSigPosChange: (pos: SigPos) => void;
  signatureImageData?: string;
}

export function PdfPageCanvas({ pdfData, currentPage, onPageCount, sigPos, onSigPosChange, signatureImageData }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Load PDF
  useEffect(() => {
    setIsLoading(true);
    let cancelled = false;
    const bytes = Uint8Array.from(atob(pdfData), (c) => c.charCodeAt(0));
    pdfjsLib.getDocument({ data: bytes }).promise.then((doc) => {
      if (cancelled) return;
      pdfDocRef.current = doc;
      onPageCount?.(doc.numPages);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
    return () => { cancelled = true; };
  }, [pdfData]);

  // Render page
  useEffect(() => {
    if (!pdfDocRef.current || isLoading) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    renderTaskRef.current?.cancel();

    pdfDocRef.current.getPage(currentPage).then((page) => {
      if (!canvasRef.current) return;
      const viewport = page.getViewport({ scale: 1.0 });
      const containerWidth = container.clientWidth || 500;
      const scale = containerWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const task = page.render({ canvasContext: ctx, viewport: scaledViewport } as any);
      renderTaskRef.current = task as RenderTask;
      task.promise.catch(() => {});
    });
  }, [pdfDocRef.current, currentPage, isLoading]);

  const getRelativePos = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getRelativePos(e);
    // Check if click is within signature box
    if (
      pos.x >= sigPos.x && pos.x <= sigPos.x + sigPos.width &&
      pos.y >= sigPos.y && pos.y <= sigPos.y + sigPos.height
    ) {
      setIsDragging(true);
      dragOffsetRef.current = { x: pos.x - sigPos.x, y: pos.y - sigPos.y };
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const pos = getRelativePos(e);
    const newX = Math.max(0, Math.min(pos.x - dragOffsetRef.current.x, 100 - sigPos.width));
    const newY = Math.max(0, Math.min(pos.y - dragOffsetRef.current.y, 100 - sigPos.height));
    onSigPosChange({ ...sigPos, x: newX, y: newY });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none"
      style={{ cursor: isDragging ? "grabbing" : "default" }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-20 min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      <canvas ref={canvasRef} className="w-full shadow-md border border-gray-200 rounded-sm" />

      {/* Signature overlay */}
      {signatureImageData && !isLoading && (
        <div
          className="absolute border-2 border-dashed border-blue-500 bg-blue-50/20 flex items-center justify-center"
          style={{
            left: `${sigPos.x}%`,
            top: `${sigPos.y}%`,
            width: `${sigPos.width}%`,
            height: `${sigPos.height}%`,
            cursor: "grab",
            boxShadow: isDragging ? "0 0 0 3px rgba(59,130,246,0.4)" : undefined,
          }}
          onMouseDown={handleMouseDown}
        >
          <img
            src={`data:image/png;base64,${signatureImageData}`}
            alt="Tanda Tangan"
            className="max-w-full max-h-full object-contain pointer-events-none"
          />
        </div>
      )}
    </div>
  );
}
