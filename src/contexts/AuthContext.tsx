import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Database } from '../types/database'
import { Profile } from '../types/database'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<{ user: User | null; session: Session | null }>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Database['public']['Tables']['profiles']['Update']>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        await loadProfile(session.user.id)
      }

      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await loadProfile(session.user.id)
        } else {
          setProfile(null)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (userId: string) => {
    try {
      // Primero intentamos obtener el perfil
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      // Si no existe el perfil, lo creamos
      if (error && error.code === 'PGRST116') {
        const userData = user || (await supabase.auth.getUser()).data.user;
        const email = userData?.email || '';
        const fullName = userData?.user_metadata?.full_name || 'Usuario';
        const username = email.split('@')[0] || 'usuario';
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email,
            full_name: fullName,
            username
          } as any) // Usamos 'as any' temporalmente para evitar problemas de tipos
          .select()
          .single()

        if (createError) throw createError;
        
        profile = newProfile;
      } else if (error) {
        throw error;
      }

      setProfile(profile);
      return profile;
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Error al cargar el perfil del usuario');
      return null;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    try {
      // Primero, crear el usuario en Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;

      // Redirigir a la página de verificación de correo
      window.location.href = '/verify-email';
      
      return data;
    } catch (error: any) {
      const errorMessage = error.message || 'Error al crear la cuenta. Por favor intenta de nuevo.';
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      toast.success('¡Bienvenido de vuelta!')
    } catch (error: any) {
      toast.error(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })

      if (error) throw error
    } catch (error: any) {
      toast.error('Error al iniciar sesión con Google')
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setUser(null)
      setProfile(null)
      setSession(null)

      toast.success('Sesión cerrada')
    } catch (error: any) {
      toast.error('Error al cerrar sesión')
      throw error
    }
  }

  const updateProfile = async (updates: Database['public']['Tables']['profiles']['Update']): Promise<void> => {
    if (!user) {
      toast.error('Usuario no autenticado');
      return;
    }
  
    try {
      // Hacemos la actualización usando una aserción de tipo más específica
      const { error: updateError } = await (supabase as any)
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      // Luego obtenemos el perfil actualizado
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single<Profile>();
      
      if (fetchError) throw fetchError;
      
      setProfile(data);
      toast.success('Perfil actualizado correctamente');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar el perfil');
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;