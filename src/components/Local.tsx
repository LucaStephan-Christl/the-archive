import type { ReactNode } from "react";

/**
 * A name in the destination's own script (東京, 伏見稲荷大社, Ísland). The
 * `lang` attribute matters: it makes the browser pick Japanese glyph forms
 * (not Chinese ones) for kanji, and tells screen readers how to read it.
 */
export default function Local({
  children,
  lang = "ja",
  className = "",
}: {
  children?: ReactNode;
  lang?: string;
  className?: string;
}) {
  if (!children) return null;
  return (
    <span lang={lang} className={`font-jp tracking-normal normal-case ${className}`}>
      {children}
    </span>
  );
}
