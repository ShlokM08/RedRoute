import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "outline" | "solid" };
export function Button({ className = "", variant = "solid", ...props }: Props) {
  const base = "inline-flex items-center justify-center h-10 px-4 rounded-2xl text-sm font-semibold transition";
  const solid = "bg-[#E50914] text-white hover:opacity-90";
  const outline = "border border-white/15 bg-white/5 text-white hover:bg-white/10";
  return <button className={`${base} ${variant === "outline" ? outline : solid} ${className}`} {...props} />;
}
