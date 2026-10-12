/**
 * Rótulos curtos para abas: o primeiro nome. Com tratamento ("Dra. Ana") o nome vai
 * junto, e se dois ficarem iguais ("João Silva" e "João Souza") vale o nome inteiro.
 */
export function shortNames(names: string[]): string[] {
  const short = names.map((name) => {
    const [first = "", second] = name.trim().split(/\s+/);
    return first.endsWith(".") && second ? `${first} ${second}` : first;
  });
  return short.map((label, index) => (short.filter((other) => other === label).length > 1 ? names[index].trim() : label));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}
