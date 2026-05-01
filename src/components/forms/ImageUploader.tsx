import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Link2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageUploaderProps {
  /** Storage bucket name (must exist & be public). */
  bucket?: string;
  /** Folder/prefix inside the bucket — typically the entity id. */
  folder: string;
  /** Filename stem (no extension). The extension is taken from the uploaded file. */
  filename?: string;
  /** Current image URL (controlled). */
  value: string;
  /** Called with the new URL (storage public URL or pasted URL) or "" when removed. */
  onChange: (url: string) => void;
  /** Optional max size in MB. Default 8 MB. */
  maxMB?: number;
  className?: string;
  previewClassName?: string;
}

/**
 * Drag-drop / click-to-upload image picker with URL paste fallback.
 * Uploads to Supabase Storage and returns the public URL.
 */
const ImageUploader = ({
  bucket = "itinerary-images",
  folder,
  filename = "hero",
  value,
  onChange,
  maxMB = 8,
  className = "",
  previewClassName = "w-full h-48 object-cover rounded-lg",
}: ImageUploaderProps) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    if (file.size > maxMB * 1024 * 1024) { toast.error(`Image must be under ${maxMB} MB`); return; }

    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${folder}/${filename}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: true,
        cacheControl: "3600",
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const handleUrlSubmit = () => {
    const u = urlInput.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) { toast.error("URL must start with http(s)://"); return; }
    onChange(u);
    setUrlInput("");
    toast.success("Image URL added");
  };

  if (value) {
    return (
      <div className={`relative ${className}`}>
        <img src={value} alt="" className={previewClassName} />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="absolute top-2 right-2 text-xs h-7 rounded-md"
          onClick={() => onChange("")}
        >
          <X className="h-3 w-3 mr-1" />Remove
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInput.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border/60 hover:border-border"
        }`}
      >
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-foreground">Drag & drop an image, or <span className="text-primary underline">click to browse</span></p>
            <p className="text-[11px] text-muted-foreground">PNG, JPG, WebP up to {maxMB} MB</p>
          </div>
        )}
      </div>
      <div className="mt-3 flex gap-2 items-center">
        <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Or paste an image URL"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleUrlSubmit(); } }}
          className="rounded-md text-xs h-8"
        />
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs rounded-md shrink-0" onClick={handleUrlSubmit}>
          Use URL
        </Button>
      </div>
    </div>
  );
};

export default ImageUploader;