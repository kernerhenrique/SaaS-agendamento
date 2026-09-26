// Arquivo sem "use client" de propósito: o layout (servidor) lê esta constante.
// Exportada de um módulo "use client", ela chegaria ao servidor como uma
// referência de cliente, não como o texto — e o cookie nunca seria encontrado.
export const SIDEBAR_COOKIE = "admin-sidebar";
