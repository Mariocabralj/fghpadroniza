# Numeração dinâmica de tópicos no editor

## Problema
Hoje a numeração vive dentro do texto: o conteúdo padronizado é uma string única e a função `reindexNumbering` tenta reescrever os números por expressão regular ao sair do campo (`onBlur`), no refinamento por IA e na exportação. Como o número é texto estático digitado na linha, apagar um item não reordena nada até que a normalização rode — e quando roda, depende de o padrão do texto estar perfeito.

## Solução
Passar o editor a trabalhar com uma **estrutura de dados de tópicos**, não com números escritos no texto.

### 1. Modelo de dados
Cada bloco do documento vira um objeto no estado do componente:

```text
{ id, level (1|2|3), text, kind: "heading" | "paragraph" | "image" | "table" }
```

Uma lista ordenada desses objetos representa o documento inteiro. Nenhum objeto guarda "1.2" — guarda apenas o nível e o texto do título.

### 2. Numeração calculada na renderização
Ao desenhar a tela, o sistema percorre a lista e calcula os contadores por nível (nível 1 = posição entre as seções, nível 2 = posição dentro da seção atual, nível 3 = dentro da subseção). O número aparece como rótulo à esquerda do campo de edição, fora do texto editável — o usuário não consegue digitar nem apagar o número.

### 3. Reindexação instantânea
Excluir, mover ou mudar o nível de um item altera apenas o array; a numeração é recalculada na mesma renderização. Apagar "1.1" faz o antigo "1.2" virar "1.1" imediatamente, sem lacunas. Profundidade continua limitada a 3 níveis (Norma Zero).

### 4. Novo modo "Estrutura" no Workspace
O painel do Documento Padronizado passa a ter três modos: **Visualizar**, **Estrutura** (novo editor de tópicos com numeração dinâmica, botões de excluir, subir/descer e recuar/avançar nível) e **Editar** (texto livre, mantido para quem prefere).

### 5. Conversão texto ⇄ estrutura
- Ao entrar no modo Estrutura, o texto atual é convertido em lista de blocos: números existentes são removidos e transformados em nível.
- Ao sair (ou ao exportar/pré-visualizar/refinar), a lista é serializada de volta para texto já com a numeração correta gerada pelo cálculo — nunca pela regex antiga.
- Marcadores `[IMAGEM:id]` viram blocos próprios e nunca são editáveis nem removidos por acidente.

## Detalhes técnicos
- Novo `src/lib/doc-outline.ts`: tipos `OutlineBlock`, `parseOutline(text)`, `serializeOutline(blocks)` (aplica a numeração no momento da serialização) e `computeNumbers(blocks)`.
- Novo componente `src/components/OutlineEditor.tsx`: lista controlada, `key` por `id` estável, ações excluir / mover / indentar / desindentar / inserir abaixo.
- `src/pages/Workspace.tsx`: estado passa a manter os blocos como fonte de verdade quando em modo Estrutura; `standardized` é derivado via `serializeOutline` antes de preview, refino e exportação.
- `reindexNumbering` permanece em `docx-export.ts` e no fluxo da IA (`Analysis.tsx`) como rede de segurança para conteúdo vindo do modelo, mas deixa de ser o mecanismo do editor.
- Sem mudanças de banco de dados nem de edge functions.
