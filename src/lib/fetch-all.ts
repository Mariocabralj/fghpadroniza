import { supabase } from "@/integrations/supabase/client";

const PAGE = 1000;

/**
 * Busca TODAS as linhas de uma tabela, contornando o limite padrão de 1000
 * linhas do PostgREST através de paginação por range.
 */
export async function fetchAll<T = any>(
  table: "profiles" | "documents" | "system_logs",
  columns: string,
  orderBy?: { column: string; ascending?: boolean }
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(table).select(columns).range(from, from + PAGE - 1);
    if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? false });
    const { data, error } = await q;
    if (error || !data) break;
    rows.push(...(data as unknown as T[]));
    if (data.length < PAGE) break;
  }
  return rows;
}
