import { Database } from './database.types'

declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    rpc<ReturnType = any, Params = any>(
      fn: string,
      params?: Params,
      options?: {
        head?: boolean
        count?: 'exact' | 'planned' | 'estimated'
      }
    )
  }
}

export {}
