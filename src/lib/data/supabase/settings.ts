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
  const { data, error } = await sb
    .from('documents')
    .select('key, url');

  if (error) throw toAppError(error);
  
  // Convert array of {key, url} to object
  const result: Record<string, string> = {};
  (data ?? []).forEach(({ key, url }) => {
    result[key] = url;
  });
  return result;
}
