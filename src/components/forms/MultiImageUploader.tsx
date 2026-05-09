import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  bucket?: string;
  folder: string;
  prefix?: string;
  values: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  maxMB?: number;
}

const MultiImageUploader = ({
  bucket = "itinerary-images",
  folder,
  prefix = "img",
  values,
  onChange,
  max = 10,
  maxMB = 8,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const remaining = Math.max(0, max - values.length);

  const upload = async (files: File[]) => {
    if (files.length === 0) return;
    const allowed = files.slice(0, remaining);
    if (files.length > allowed.length) toast.warning(`Only ${remaining} more image(s) allowed`);
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of allowed) {
      if (!file.type.startsWith("image/")) { toast.error(`${file.name}: not an image`); continue; }
      if (file.size > maxMB * 1024 * 1024) { toast.error(`${file.name}: over ${maxMB} MB`); continue; }
      try {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${folder}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file, {
          upsert: true, cacheControl: "3600", contentType: file.type,
        });
        if (error) throw error;
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        uploaded.push(data.publicUrl);
      } catch (e: any) {
        toast.error(e.message || `${file.name}: upload failed`);
      }
    }
    if (uploaded.length) {
      onChange([...values, ...uploaded]);
      toast.success(`${uploaded.length} image(s) uploaded`);
    }
    setUploading(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) upload(files);
  };

  const removeAt = (idx: number) => onChange(values.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {values.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {values.map((url, i) => (
            <div key={i} className="relative group">
              <img src={url} alt={`Image ${i + 1}`} className="w-full h-24 object-cover rounded-md border border-border/40"
                onError={(e) => ((e.currentTarget as HTMLImageElement).src = "/placeholder.svg")} />
              <button type="button" onClick={() => removeAt(i)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border/60 hover:border-border"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length) upload(files); e.target.value = ""; }}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2"><Loader2 className="h-5 w-5 animate-spin text-primary" /><p className="text-xs text-muted-foreground">Uploading…</p></div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs">Drag & drop or <span className="text-primary underline">click to browse</span> — multiple OK</p>
              <p className="text-[10px] text-muted-foreground">{values.length}/{max} images, up to {maxMB} MB each</p>
            </div>
          )}
        </div>
      )}

      {remaining === 0 && (
        <p className="text-[10px] text-muted-foreground text-center">Maximum {max} images reached. Remove one to add more.</p>
      )}
    </div>
  );
};

export default MultiImageUploader;