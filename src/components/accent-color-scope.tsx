import { getAccentCssVars } from "@/lib/accent-color";

export function AccentColorScope({
  accentColor,
  className,
  children,
}: {
  accentColor: string | null | undefined;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className} style={getAccentCssVars(accentColor)}>
      {children}
    </div>
  );
}
