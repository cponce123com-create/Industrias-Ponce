import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthHeaders } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera, Plus, Trash2, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";

interface PhotoGalleryProps {
  recordId: string;
  photos: string[];
  uploadUrl: string;
  deleteUrl: (photoIndex: number) => string;
  queryKey: unknown[];
  canUpload: boolean;
  canDelete: boolean;
}

export function PhotoGallery({
  recordId, photos, uploadUrl, deleteUrl, queryKey, canUpload, canDelete,
}: PhotoGalleryProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (idx: number) => {
      const res = await fetch(deleteUrl(idx), {
        method: "DELETE",
        headers: getAuthHeaders() as Record<string, string>,
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? "Error"); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      if (lightbox !== null) setLightbox(null);
      toast({ title: "Foto eliminada" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  async function handleFiles(files: FileList) {
    if (!files.length) return;
    const remaining = 5 - photos.length;
    if (remaining <= 0) {
      toast({ title: "Límite alcanzado", description: "Solo se permiten hasta 5 fotos por registro.", variant: "destructive" });
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const fd = new FormData();
      toUpload.forEach(f => fd.append("photos", f));
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: getAuthHeaders() as Record<string, string>,
        body: fd,
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? "Error al subir fotos"); }
      qc.invalidateQueries({ queryKey });
      toast({ title: "Fotos subidas", description: `${toUpload.length} foto(s) agregada(s) correctamente.` });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const canAdd = canUpload && photos.length < 5;
  const lightboxPhoto = lightbox !== null ? photos[lightbox] : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Fotos ({photos.length}/5)</span>
        </div>
        {canAdd && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {uploading ? "Subiendo..." : "Agregar foto"}
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {photos.length === 0 ? (
        <div
          className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-slate-300 transition-colors"
          onClick={() => canAdd && fileRef.current?.click()}
        >
          <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-400">
            {canAdd ? "Haga clic para agregar fotos (máx. 5)" : "Sin fotos"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {photos.map((url, idx) => (
            <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
              <img
                src={url}
                alt={`Foto ${idx + 1}`}
                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setLightbox(idx)}
              />
              {canDelete && (
                <button
                  type="button"
                  className="absolute top-1 right-1 w-5 h-5 bg-red-600/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                  onClick={e => { e.stopPropagation(); deleteMutation.mutate(idx); }}
                  disabled={deleteMutation.isPending}
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              )}
            </div>
          ))}
          {canAdd && (
            <button
              type="button"
              className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 hover:border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5 text-slate-400" />
                  <span className="text-xs text-slate-400">Foto</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      <Dialog open={lightboxPhoto !== null} onOpenChange={o => { if (!o) setLightbox(null); }}>
        <DialogContent className="max-w-3xl p-2 bg-black/95 border-slate-800">
          <div className="relative flex items-center justify-center min-h-[300px]">
            {lightboxPhoto && (
              <img src={lightboxPhoto} alt="Foto" className="max-h-[75vh] max-w-full object-contain rounded-lg" />
            )}
            {photos.length > 1 && lightbox !== null && (
              <>
                <button
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                  onClick={() => setLightbox(l => l !== null ? (l - 1 + photos.length) % photos.length : 0)}
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                  onClick={() => setLightbox(l => l !== null ? (l + 1) % photos.length : 0)}
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </>
            )}
          </div>
          {lightbox !== null && (
            <div className="flex items-center justify-between px-2 pb-1">
              <span className="text-xs text-slate-400">Foto {lightbox + 1} de {photos.length}</span>
              {canDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(lightbox)}
                >
                  {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Eliminar
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
