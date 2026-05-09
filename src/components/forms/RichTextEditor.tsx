import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Bold, Italic, List, ListOrdered, Highlighter, AlignLeft, AlignCenter, AlignRight, Heading2, Heading3, Undo2, Redo2, Link2, ImagePlus, Quote, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  /** Enables H3, Link, inline Image upload, and Blockquote toolbar buttons. */
  enableMedia?: boolean;
  /** Storage bucket used for inline image uploads (when enableMedia is true). */
  imageBucket?: string;
  /** Storage folder for inline image uploads. */
  imageFolder?: string;
}

const Btn = ({ active, onClick, children, title }: any) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={`h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${
      active ? "bg-primary/10 text-primary" : ""
    }`}
  >
    {children}
  </button>
);

const RichTextEditor = ({
  value,
  onChange,
  placeholder,
  minHeight = 140,
  enableMedia = false,
  imageBucket = "stories",
  imageFolder = "inline",
}: Props) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const baseExtensions = [
    StarterKit.configure({ heading: { levels: [2, 3] } }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Highlight.configure({ multicolor: false }),
    Placeholder.configure({ placeholder: placeholder || "Type here..." }),
  ];
  const mediaExtensions = enableMedia
    ? [
        Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { class: "text-primary underline" } }),
        Image.configure({ HTMLAttributes: { class: "rounded-lg my-3 max-w-full h-auto" } }),
      ]
    : [];

  const editor = useEditor({
    extensions: [...baseExtensions, ...mediaExtensions],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none px-3 py-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_mark]:bg-yellow-200 [&_mark]:rounded [&_mark]:px-0.5 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_a]:text-primary [&_a]:underline",
      },
    },
  });

  // Sync external value (e.g. when loaded from DB after mount)
  useEffect(() => {
    if (!editor) return;
    if ((value || "") !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  const promptLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please pick an image"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image must be under 8 MB"); return; }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${imageFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(imageBucket).upload(path, file, {
        upsert: false, cacheControl: "3600", contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(imageBucket).getPublicUrl(path);
      editor.chain().focus().setImage({ src: data.publicUrl, alt: file.name }).run();
      toast.success("Image inserted");
    } catch (e: any) {
      toast.error(e.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-input rounded-md bg-background">
      <div className="flex items-center gap-0.5 border-b border-border/50 px-1.5 py-1 flex-wrap">
        <Btn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-3.5 w-3.5" /></Btn>
        <Btn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-3.5 w-3.5" /></Btn>
        <Btn title="Highlight" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter className="h-3.5 w-3.5" /></Btn>
        <Btn title="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-3.5 w-3.5" /></Btn>
        {enableMedia && (
          <Btn title="Sub-heading" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-3.5 w-3.5" /></Btn>
        )}
        <span className="w-px h-4 bg-border/50 mx-1" />
        <Btn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-3.5 w-3.5" /></Btn>
        <Btn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-3.5 w-3.5" /></Btn>
        {enableMedia && (
          <Btn title="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-3.5 w-3.5" /></Btn>
        )}
        {enableMedia && (
          <>
            <span className="w-px h-4 bg-border/50 mx-1" />
            <Btn title="Link" active={editor.isActive("link")} onClick={promptLink}><Link2 className="h-3.5 w-3.5" /></Btn>
            <Btn title="Insert image" onClick={() => fileInput.current?.click()}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            </Btn>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }}
            />
          </>
        )}
        <span className="w-px h-4 bg-border/50 mx-1" />
        <Btn title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft className="h-3.5 w-3.5" /></Btn>
        <Btn title="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter className="h-3.5 w-3.5" /></Btn>
        <Btn title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight className="h-3.5 w-3.5" /></Btn>
        <span className="flex-1" />
        <Btn title="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo2 className="h-3.5 w-3.5" /></Btn>
        <Btn title="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo2 className="h-3.5 w-3.5" /></Btn>
      </div>
      <EditorContent editor={editor} style={{ minHeight }} className="text-sm" />
    </div>
  );
};

export default RichTextEditor;