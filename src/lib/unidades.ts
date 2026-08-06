/** Unidades FGH — usadas no cadastro do usuário e na classificação de e-mails. */
export const UNIDADES = [
  "Hospital Dom Hélder",
  "UPAEs",
  "Hospital Miguel Arraes",
  "Hospital Alfa",
  "Hospital da Criança",
  "NGC",
  "Hospital Pelópidas Silveira",
  "Hospital Eduardo Campos",
  "UPAs",
  "Outra unidade",
] as const;

/** Mapeamento domínio de e-mail → unidade institucional. */
export const DOMAIN_TO_UNIT: Record<string, string> = {
  "hdh.fghsaude.org.br": "Hospital Dom Hélder",
  "upae.fghsaude.org.br": "UPAEs",
  "hma.fghsaude.org.br": "Hospital Miguel Arraes",
  "alfa.fghsaude.org.br": "Hospital Alfa",
  "hcr.fghsaude.org.br": "Hospital da Criança",
  "fghsaude.org.br": "NGC",
  "hps.fghsaude.org.br": "Hospital Pelópidas Silveira",
  "hec.fghsaude.org.br": "Hospital Eduardo Campos",
  "upa.fghsaude.org.br": "UPAs",
};

export const OUTROS_EMAILS = "Outros e-mails";

export const unitFromEmail = (email?: string | null): string => {
  const domain = (email || "").trim().toLowerCase().split("@")[1];
  if (!domain) return OUTROS_EMAILS;
  return DOMAIN_TO_UNIT[domain] || OUTROS_EMAILS;
};
