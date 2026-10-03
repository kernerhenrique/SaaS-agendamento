"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CircleCheck, Download, FileSpreadsheet, Upload } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { lowerTerm } from "@/config/vertical";
import { useVertical } from "@/config/vertical-context";
import { formatPhoneBR } from "@/lib/phone";
import { IMPORT_MAX_ROWS, IMPORT_TEMPLATE_CSV } from "@/server/modules/client/client-import";

interface ImportResponse {
  validCount: number;
  preview: { line: number; name: string; phone: string; email: string | null; tags: string[] }[];
  errors: { line: number; message: string }[];
  duplicatesInFile: { line: number; message: string }[];
  newCount: number;
  existingCount: number;
  created: number;
  updated: number;
  existingSample: { line: number; name: string; currentName: string }[];
}

const COLUMNS: { name: string; required: boolean; example: string; rule: string }[] = [
  { name: "nome", required: true, example: "Maria Silva", rule: "Nome completo." },
  { name: "telefone", required: true, example: "(11) 99999-0000", rule: "Com DDD. Pode ter parênteses, traço, espaço ou +55." },
  { name: "email", required: false, example: "maria@email.com", rule: "Opcional." },
  { name: "observacoes", required: false, example: "Prefere horário da manhã", rule: "Opcional: vira as notas internas da ficha." },
  { name: "tags", required: false, example: "Fiel, VIP", rule: "Opcional: separe com vírgula." },
];

/**
 * Importar clientes em 3 passos: entender o formato (com o modelo para baixar),
 * escolher o arquivo e conferir a prévia antes de gravar. Nada é gravado até
 * "Importar"; telefone repetido nunca duplica o cliente.
 */
export function ImportClientsView() {
  const { terms } = useVertical();
  const clients = lowerTerm(terms.client.plural);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csv, setCsv] = useState("");
  const [mode, setMode] = useState<"skip" | "update">("skip");
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [done, setDone] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function send(content: string, apply: boolean, importMode = mode) {
    setError(null);
    setIsBusy(true);
    try {
      const response = await fetch("/api/admin/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: content, mode: importMode, apply }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Não foi possível ler a planilha");
        return;
      }
      if (apply) setDone(data as ImportResponse);
      else setResult(data as ImportResponse);
    } catch {
      setError("Sem conexão. Tente de novo.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setResult(null);
    setDone(null);
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setError("Use um arquivo .csv (veja abaixo como salvar a planilha nesse formato).");
      return;
    }
    const content = await file.text();
    setFileName(file.name);
    setCsv(content);
    await send(content, false);
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([IMPORT_TEMPLATE_CSV], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo-clientes.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-2">
        <Link href="/admin/clientes" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          {terms.client.plural}
        </Link>
        <h1 className="text-page-title font-bold">Importar planilha</h1>
        <p className="text-sm text-muted-foreground">
          Traga os {clients} de outro sistema ou da sua planilha. Você confere tudo antes de gravar.
        </p>
      </div>

      {done ? (
        <div role="status" className="flex flex-col gap-3 rounded-lg border border-success/30 bg-success/10 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <CircleCheck className="size-5 shrink-0 text-success" aria-hidden />
            Importação concluída: {done.created} {done.created === 1 ? "novo" : "novos"}
            {done.updated > 0 ? `, ${done.updated} ${done.updated === 1 ? "atualizado" : "atualizados"}` : ""}.
          </p>
          <Link href="/admin/clientes" className={buttonVariants({ className: "w-full sm:w-fit" })}>
            Ver {clients}
          </Link>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-section-title">1. Como a planilha deve estar</CardTitle>
          <CardDescription>
            Uma linha por cliente e, na primeira linha, os nomes das colunas abaixo (em qualquer ordem). Até {IMPORT_MAX_ROWS}{" "}
            {clients} por arquivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coluna</TableHead>
                <TableHead>Exemplo</TableHead>
                <TableHead className="hidden sm:table-cell">Regra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {COLUMNS.map((column) => (
                <TableRow key={column.name}>
                  <TableCell className="font-medium">
                    {column.name}
                    {column.required ? <span className="text-destructive"> *</span> : null}
                  </TableCell>
                  <TableCell>{column.example}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{column.rule}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-caption text-muted-foreground">
            * obrigatória. Também aceitamos &quot;whatsapp&quot; ou &quot;celular&quot; no lugar de telefone, e &quot;obs&quot; ou
            &quot;notas&quot; no lugar de observacoes. {terms.client.plural} com o mesmo telefone de quem já está cadastrado não são
            duplicados.
          </p>
          <Button variant="outline" className="w-full sm:w-fit" onClick={downloadTemplate}>
            <Download />
            Baixar modelo
          </Button>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <FileSpreadsheet className="size-4 text-primary" aria-hidden />
                No Excel
              </p>
              <ol className="ml-5 list-decimal text-muted-foreground">
                <li>Abra o modelo (ou a sua planilha) e preencha.</li>
                <li>
                  <strong className="text-foreground">Arquivo › Salvar como</strong>.
                </li>
                <li>
                  Em tipo, escolha <strong className="text-foreground">CSV UTF-8 (separado por vírgulas)</strong> ou{" "}
                  <strong className="text-foreground">CSV (separado por ponto e vírgula)</strong> e salve.
                </li>
              </ol>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <FileSpreadsheet className="size-4 text-primary" aria-hidden />
                No Google Planilhas
              </p>
              <ol className="ml-5 list-decimal text-muted-foreground">
                <li>
                  <strong className="text-foreground">Arquivo › Importar</strong> o modelo, ou use a sua planilha.
                </li>
                <li>
                  <strong className="text-foreground">Arquivo › Fazer download</strong>.
                </li>
                <li>
                  Escolha <strong className="text-foreground">Valores separados por vírgula (.csv)</strong>.
                </li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-section-title">2. Escolha o arquivo</CardTitle>
          <CardDescription>Arquivo .csv salvo como no passo 1. Nada é gravado ainda.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <label
            htmlFor="import-file"
            className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm hover:bg-muted focus-within:ring-3 focus-within:ring-ring/50"
          >
            <Upload className="size-6 text-muted-foreground" aria-hidden />
            <span className="font-medium">{fileName ?? "Toque para escolher a planilha"}</span>
            <span className="text-caption text-muted-foreground">.csv, até 1 MB</span>
            <input id="import-file" type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void handleFile(event)} />
          </label>
          {isBusy && !result ? <p className="text-sm text-muted-foreground">Lendo a planilha…</p> : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {result && !done ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-section-title">3. Confira e importe</CardTitle>
            <CardDescription>
              {result.validCount} {result.validCount === 1 ? "linha pronta" : "linhas prontas"}: {result.newCount}{" "}
              {result.newCount === 1 ? "novo" : "novos"} e {result.existingCount} já {result.existingCount === 1 ? "cadastrado" : "cadastrados"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {result.preview.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Linha</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="hidden sm:table-cell">E-mail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.preview.map((row) => (
                      <TableRow key={row.line}>
                        <TableCell className="text-muted-foreground">{row.line}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{formatPhoneBR(row.phone)}</TableCell>
                        <TableCell className="hidden sm:table-cell">{row.email ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {result.validCount > result.preview.length ? (
                  <p className="pt-2 text-caption text-muted-foreground">e mais {result.validCount - result.preview.length}…</p>
                ) : null}
              </div>
            ) : null}

            {result.errors.length > 0 || result.duplicatesInFile.length > 0 ? (
              <div className="flex flex-col gap-1 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />
                  {result.errors.length + result.duplicatesInFile.length}{" "}
                  {result.errors.length + result.duplicatesInFile.length === 1 ? "linha ficará" : "linhas ficarão"} de fora
                  (corrija na planilha e escolha o arquivo de novo, se quiser):
                </p>
                <ul className="ml-6 list-disc text-muted-foreground">
                  {[...result.errors, ...result.duplicatesInFile].slice(0, 15).map((problem) => (
                    <li key={`${problem.line}-${problem.message}`}>
                      Linha {problem.line}: {problem.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {result.existingCount > 0 ? (
              <fieldset className="flex flex-col gap-2">
                <legend className="pb-1 text-sm font-medium">
                  {result.existingCount} {result.existingCount === 1 ? "já está cadastrado" : "já estão cadastrados"} (mesmo telefone). O que fazer?
                </legend>
                {[
                  { value: "skip" as const, label: "Pular: manter o cadastro como está" },
                  { value: "update" as const, label: "Atualizar: usar o nome e o e-mail da planilha e somar observações e tags" },
                ].map((option) => (
                  <label key={option.value} className="flex items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="import-mode"
                      value={option.value}
                      checked={mode === option.value}
                      onChange={() => setMode(option.value)}
                      className="mt-1 accent-primary"
                    />
                    {option.label}
                  </label>
                ))}
              </fieldset>
            ) : null}

            <Button className="w-full sm:w-fit" disabled={isBusy || result.validCount === 0} onClick={() => void send(csv, true)}>
              {isBusy ? "Importando…" : result.validCount === 0 ? "Nenhuma linha para importar" : `Importar ${result.validCount} ${result.validCount === 1 ? "linha" : "linhas"}`}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
