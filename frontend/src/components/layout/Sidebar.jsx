import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BarChart2, 
  MessageSquare, 
  Lightbulb, 
  FileText, 
  Map as MapIcon, 
  Bot, 
  Settings, 
  LogOut 
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../contexts/AuthContext';
import { LogoutModal } from '../ui/LogoutModal';

const navItems = [
  { name: 'Dashboard', path: '/app', icon: LayoutDashboard },
  { name: 'Analytics', path: '/app/analytics', icon: BarChart2 },
  { name: 'Feedback Explorer', path: '/app/feedback', icon: MessageSquare },
  { name: 'Feature Requests', path: '/app/features', icon: Lightbulb },
  { name: 'PRD Generator', path: '/app/prd', icon: FileText },
  { name: 'Roadmap Planner', path: '/app/roadmap', icon: MapIcon },
  { name: 'AI Chat Assistant', path: '/app/chat', icon: Bot },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
    navigate('/auth/login');
  };

  return (
    <>
      <div className="flex h-screen w-64 flex-col border-r border-border bg-surface">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-surface rounded-sm shadow-inner"></div>
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight text-text-primary">AI Product Manager</h1>
            <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Copilot</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-3 px-4">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/app'}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 cursor-pointer border border-transparent",
                    isActive 
                      ? "bg-primary/5 text-primary font-medium border-primary/20 shadow-sm" 
                      : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  )
                }
              >
                <item.icon className={cn(
                  "h-4 w-4 flex-shrink-0 transition-colors",
                  "group-hover:text-primary"
                )} />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="border-t border-border p-4 space-y-1">
          <NavLink
            to="/app/settings"
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer mb-4",
                isActive 
                  ? "bg-background text-primary font-medium" 
                  : "text-text-secondary hover:bg-background text-text-primary"
              )
            }
          >
            <Settings className="h-4 w-4 flex-shrink-0" />
            <span>Settings</span>
          </NavLink>

          <div className="flex items-center gap-3 p-2 bg-background rounded-lg">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center text-xs font-semibold text-primary">
              {user?.initials || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold truncate text-text-primary">{user?.name || 'User'}</p>
              <p className="text-[10px] text-text-secondary truncate">{user?.role || 'Guest'}</p>
            </div>
          </div>
        </div>
      </div>
      
      <LogoutModal 
        isOpen={isLogoutModalOpen} 
        onClose={() => setIsLogoutModalOpen(false)} 
        onConfirm={handleLogout} 
      />
    </>
  );
}
