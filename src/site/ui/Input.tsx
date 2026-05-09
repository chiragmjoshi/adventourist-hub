import { useState, forwardRef } from "react";
import { cn } from "@/site/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  rows?: number;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { label: string; value: string }[];
  placeholder?: string;
}

const inputBase =
  "w-full bg-white border-2 rounded-xl px-4 pt-6 pb-2 font-body text-base text-ink placeholder-transparent transition-all duration-200 focus:outline-none focus:border-horizon peer";
const labelBase =
  "absolute left-4 top-4 font-body text-sm text-ink/50 transition-all duration-200 pointer-events-none peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-abyss";
const activeLabel = "top-1.5 text-xs text-abyss";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    // type="date" always shows browser placeholder (dd/mm/yyyy) so treat as always-active
    const hasValue = String(props.value ?? "").length > 0 || props.type === "date";

    return (
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          placeholder={label}
          className={cn(inputBase, error ? "border-red-400" : "border-ink/15", className)}
          style={{ fontSize: "16px" }}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(labelBase, hasValue ? activeLabel : "")}
        >
          {label}
        </label>
        {error && <p className="mt-1 text-xs text-red-500 font-body">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-ink/40 font-body">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, rows = 4, className, id, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    const hasValue = String(props.value ?? "").length > 0;

    return (
      <div className="relative">
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          placeholder={label}
          className={cn(
            "w-full bg-white border-2 rounded-xl px-4 pt-6 pb-3 font-body text-base text-ink placeholder-transparent transition-all duration-200 focus:outline-none focus:border-horizon resize-none peer",
            error ? "border-red-400" : "border-ink/15",
            className
          )}
          style={{ fontSize: "16px" }}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(labelBase, hasValue ? activeLabel : "")}
        >
          {label}
        </label>
        {error && <p className="mt-1 text-xs text-red-500 font-body">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export function Select({ label, error, options, placeholder, className, id, value, ...props }: SelectProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  const hasValue = Boolean(value);

  return (
    <div className="relative">
      <select
        id={inputId}
        value={value}
        className={cn(
          "w-full bg-white border-2 rounded-xl px-4 pb-2 font-body text-base text-ink transition-all duration-200 focus:outline-none focus:border-horizon appearance-none cursor-pointer",
          hasValue ? "pt-6" : "pt-4",
          error ? "border-red-400" : "border-ink/15",
          className
        )}
        style={{ fontSize: "16px" }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <label
        htmlFor={inputId}
        className={cn(
          "absolute left-4 font-body pointer-events-none transition-all duration-200 top-1.5 text-xs text-abyss",
          hasValue ? "opacity-100" : "opacity-0"
        )}
      >
        {label}
      </label>
      {/* Chevron */}
      <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40 pointer-events-none"  viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
      {error && <p className="mt-1 text-xs text-red-500 font-body">{error}</p>}
    </div>
  );
}
