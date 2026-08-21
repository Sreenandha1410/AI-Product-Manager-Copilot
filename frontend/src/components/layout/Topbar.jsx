import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Sun, Moon, User, Settings, LogOut, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { LogoutModal } from '../ui/LogoutModal';

export function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
    navigate('/auth/login');
  };

  return (
    <>
      <header className="h-16 border-b border-border bg-surface px-8 flex items-center justify-between shadow-sm relative z-30">
        <div className="relative w-96">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center">
            <Search className="h-4 w-4 text-text-secondary" />
          </span>
          <input 
            type="text" 
            className="block w-full pl-10 pr-3 py-2 border border-border rounded-md leading-5 bg-background placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm text-text-primary" 
            placeholder="Search feedback, feature requests and PRDs..." 
          />
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="p-2 text-text-secondary hover:bg-background rounded-full cursor-pointer transition-colors"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          
          <div className="relative" ref={notifRef}>
            <button 
              className="p-2 text-text-secondary hover:bg-background rounded-full cursor-pointer relative"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-danger ring-2 ring-surface"></span>
            </button>
            
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-surface rounded-xl shadow-lg border border-border py-2 overflow-hidden z-50">
                <div className="px-4 py-2 border-b border-border flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                  <span className="text-xs text-primary cursor-pointer hover:underline">Mark all as read</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <div className="px-4 py-3 hover:bg-background cursor-pointer transition-colors border-b border-border/50">
                    <p className="text-sm text-text-primary mb-1"><span className="font-semibold">Sarah Connor</span> mentioned you in a comment.</p>
                    <p className="text-xs text-text-secondary">2 minutes ago</p>
                  </div>
                  <div className="px-4 py-3 hover:bg-background cursor-pointer transition-colors border-b border-border/50">
                    <p className="text-sm text-text-primary mb-1">New feedback on <span className="font-semibold">Dashboard Redesign</span>.</p>
                    <p className="text-xs text-text-secondary">1 hour ago</p>
                  </div>
                  <div className="px-4 py-3 hover:bg-background cursor-pointer transition-colors">
                    <p className="text-sm text-text-primary mb-1">System update completed successfully.</p>
                    <p className="text-xs text-text-secondary">2 hours ago</p>
                  </div>
                </div>
                <div className="px-4 py-2 border-t border-border text-center">
                  <Link to="/app/notifications" className="text-xs font-medium text-primary hover:underline" onClick={() => setIsNotifOpen(false)}>
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>
          
          <div className="h-8 w-px bg-border mx-1"></div>

          <div className="relative" ref={profileRef}>
            <button 
              className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-border transition-all pl-2 pr-1 py-1"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <span className="text-sm font-medium text-text-primary hidden md:block pl-2">{user?.name || 'User'}</span>
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                {user?.initials || 'U'}
              </div>
            </button>
            
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface rounded-xl shadow-lg border border-border py-1 z-50">
                <div className="px-4 py-3 border-b border-border mb-1">
                  <p className="text-sm font-medium text-text-primary">{user?.name || 'User'}</p>
                  <p className="text-xs text-text-secondary truncate">{user?.email || 'user@example.com'}</p>
                </div>
                
                <Link to="/app/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-background hover:text-text-primary" onClick={() => setIsProfileOpen(false)}>
                  <User className="h-4 w-4" />
                  My Profile
                </Link>
                <Link to="/app/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-background hover:text-text-primary" onClick={() => setIsProfileOpen(false)}>
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <button 
                  onClick={toggleTheme}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-background hover:text-text-primary"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
                
                <div className="border-t border-border mt-1 pt-1">
                  <button 
                    onClick={() => {
                      setIsProfileOpen(false);
                      setIsLogoutModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-danger/5 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <LogoutModal 
        isOpen={isLogoutModalOpen} 
        onClose={() => setIsLogoutModalOpen(false)} 
        onConfirm={handleLogout} 
      />
    </>
  );
}
