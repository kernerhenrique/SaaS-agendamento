import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getProfessionalColor } from "@/lib/professional-colors";
import { getInitials } from "@/lib/text";
import { cn } from "cn";

/**
 * Avatar do profissional com o anel na cor da agenda (quando escolhida) — o
 * mesmo marcador aparece nos cards, no perfil e no cabeçalho da agenda.
 */
export function ProfessionalAvatar({
  name,
  photoUrl,
  color,
  size = "default",
}: {
  name: string;
  photoUrl: string | null;
  color: string | null;
  size?: "sm" | "default" | "lg";
}) {
  const palette = getProfessionalColor(color);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full",
        palette ? ["border-2 p-0.5", palette.borderClass] : "border-2 border-transparent p-0.5",
      )}
    >
      <Avatar size={size}>
        <AvatarImage src={photoUrl ?? undefined} alt="" />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
    </span>
  );
}
