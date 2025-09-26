import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

type Schema = Database['public']

export type Tables = Schema['Tables']
export type TableName = keyof Tables
export type Profile = Tables['profiles']['Row']

type Table<T extends TableName> = Tables[T]
type Row<T extends TableName> = Table<T>['Row']
type InsertDto<T extends TableName> = Table<T>['Insert']
type UpdateDto<T extends TableName> = Table<T>['Update']

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create a single supabase client with auth configuration
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  }
})

// Helper function to get a typed table
export function from<T extends TableName>(table: T) {
  return supabase.from(table);
}

// Helper function for type-safe inserts
export async function insert<T extends TableName>(
  table: T,
  values: InsertDto<T> | InsertDto<T>[],
  options?: { count?: 'exact' | 'planned' | 'estimated' }
) {
  return supabase.from(table).insert(values as any, options)
}

// Helper function for type-safe updates
export async function update<T extends TableName>(
  table: T,
  values: UpdateDto<T>,
  options?: { count?: 'exact' | 'planned' | 'estimated' }
) {
  const query = supabase.from(table).update(values as any, options);
  return query as any; // Type assertion to bypass type checking
}

// Helper function for type-safe deletes
export async function remove<T extends TableName>(
  table: T,
  options?: { count?: 'exact' | 'planned' | 'estimated' }
) {
  const query = supabase.from(table).delete(options);
  return query as any; // Type assertion to bypass type checking
}

// Helper function to handle common select queries
export async function select<T extends TableName>(
  table: T,
  columns = '*',
  filter?: Record<string, any>
) {
  let query = supabase.from(table).select(columns);

  if (filter) {
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined) {
        query = query.eq(key, value);
      }
    });
  }

  return query as any; // Type assertion to bypass type checking
}