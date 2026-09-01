export const DEFAULT_GUEST_CATEGORIES = [
  "Noivos",
  "Padrinhos Noiva",
  "Padrinhos Noivo",
  "Família Noiva",
  "Família Noivo",
  "Amigos Noiva",
  "Amigos Noivo",
  "Trabalho",
  "Igreja",
  "Padrinhos",
  "Staff",
  "Outros",
];

export const getGuestCategoryNames = (customCategories: Array<{ name: string }> = [], guests: Array<{ categoria: string }> = []) => {
  const names = new Set<string>();

  DEFAULT_GUEST_CATEGORIES.forEach((category) => names.add(category));
  customCategories.forEach((category) => {
    if (category.name?.trim()) names.add(category.name.trim());
  });
  guests.forEach((guest) => {
    if (guest.categoria?.trim()) names.add(guest.categoria.trim());
  });

  return Array.from(names).sort((a, b) => {
    if (a === "Outros") return 1;
    if (b === "Outros") return -1;
    return a.localeCompare(b, "pt-BR");
  });
};
