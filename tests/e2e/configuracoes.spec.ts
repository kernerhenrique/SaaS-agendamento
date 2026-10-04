import { expect, test } from "@playwright/test";

import { loginAsOwner } from "./helpers";

/** Bloco 6B: tela de Configurações salva por seção e a página pública reflete (capa, horário, políticas). */
test("configurações salvam capa, horário e janela e aparecem na página pública", async ({ page }) => {
  await loginAsOwner(page);
  const api = page.request;
  const original = (await (await api.get("/api/admin/business")).json()).business;

  try {
    await page.goto("/admin/configuracoes");
    await expect(page.getByRole("heading", { name: "Configurações", level: 1 })).toBeVisible();
    await expect(page.getByLabel("Link da página de reservas")).toHaveValue(/\/navalha-de-ouro$/);

    // Identidade: capa por link, com prévia.
    const identidade = page.locator("#identidade");
    await identidade.getByLabel("Capa (opcional)").fill("https://example.com/capa-e2e.jpg");
    await expect(identidade.getByAltText("Prévia da capa")).toHaveAttribute("src", "https://example.com/capa-e2e.jpg");
    await identidade.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Alterações salvas").first()).toBeVisible();

    // Horário: seg a sáb (preenche cada dia, sem depender do que já estava salvo).
    const horario = page.locator("#horario");
    const fillWeek = async (end: string) => {
      for (const day of ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]) {
        const checkbox = horario.getByRole("checkbox", { name: day });
        if (!(await checkbox.isChecked())) await checkbox.click();
        await horario.getByLabel(`${day}: início`).fill("09:00");
        await horario.getByLabel(`${day}: fim`).fill(end);
      }
    };
    // Fechar às 18:00 deixaria o Marcos (até 19:00) fora do horário: recusado, com o nome dele.
    await fillWeek("18:00");
    const sunday = horario.getByRole("checkbox", { name: "Domingo" });
    if (await sunday.isChecked()) await sunday.click();
    await horario.getByRole("button", { name: "Salvar" }).click();
    await expect(horario.getByText(/Marcos Estilista/)).toBeVisible();
    // Até as 19:00 cabe a equipe toda.
    await fillWeek("19:00");
    await expect(horario.getByText("Seg a Sáb")).toBeVisible();
    await horario.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Alterações salvas").first()).toBeVisible();

    // Reservas: agenda aberta para 14 dias; a prévia muda na hora.
    const reservas = page.locator("#reservas");
    await reservas.getByRole("combobox", { name: "Agenda aberta para" }).click();
    await page.getByRole("option", { name: "14 dias" }).click();
    await expect(reservas.getByText("Agenda aberta para os próximos 14 dias")).toBeVisible();
    await reservas.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Alterações salvas").first()).toBeVisible();

    // Página pública: capa, horário agrupado e políticas.
    await page.goto("/navalha-de-ouro");
    await expect(page.locator('img[src="https://example.com/capa-e2e.jpg"]')).toBeAttached();
    await page.locator("details summary").click();
    await expect(page.getByText("Seg a Sáb")).toBeVisible();
    await expect(page.getByText("Agenda aberta para os próximos 14 dias")).toBeVisible();
  } finally {
    await api.patch("/api/admin/business", {
      data: { secao: "identidade", logoUrl: original.logoUrl, coverUrl: original.coverUrl, accentColor: original.accentColor },
    });
    await api.patch("/api/admin/business", {
      data: {
        secao: "reservas",
        minBookingNoticeMinutes: original.minBookingNoticeMinutes,
        maxBookingWindowDays: original.maxBookingWindowDays,
        cancellationDeadlineHours: original.cancellationDeadlineHours,
        policyText: original.policyText,
      },
    });
    await api.put("/api/admin/business/hours", { data: { hours: original.workingHours } });
  }
});
