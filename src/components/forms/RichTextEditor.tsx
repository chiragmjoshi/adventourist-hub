import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered, Highlighter, AlignLeft, AlignCenter, AlignRight, Heading2, Undo2, Redo2 } from "lucide-react";
import { useEffect } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
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

const RichTextEditor = ({ value, onChange, placeholder, minHeight = 140 }: Props) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: false }),
      Placeholder.configure({ placeholder: placeholder || "Type here..." }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none px-3 py-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_mark]:bg-yellow-200 [&_mark]:rounded [&_mark]:px-0.5",
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

  return (
    <div className="border border-input rounded-md bg-background">
      <div className="flex items-center gap-0.5 border-b border-border/50 px-1.5 py-1 flex-wrap">
        <Btn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-3.5 w-3.5" /></Btn>
        <Btn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-3.5 w-3.5" /></Btn>
        <Btn title="Highlight" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter className="h-3.5 w-3.5" /></Btn>
        <Btn title="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-3.5 w-3.5" /></Btn>
        <span className="w-px h-4 bg-border/50 mx-1" />
        <Btn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-3.5 w-3.5" /></Btn>
        <Btn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-3.5 w-3.5" /></Btn>
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