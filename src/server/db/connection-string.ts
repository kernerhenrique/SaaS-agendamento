/**
 * O driver `pg` (pg-connection-string 2.x) já trata `sslmode=require` (e `prefer`,
 * `verify-ca`) como `verify-full`, e avisa no console que isso muda na próxima
 * versão grande. Escrever `verify-full` explicitamente mantém o comportamento de
 * hoje (conexão cifrada com o certificado verificado) e tira o aviso. As strings
 * de conexão (Vercel e `.env*`) não precisam mudar. Banco local, sem `sslmode`,
 * fica como está.
 */
export function withExplicitSslMode(connectionString: string | undefined): string | undefined {
  if (!connectionString) return connectionString;
  return connectionString.replace(/([?&])sslmode=(require|prefer|verify-ca)(?=&|$)/, "$1sslmode=verify-full");
}
