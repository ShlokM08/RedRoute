import * as React from "react";

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`rounded-3xl border border-white/10 bg-white/5 backdrop-blur ${props.className || ""}`} />;
}
export function CardContent(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`p-5 ${props.className || ""}`} />;
}
