import { expect, test } from "@playwright/test";

import { loginAsOwner } from "./helpers";

/**
 * Bloco 6C: textos prontos do agendamento, lista de lembretes de amanhã
 * (enviar marca, desmarcar desfaz) e modelos editáveis. Nada é enviado de
 * verdade: o wa.me é interceptado. Tudo restaurado no fim.
 */
test("lembrete de amanhã sai com o texto pronto, marca enviado e o modelo é editável", async ({ page, context }) => {
  await context.route("https://wa.me/**", (route) => route.fulfill({ status: 200, body: "WhatsApp (simulado)" }));
  await loginAsOwner(page);
  const api = page.request;

  const professionals = (await (await api.get("/api/admin/professionals")).json()).professionals as { id: string; name: string }[];
  const services = (await (await api.get("/api/admin/services")).json()).services as { id: string; name: string }[];
  const joao = professionals.find((p) => p.name === "João Barbeiro")!;
  const corte = services.find((s) => s.name === "Corte de cabelo")!;

  // Amanhã à noite (encaixe fora do expediente); se o horário sorteado estiver ocupado, tenta o próximo.
  const tomorrow = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + 86_400_000));
  const clientName = `Lembrete E2E ${Date.now()}`;
  const first = Math.floor(Math.random() * 12);
  let hhmm = "";
  let appointmentId = "";
  for (let attempt = 0; attempt < 12 && !appointmentId; attempt++) {
    const minute = 20 * 60 + 15 * ((first + attempt) % 12);
    hhmm = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    const created = await api.post("/api/admin/appointments", {
      data: {
        professionalId: joao.id,
        serviceId: corte.id,
        startAt: `${tomorrow}T${hhmm}:00-03:00`,
        allowOutsideHours: true,
        client: { name: clientName, phone: `119${Date.now().toString().slice(-8)}` },
      },
    });
    if (created.status() === 201) appointmentId = (await created.json()).appointment.id as string;
  }
  expect(appointmentId, "horário livre amanhã à noite").not.toBe("");

  try {
    // Textos prontos do agendamento: três tipos, com nome, horário e link de gerenciar.
    const { messages } = await (await api.get(`/api/admin/appointments/${appointmentId}/messages`)).json();
    expect(messages.map((m: { kind: string }) => m.kind)).toEqual(["CONFIRMATION", "REMINDER", "FOLLOW_UP"]);
    const reminder = messages.find((m: { kind: string }) => m.kind === "REMINDER");
    expect(reminder.text).toContain("Oi, Lembrete!");
    expect(reminder.text).toContain(`às ${hhmm}`);
    expect(reminder.text).toMatch(/\/agendamento\/[\w-]+\/gerenciar/);
    expect(reminder.url).toMatch(/^https:\/\/wa\.me\/55\d+\?text=/);

    // Lista de lembretes: enviar abre o WhatsApp e marca; desmarcar desfaz.
    await page.goto("/admin/mensagens");
    const row = page.getByRole("listitem").filter({ hasText: clientName });
    await expect(row).toBeVisible();
    const popupPromise = page.waitForEvent("popup");
    await row.getByRole("link", { name: "Enviar lembrete" }).click();
    const popup = await popupPromise;
    expect(popup.url()).toContain("wa.me/55");
    await popup.close();
    await expect(row.getByText(/Enviado \d{2}:\d{2}/)).toBeVisible();
    await row.getByRole("button", { name: "Desmarcar" }).click();
    await expect(row.getByRole("link", { name: "Enviar lembrete" })).toBeVisible();

    // Modelo: variável errada avisa; salvar muda o texto do lembrete; restaurar volta ao padrão.
    await page.getByRole("tab", { name: "Modelos" }).click();
    await expect(page).toHaveURL(/aba=modelos/);
    const editor = page.getByLabel("Texto").nth(1);
    await editor.fill("Oi {nome}!");
    await expect(page.getByText("{nome} não existe")).toBeVisible();
    await editor.fill("Oi {primeiro_nome}, até amanhã às {hora}!");
    await page.getByRole("button", { name: "Salvar" }).nth(1).click();
    await expect(page.getByText("Modelo salvo")).toBeVisible();
    const after = (await (await api.get(`/api/admin/appointments/${appointmentId}/messages`)).json()).messages;
    expect(after.find((m: { kind: string }) => m.kind === "REMINDER").text).toBe(`Oi Lembrete, até amanhã às ${hhmm}!`);

    await page.getByRole("button", { name: "Restaurar padrão" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Restaurar padrão" }).click();
    await expect(page.getByText("Modelo padrão restaurado")).toBeVisible();
  } finally {
    await api.delete("/api/admin/messages/templates?kind=REMINDER");
    await api.patch(`/api/admin/appointments/${appointmentId}/status`, { data: { status: "CANCELLED" } });
  }
});
