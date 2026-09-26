/**
 * Ordem dos serviços (Service.position). A tela agrupa por categoria, então
 * "subir/descer" troca de lugar com o vizinho da MESMA categoria. Puro e
 * testado em tests/unit/service-order.spec.ts.
 */
export type MoveDirection = "up" | "down";

/**
 * Recebe os serviços na ordem atual e devolve a nova ordem de ids. Sem vizinho
 * na direção pedida (primeiro/último do grupo), devolve a ordem inalterada.
 */
export function moveWithinCategory(
  services: { id: string; categoryId: string | null }[],
  id: string,
  direction: MoveDirection,
): string[] {
  const ids = services.map((s) => s.id);
  const index = services.findIndex((s) => s.id === id);
  if (index === -1) return ids;
  const categoryId = services[index].categoryId;
  const step = direction === "up" ? -1 : 1;

  for (let j = index + step; j >= 0 && j < services.length; j += step) {
    if (services[j].categoryId === categoryId) {
      [ids[index], ids[j]] = [ids[j], ids[index]];
      return ids;
    }
  }
  return ids;
}
