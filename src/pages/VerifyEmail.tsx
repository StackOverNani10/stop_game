import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const VerifyEmail = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true); // Iniciar como true para mostrar carga inicial
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Verificar si el usuario llegó aquí después de hacer clic en el enlace de verificación
  useEffect(() => {
    const checkVerification = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Verificar si hay un token en la URL (viene de la redirección de Supabase)
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        
        if (token && type === 'signup') {
          try {
            // Intentar obtener la sesión para verificar si el usuario está autenticado
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) throw sessionError;
            
            if (!session) {
              // Si no hay sesión, intentar verificar el token OTP
              const { error: verifyError } = await supabase.auth.verifyOtp({
                token_hash: token,
                type: 'signup'
              });
              
              if (verifyError) throw verifyError;
              
              // Obtener la sesión actualizada después de la verificación
              const { data: { session: newSession }, error: newSessionError } = await supabase.auth.getSession();
              if (newSessionError) throw newSessionError;
              
              if (newSession?.user) {
                setEmail(newSession.user.email || '');
                setIsVerified(true);
                toast.success('¡Correo verificado exitosamente!');
                navigate('/dashboard');
                return;
              }
            } else {
              // Si ya hay sesión, redirigir al dashboard
              setEmail(session.user.email || '');
              setIsVerified(true);
              navigate('/dashboard');
              return;
            }
          } catch (verifyError: any) {
            console.error('Error al verificar el token:', verifyError);
            setError('El enlace de verificación es inválido o ha expirado.');
            toast.error('El enlace de verificación es inválido o ha expirado.');
          }
        }
        
        // Si no hay token o no es de tipo signup, obtener el correo de la sesión
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        if (session?.user?.email) {
          setEmail(session.user.email);
          
          // Verificar si el correo ya está verificado
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError) throw userError;
          
          if (user?.email_confirmed_at) {
            setIsVerified(true);
            navigate('/dashboard');
            return;
          }
        } else {
          // Si no hay sesión, redirigir al login
          navigate('/auth');
          return;
        }
      } catch (error: any) {
        console.error('Error al verificar el correo:', error);
        setError(error.message || 'Ocurrió un error al verificar tu correo. Por favor, intenta de nuevo.');
        toast.error(error.message || 'Ocurrió un error al verificar tu correo.');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkVerification();
    
    // Verificar periódicamente si el usuario ha verificado su correo
    const interval = setInterval(async () => {
      if (!isVerified && !isLoading) {
        try {
          const { data: { user }, error } = await supabase.auth.getUser();
          if (error) throw error;
          
          if (user?.email_confirmed_at) {
            setIsVerified(true);
            toast.success('¡Correo verificado exitosamente!');
            navigate('/dashboard');
          }
        } catch (error) {
          console.error('Error al verificar estado de verificación:', error);
          clearInterval(interval);
        }
      }
    }, 5000); // Verificar cada 5 segundos

    return () => clearInterval(interval);
  }, [navigate, searchParams, isVerified, isLoading]);

  const handleResendEmail = async () => {
    if (!email) return;
    
    setIsLoading(true);
    try {
      // Primero, verificar si ya está verificado
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        setIsVerified(true);
        navigate('/dashboard');
        return;
      }
      
      // Si no está verificado, reenviar el correo
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
      
      toast.success('¡Correo de verificación reenviado! Revisa tu bandeja de entrada.');
    } catch (error: any) {
      console.error('Error al reenviar el correo:', error);
      toast.error(error.message || 'Error al reenviar el correo. Intenta de nuevo más tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md text-center">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
          <p className="mt-4 text-gray-600">Verificando tu cuenta...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Error de Verificación
            </h2>
            <p className="mt-2 text-center text-sm text-red-600">
              {error}
            </p>
          </div>

          <div className="mt-8 space-y-6">
            <div className="rounded-md shadow-sm -space-y-px">
              <div className="text-sm text-center text-gray-600 mb-4">
                Por favor, intenta nuevamente o contacta al soporte si el problema persiste.
              </div>
            </div>

            <div className="flex flex-col space-y-4">
              <button
                onClick={() => window.location.reload()}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Reintentar
              </button>

              <button
                onClick={() => navigate('/auth')}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Volver al inicio de sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verifica tu correo electrónico
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Hemos enviado un correo de verificación a <span className="font-medium">{email || 'tu correo'}</span>
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="text-sm text-center text-gray-600 mb-4">
              Por favor revisa tu bandeja de entrada y haz clic en el enlace de verificación.
              Si no lo encuentras, revisa la carpeta de spam.
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            <button
              onClick={handleResendEmail}
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Enviando...' : 'Reenviar correo de verificación'}
            </button>

            <button
              onClick={() => navigate('/auth')}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
