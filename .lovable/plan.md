# Reestruturação do Treinamento de IA

Transformar `/admin/treinamento-ia` em um centro de governança auditável, dividido em 4 abas dentro da página existente (`src/pages/admin/AITraining.tsx`), mantendo o chat atual em uma das abas.

## Estrutura de Abas (Tabs shadcn)

1. **Chat & Diretrizes** — conteúdo atual (chat + diretrizes globais) preservado.
2. **System Prompt** — editor único do prompt institucional permanente.
3. **Snapshots & Auditoria** — versionamento com diff e rollback.
4. **Few-Shot (Gold Standards)** — pares Entrada → Saída Ideal.

Cada salvamento de diretriz/system prompt/few-shot dispara a **Matriz de Conflitos** (modal) antes de persistir.

## Banco de Dados (1 migration)

- `ai_system_prompt` — singleton (id fixo `'global'`), `content text`, `updated_by`, `updated_at`.
- `ai_few_shot_examples` — `title`, `input_text`, `ideal_output`, `doc_type`, `active`, `created_by`.
- `ai_snapshots` — `label`, `description`, `payload jsonb` (snapshot completo: system_prompt + diretivas + few-shots no momento), `diff jsonb` (lista de mudanças vs snapshot anterior), `created_by`.
- Todas com RLS: somente admins (`has_role(auth.uid(),'admin')`) podem ler/escrever. GRANT para `authenticated` e `service_role`.

## Edge Functions

- `ai-detect-conflict` — recebe `{ kind: 'directive'|'system_prompt'|'few_shot', content, existing[] }`, chama Gemini para detectar conflitos lógicos. Retorna `{ hasConflict: bool, conflicts: [{ id, reason }] }`.
- Atualizar `process-document` para incluir, no prompt: `ai_system_prompt.content` + diretivas ativas + few-shot examples ativos (como mensagens de exemplo).

## Frontend

### `src/pages/admin/AITraining.tsx`
Refatorar com `<Tabs>`. Cada aba em componente separado:

- `src/components/admin/ai-training/ChatPanel.tsx` — extrai chat + diretivas atuais.
- `src/components/admin/ai-training/SystemPromptPanel.tsx` — textarea grande, contador de chars, botão salvar (checa conflitos).
- `src/components/admin/ai-training/SnapshotsPanel.tsx` — botão "Criar snapshot agora" (captura estado atual + calcula diff), lista de cards expansíveis (`<Collapsible>`) mostrando label, autor, data, diff colorido (verde=add, vermelho=remove, amarelo=alterado) e botão "Reverter para este estado" com `<AlertDialog>` de confirmação.
- `src/components/admin/ai-training/FewShotPanel.tsx` — form (título, doc_type, input, ideal output) + lista com toggle ativo/inativo e excluir.
- `src/components/admin/ai-training/ConflictDialog.tsx` — modal que aparece quando edge function detecta conflito, opções: Sobrescrever / Criar Exceção (anexa "EXCEÇÃO:" ao conteúdo) / Cancelar.

### Estética "tech premium"
- Fonte mono (`font-mono`) para logs/diffs.
- Cards com borda fina, fundo `bg-card`, headers com badge de tipo.
- Diff renderizado em blocos estilo terminal com prefixos `+ / - / ~`.
- Cores semânticas existentes (`text-success`, `text-destructive`, `text-warning`).

## Algoritmo de Diff (Snapshot)
Comparar `payload.previous` vs `payload.current`:
- system_prompt: se mudou → `{type:'modified', target:'system_prompt', before, after}`
- diretivas: por id → added/removed/modified (content ou active)
- few_shots: idem por id

## Roteamento e Sidebar
Sem mudanças — a página já existe em `/admin/treinamento-ia`.

## Fora de escopo
- Não altera Settings/AdminSettings.
- Não altera o pipeline de exportação DOCX.
- Sem mudanças visuais fora da página de treinamento.
