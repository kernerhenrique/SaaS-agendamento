import { requirePagePermission } from "@/server/modules/auth/page-access";

/** Style guide: ferramenta do dono (e de quem mantém o produto), não da equipe. */
export default async function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  await requirePagePermission("settings.manage");
  return children;
}
