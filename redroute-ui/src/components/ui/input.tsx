import * as React from "react";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const base = "h-12 w-full rounded-xl border border-white/20 bg-transparent px-3 text-white placeholder:text-white/50 outline-none";
  return <input {...props} className={`${base} ${props.className || ""}`} />;
}
