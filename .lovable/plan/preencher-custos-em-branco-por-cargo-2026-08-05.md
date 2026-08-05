# Preencher custos em branco por cargo

Aplicar, nos perfis que hoje estão sem custo, os valores de referência que já existem no app para o mesmo cargo. A correspondência é feita pelo **cargo normalizado** (sem acentos, maiúsculas/minúsculas e variações de gênero), com prioridade para o cargo mais específico.

## Valores que serão aplicados

| Cargo (normalizado) | Custo |
|---|---|
| Enfermeira / Enfermeiro (todas as áreas) | R$ 3.695,11 |
| Enfermeira Líder | R$ 3.800,00 |
| Supervisão / Supervisora de Enfermagem | R$ 3.965,00 |
| Médico / Médica | R$ 12.194,47 |
| Diretor Médico | R$ 20.000,00 |
| Diretora Médica | R$ 16.000,00 |
| Biomédico | R$ 5.000,00 |
| Nutricionista | R$ 3.400,00 (média das faixas 3.200–3.600) |
| Coordenadora de Nutrição | R$ 10.000,00 |
| Fisioterapeuta | R$ 3.000,00 (média 2.600–3.500) |
| Técnica de Enfermagem | R$ 1.600,00 |
| Assistente Administrativo | R$ 2.282,37 |
| TI | R$ 2.500,00 |
| Ouvidor / Ouvidora | R$ 3.000,00 |
| Engenheira de Segurança do Trabalho | R$ 4.000,00 |
| Coordenador de Higienização | R$ 7.000,00 |
| Coordenador(a) de Atendimento | R$ 10.000,00 |
| Coordenador(a) de Saúde Funcional | R$ 7.000,00 |
| Coordenação (Farmácia) | R$ 9.521,36 |
| Coordenação de Cuidados Interdisciplinares | R$ 8.000,00 |
| Coordenador genérico (UTI, Same, Atendimento) | R$ 8.000,00 |
| Supervisor (Radiologia) | R$ 2.561,00 |
| Supervisor(a) de Infraestrutura | R$ 3.100,00 |
| Assessor(a) de Comunicação | R$ 8.000,00 |
| Assessor(a) — Qualidade | R$ 4.900,00 |
| Psicóloga | R$ 3.430,86 |

## Não serão alterados

Perfis cujo cargo não tem referência no app ficam em branco, aguardando os valores que você informar:
Dentista, Psicopedagogia, Práticas Integrativas, Fonoaudióloga, Farmacêutico(a), Téc. Segurança do Trabalho/SESMT, Analista (Ensino e Pesquisa), Analista Administrativo, Diretor(a) de Ensino e Pesquisa, Coord. Adm/Fin, Coordenador(a) de Manutenção e Infraestrutura, Coordenadora de Tecnologia Médica, Coordenação/Supervisão de RH, Coordenação Psicossocial, Supervisor de Atendimento, Supervisor de Hospitalidade, Supervisora Bloco CME, Líder (SADT), Nutricionista Líder, Enfermeira Navegadora, Assistente de Relacionamento Médico, Aprendiz Assistente Administrativo, Enfermaria (E-DOT).

## Regras de segurança

- Só perfis com custo atualmente **em branco** são tocados; nenhum valor existente é sobrescrito.
- Cada registro atualizado é marcado como confidencial (não aparece para o próprio colaborador em Configurações), mantendo o padrão já adotado.
- Nenhuma mudança de interface: os valores aparecem em Admin → Gestão de Usuários, coluna **Custo**.

## Detalhes técnicos

- Uma única operação de dados (`UPDATE public.profiles`) usando `CASE` sobre o cargo normalizado (`lower(unaccent(trim(role)))`), com `WHERE salary IS NULL`, definindo `salary` e `salary_opt_out = true`.
- Sem migração de schema e sem alteração de código do app.
- Após aplicar, relatório de quantos perfis foram atualizados por cargo.
