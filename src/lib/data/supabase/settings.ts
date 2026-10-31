import type { AppSupabase } from '../../supabase';
import { toAppError } from '../errors';

export async function getSettings(sb: AppSupabase): Promise<Record<string, unknown>> {
  const { data, error } = await sb
    .from('app_settings')
    .select('key, value');

  if (error) throw toAppError(error);
  
  // Convert array of {key, value} to object
  const result: Record<string, unknown> = {};
  (data ?? []).forEach(({ key, value }) => {
    result[key] = value;
  });
  return result;
}

export async function getDocuments(sb: AppSupabase): Promise<Record<string, string>> {
  // The documents table stores a storage_path + version, not a direct URL.
  // Resolve a public storage URL per document (matching the web portal).
  const { data, error } = await sb
    .from('documents')
    .select('key, storage_path, version');

  if (error) throw toAppError(error);

  const result: Record<string, string> = {};
  for (const r of data ?? []) {
    const { data: urlData } = sb.storage.from('documents').getPublicUrl(r.storage_path);
    result[r.key] = `${urlData.publicUrl}?v=${r.version}`;
  }
  return result;
}
