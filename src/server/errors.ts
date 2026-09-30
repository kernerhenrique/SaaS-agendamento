export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  /** Código estável para a tela reagir a um erro específico (ex.: oferecer "mesmo assim"). */
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ValidationError";
    this.code = code;
  }
}

/** Logado, mas sem permissão para esta ação (ex.: profissional no Financeiro). */
export class ForbiddenError extends Error {
  constructor(message = "Você não tem permissão para esta ação") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Não autenticado") {
    super(message);
    this.name = "UnauthorizedError";
  }
}
