import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Users, Trophy, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const BottomNavBar: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-2 sm:hidden z-50">
      <div className="flex justify-around items-center">
        <button 
          onClick={() => navigate('/dashboard')}
          className={`flex flex-col items-center justify-center p-2 flex-1 min-w-0 ${
            window.location.pathname === '/dashboard' ? 'text-blue-600' : 'text-gray-600'
          }`}
        >
          <Gamepad2 className="w-6 h-6" />
          <span className="text-xs mt-1">Jugar</span>
        </button>
        <button 
          onClick={() => navigate('/join')}
          className={`flex flex-col items-center justify-center p-2 flex-1 min-w-0 ${
            window.location.pathname === '/join' ? 'text-green-600' : 'text-gray-600'
          }`}
        >
          <Users className="w-6 h-6" />
          <span className="text-xs mt-1">Unirse</span>
        </button>
        <button 
          onClick={() => navigate('/ranking')}
          className={`flex flex-col items-center justify-center p-2 flex-1 min-w-0 ${
            window.location.pathname === '/ranking' ? 'text-yellow-600' : 'text-gray-600'
          }`}
        >
          <Trophy className="w-6 h-6" />
          <span className="text-xs mt-1">Ranking</span>
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className={`flex flex-col items-center justify-center p-2 flex-1 min-w-0 ${
            window.location.pathname === '/profile' ? 'text-purple-600' : 'text-gray-600'
          }`}
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            window.location.pathname === '/profile' 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
              : 'bg-gray-200'
          }`}>
            <span className="text-white text-xs font-bold">
              {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <span className="text-xs mt-1">Perfil</span>
        </button>
      </div>
    </div>
  );
};
