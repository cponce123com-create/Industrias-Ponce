import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthHeaders } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, X, Save, Loader2, ExternalLink } from "lucide-react";

interface PhotoUrlManagerProps {
  photos: string[];
  patchUrl: string;
  queryKey: unknown[];
  canEdit: boolean;
}

export function PhotoUrlManager({ photos, patchUrl, queryKey, canEdit }: PhotoUrlManagerProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [urls, setUrls] = useState<string[]>(() => {
    const base = [...(photos ?? [])];
    while (base.length < 5) base.push("");
    return base;
  });
  const [dirty, setDirty] = useState(false);

  const setUrl = (idx: number, val: string) => {
    setUrls(prev => { const next = [...prev]; next[idx] = val; return next; });
    setDirty(true);
  };

  const clearUrl = (idx: number) => {
    setUrls(prev => { const next = [...prev]; next[idx] = ""; return next; });
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const clean = urls.map(u => u.trim()).filter(Boolean);
      const res = await fetch(patchUrl, {
        method: "PATCH",
        headers: { ...getAuthHeaders() as Record<string, string>, "Content-Type": "application/json" },
        body: JSON.stringify({ photos: clean }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? "Error"); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      setDirty(false);
      toast({ title: "URLs guardadas correctamente" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filledCount = urls.filter(u => u.trim()).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">
            URLs de fotos ({filledCount}/5)
          </span>
        </div>
        {canEdit && dirty && (
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Guardar
          </Button>
        )}
      </div>

      <div className="space-y-2.5">
        {urls.map((url, idx) => (
          <div key={idx} className="space-y-1">
            <Label className="text-xs text-slate-500">Foto {idx + 1}</Label>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://drive.google.com/..."
                value={url}
                onChange={e => setUrl(idx, e.target.value)}
                disabled={!canEdit}
                className="text-sm h-8 flex-1"
              />
              {url.trim() && (
                <a
                  href={url.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-colors shrink-0"
                  title="Abrir enlace"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {canEdit && url.trim() && (
                <button
                  type="button"
                  className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors shrink-0"
                  onClick={() => clearUrl(idx)}
                  title="Quitar URL"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {canEdit && (
        <p className="text-xs text-slate-400">
          Suba las fotos a Google Drive, copie el enlace compartido y péguelo aquí.
        </p>
      )}

      {!canEdit && filledCount === 0 && (
        <p className="text-xs text-slate-400 text-center py-2">Sin URLs de fotos registradas.</p>
      )}
    </div>
  );
}
