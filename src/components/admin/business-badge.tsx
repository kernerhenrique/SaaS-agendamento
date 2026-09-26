import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/text";

export function BusinessBadge({
  name,
  logoUrl,
  compact = false,
}: {
  name: string;
  logoUrl: string | null;
  compact?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2" title={compact ? name : undefined}>
      <Avatar size="sm">
        <AvatarImage src={logoUrl ?? undefined} alt="" />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      {compact ? null : <p className="truncate text-sm font-semibold">{name}</p>}
    </div>
  );
}
