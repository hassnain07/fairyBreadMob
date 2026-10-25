import { supabase } from '../supabase';
import { createSupabaseDataClient } from './supabase';

export const dataClient = createSupabaseDataClient(supabase);
