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

export class UnauthorizedError extends Error {
  constructor(message = "Não autenticado") {
    super(message);
    this.name = "UnauthorizedError";
  }
}
