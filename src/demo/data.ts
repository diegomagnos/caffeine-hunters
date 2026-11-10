// Somente dados sintéticos públicos. Não inserir notas de terceiros neste módulo.
export type DemoGroup = {
  id: string;
  name: string;
  description: string;
  members: readonly { name: string; role: string }[];
  initials: string;
  cycleId?: string;
};
export type DemoCycle = {
  id: string;
  groupId: string;
  name: string;
  period: string;
  deadline: string;
  ruleVersion: string;
  frequency: string;
  minimumGrams: number;
};
export type DemoContribution = {
  id: string;
  cycleId: string;
  name: string;
  brand: string;
  quantity: number;
  author: string;
  origin: string;
  roast: string;
  presentation: string;
};
export const profile = {
  name: "Alex",
  role: "Participante demonstrativo",
  initials: "AL",
};
export const groups: readonly DemoGroup[] = [
  {
    id: "mesa-do-cafe",
    name: "Mesa do Café",
    description: "Uma mesa, diferentes origens e muitas descobertas.",
    members: [
      { name: "Marina", role: "Criadora original e administradora" },
      { name: "João", role: "Administrador" },
      { name: "Alex", role: "Participante" },
    ],
    initials: "MC",
    cycleId: "novembro",
  },
  {
    id: "primeira-xicara",
    name: "Primeira Xícara",
    description: "Um novo encontro para quem quer explorar o café.",
    members: [{ name: "Alex", role: "Criador original e administrador" }],
    initials: "PX",
  },
];
export const cycles: readonly DemoCycle[] = [
  {
    id: "novembro",
    groupId: "mesa-do-cafe",
    name: "Origens do Brasil",
    period: "Novembro de 2026",
    deadline: "30 de novembro de 2026 · data ilustrativa",
    ruleVersion: "Versão 1 · exemplo",
    frequency: "Mensal",
    minimumGrams: 250,
  },
];
export const contributions: readonly DemoContribution[] = [
  {
    id: "serra-do-sol",
    cycleId: "novembro",
    name: "Serra do Sol",
    brand: "Torrefação Horizonte",
    quantity: 250,
    author: "Marina (fictícia)",
    origin: "Cerrado Mineiro",
    roast: "Média",
    presentation: "Em grãos",
  },
  {
    id: "vale-sereno",
    cycleId: "novembro",
    name: "Vale Sereno",
    brand: "Café do Vale",
    quantity: 250,
    author: "Alex (você, perfil fictício)",
    origin: "Mantiqueira de Minas",
    roast: "Média clara",
    presentation: "Moído",
  },
];
export const sensoryAttributes = [
  "Aroma",
  "Sabor",
  "Acidez",
  "Corpo",
  "Finalização",
] as const;
export const groupHref = (id: string) => `/grupos/${id}/`;
export const cycleHref = (id: string) => `/ciclos/${id}/`;
export const reviewHref = (id: string) => `/avaliacoes/${id}/`;
