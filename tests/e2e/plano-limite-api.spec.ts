import { expect, test } from "@playwright/test";

import { setProfessionalLimit } from "./db";
import { loginAsOwner } from "./helpers";

/**
 * Limite do plano (Fase 0 do modo solo): com limite, não dá para ter mais profissionais
 * ATIVOS do que o plano permite; sem limite (todos os negócios de hoje), nada muda.
 */
test("limite do plano: recusa o profissional ativo a mais, deixa cadastrar pausado e editar quem já existe", async ({ page }) => {
  await loginAsOwner(page);
  const api = page.request;
  const pros = (await (await api.get("/api/admin/professionals")).json()).professionals as { id: string; name: string; active: boolean }[];
  const active = pros.filter((p) => p.active);
  const body = (name: string, isActive: boolean) => ({ name, active: isActive, serviceIds: [], workingHours: [] });
  let createdId: string | null = null;

  try {
    await setProfessionalLimit("navalha-de-ouro", active.length);

    // Mais um ativo: recusado, com a mensagem do plano.
    const refused = await api.post("/api/admin/professionals", { data: body("Limite E2E", true) });
    expect(refused.status()).toBe(400);
    const refusedBody = await refused.json();
    expect(refusedBody.code).toBe("PLAN_LIMIT");
    expect(refusedBody.error).toContain(`até ${active.length} profissionais ativos`);

    // Pausado entra (não conta); ativá-lo depois é recusado.
    const paused = await api.post("/api/admin/professionals", { data: body("Limite E2E", false) });
    expect(paused.status()).toBe(201);
    createdId = (await paused.json()).professional.id as string;
    const activate = await api.patch(`/api/admin/professionals/${createdId}`, { data: body("Limite E2E", true) });
    expect(activate.status()).toBe(400);
    expect((await activate.json()).code).toBe("PLAN_LIMIT");

    // Editar quem já está ativo continua livre.
    const existing = (await (await api.get(`/api/admin/professionals/${active[0].id}`)).json()).professional;
    const edit = await api.patch(`/api/admin/professionals/${active[0].id}`, {
      data: {
        name: existing.name,
        active: true,
        bio: existing.bio,
        specialty: existing.specialty,
        color: existing.color,
        photoUrl: existing.photoUrl,
        photoUrls: existing.photos.map((photo: { url: string }) => photo.url),
        serviceIds: existing.professionalServices.map((ps: { serviceId: string }) => ps.serviceId),
        workingHours: existing.workingHours,
      },
    });
    expect(edit.status()).toBe(200);
  } finally {
    await setProfessionalLimit("navalha-de-ouro", null);
    if (createdId) await api.delete(`/api/admin/professionals/${createdId}`);
  }

  // Sem limite (o padrão): o mesmo cadastro ativo passa.
  const free = await api.post("/api/admin/professionals", { data: body("Sem Limite E2E", true) });
  expect(free.status()).toBe(201);
  await api.delete(`/api/admin/professionals/${(await free.json()).professional.id}`);
});
