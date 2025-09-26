import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, Subscription } from '@supabase/supabase-js'
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
  signInWithGoogle: () => Promise<{ provider: string; url: string } | void>
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
  const [initialized, setInitialized] = useState(false)

  const loadProfile = async (userId: string, forceRefresh = false): Promise<Profile | null> => {
    try {
      // Try to get profile from localStorage first
      const cachedProfile = localStorage.getItem(`profile_${userId}`);
      let profile = cachedProfile ? JSON.parse(cachedProfile) : null;

      // If we have a cached profile and don't force refresh, use it
      if (profile && !forceRefresh) {
        setProfile(profile);

        // Update in background without blocking UI
        setTimeout(async () => {
          try {
            const { data: freshProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();

            if (freshProfile) {
              localStorage.setItem(`profile_${userId}`, JSON.stringify(freshProfile));
              setProfile(freshProfile);
            }
          } catch (error) {
            console.error('Background profile update failed:', error);
          }
        }, 0);

        return profile;
      }

      // If no cached profile or forced refresh, fetch from server
      const { data: freshProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (freshProfile) {
        // Cache the profile
        localStorage.setItem(`profile_${userId}`, JSON.stringify(freshProfile));
        setProfile(freshProfile);
        return freshProfile;
      }

      // If profile doesn't exist, create it
      if (error?.code === 'PGRST116' || !freshProfile) {
        const userData = user || (await supabase.auth.getUser()).data.user;
        const email = userData?.email || '';
        const fullName = userData?.user_metadata?.full_name || 'Usuario';
        const username = email.split('@')[0] || 'usuario';

        const newProfile: Profile = {
          id: userId,
          email,
          full_name: fullName,
          username,
          games_played: 0,
          games_won: 0,
          total_points: 0,
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        try {
          // Try to save to database using raw SQL as a workaround
          const { data: savedProfile, error: insertError } = await supabase.rpc('create_user_profile', {
            user_id: newProfile.id,
            user_email: newProfile.email,
            user_full_name: newProfile.full_name || ''
          });

          if (insertError) throw insertError;

          // Fetch the newly created profile
          const { data: fetchedProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newProfile.id)
            .single();

          if (!fetchedProfile) throw new Error('Failed to fetch created profile');

          if (fetchedProfile) {
            localStorage.setItem(`profile_${userId}`, JSON.stringify(fetchedProfile));
            setProfile(fetchedProfile);
            return fetchedProfile;
          }
        } catch (dbError) {
          console.error('Error saving profile to database:', dbError);
        }

        // If database save fails, use local profile
        try {
          localStorage.setItem(`profile_${userId}`, JSON.stringify(newProfile));
          setProfile(newProfile);
          return newProfile;
        } catch (error) {
          console.error('Error saving profile to local storage:', error);
          toast.error('Error al guardar el perfil del usuario en el almacenamiento local');
          return null;
        }
      } else if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }

      // If we get here, something unexpected happened
      return null;
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Error al cargar el perfil del usuario');
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let authListener: { data: { subscription: Subscription } } | null = null;

    const init = async () => {
      try {
        setLoading(true);
        // Obtener la sesión actual
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error obteniendo sesión:", error);
          toast.error("Error al verificar sesión");
          if (isMounted) {
            setLoading(false);
            setInitialized(true);
          }
          return;
        }

        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            try {
              await loadProfile(session.user.id);
            } catch (err) {
              console.error("Error cargando perfil:", err);
              toast.error("Error al cargar el perfil");
            }
          } else {
            setProfile(null);
          }
          
          setLoading(false);
          setInitialized(true);
        }
      } catch (err) {
        console.error("Error inicializando auth:", err);
        toast.error("Error en autenticación");
        if (isMounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    // Configurar el listener de cambios de autenticación
    const setupAuthListener = () => {
      return supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log("Auth state changed:", event);
          if (isMounted) {
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
              try {
                await loadProfile(session.user.id);
              } catch (err) {
                console.error("Error cargando perfil en listener:", err);
                toast.error("Error al cargar el perfil");
              }
            } else {
              setProfile(null);
            }
          }
        }
      );
    };

    // Inicializar y configurar listener
    init().then(() => {
      if (isMounted) {
        const { data } = setupAuthListener();
        authListener = { data };
      }
    });

    return () => {
      isMounted = false;
      if (authListener?.data?.subscription) {
        authListener.data.subscription.unsubscribe();
      }
    };
  }, []);

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

      // Si ya tenemos user, forzar carga de perfil
      if (data.user) {
        await loadProfile(data.user.id, true);
      }

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

  const signInWithGoogle = async (): Promise<{ provider: string; url: string } | void> => {
    try {
      setLoading(true);

      // Guardar la ruta actual para redirigir después del inicio de sesión
      const currentPath = window.location.pathname;
      if (currentPath !== '/auth') {
        sessionStorage.setItem('preAuthPath', currentPath);
      }

      console.log('Iniciando flujo de autenticación de Google...');

      // Configurar la URL de redirección para después del inicio de sesión
      const redirectTo = `${window.location.origin}/dashboard`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
          // Dejar que Supabase maneje la redirección
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error('Error en autenticación con Google:', error);
        throw error;
      }

      console.log('Respuesta OAuth:', data);
      return data;
    } catch (error) {
      console.error('Error en signInWithGoogle:', error);
      toast.error('Error al iniciar sesión con Google');
      throw error;
    } finally {
      // No desactivar el loading aquí para evitar parpadeos
      // El estado de loading se manejará con el listener de autenticación
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

  const updateProfile = async (updates: Partial<Database['public']['Tables']['profiles']['Update']>) => {
    if (!user) {
      toast.error('Usuario no autenticado');
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      setProfile(data);
      localStorage.setItem(`profile_${user.id}`, JSON.stringify(data));
      toast.success('Perfil actualizado correctamente');
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error(err instanceof Error ? err.message : 'Error al actualizar el perfil');
    }
  };

  // Show loading state while initializing
  if (!initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <p className="text-gray-600">Inicializando aplicación...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}