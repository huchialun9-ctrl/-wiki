import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Team {
  id: string;
  name: string;
  ownerId: string;
  members: any[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  teams: Team[];
  currentTeam: Team | null;
  setCurrentTeam: (team: Team) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedTeamId = localStorage.getItem('currentTeamId');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      
      // Fetch teams
      fetch('http://localhost:3000/api/teams', {
        headers: { 'Authorization': `Bearer ${storedToken}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setTeams(data);
          const saved = data.find((t: any) => t.id === storedTeamId);
          setCurrentTeam(saved || data[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    
    // Fetch teams immediately after login
    fetch('http://localhost:3000/api/teams', {
      headers: { 'Authorization': `Bearer ${newToken}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data && data.length > 0) {
        setTeams(data);
        setCurrentTeam(data[0]);
        localStorage.setItem('currentTeamId', data[0].id);
      }
      navigate('/');
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('currentTeamId');
    setToken(null);
    setUser(null);
    setTeams([]);
    setCurrentTeam(null);
    navigate('/login');
  };

  const handleSetCurrentTeam = (team: Team) => {
    setCurrentTeam(team);
    localStorage.setItem('currentTeamId', team.id);
  };

  return (
    <AuthContext.Provider value={{ user, token, teams, currentTeam, setCurrentTeam: handleSetCurrentTeam, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
