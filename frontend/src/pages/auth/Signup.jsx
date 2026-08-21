import React, { useState } from 'react';
import axios from "axios";
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

export function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {

  e.preventDefault();

  setError("");

  if (!fullName.trim()) {

    setError("Full name is required.");

    return;

  }

  if (password.length < 6) {

    setError("Password must be at least 6 characters.");

    return;

  }

  if (password !== confirmPassword) {

    setError("Passwords do not match.");

    return;

  }

  try {

    await signup(fullName, email, password);

    navigate("/app", { replace: true });

  } catch (err) {

    setError(err.message);

  }

};
  return (
    <Card className="border-0 shadow-lg sm:border sm:shadow-sm">
      <CardContent className="p-8">
        <h3 className="mb-6 text-xl font-semibold text-text-primary text-center">Create your account</h3>
        
        {error && (
          <div className="mb-4 rounded-md bg-danger/10 p-3 text-sm text-danger border border-danger/20">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Full name</label>
            <Input 
              type="text" 
              placeholder="John Doe" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Email address</label>
            <Input 
              type="email" 
              placeholder="name@company.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Password</label>
            <div className="relative">
              <Input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Create a password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Confirm Password</label>
            <div className="relative">
              <Input 
                type={showConfirmPassword ? 'text' : 'password'} 
                placeholder="Confirm password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full">Create Account</Button>
        </form>
      </CardContent>
      <div className="border-t border-border bg-surface-hover p-4 text-center sm:rounded-b-xl">
        <p className="text-sm text-text-secondary">
          Already have an account?{' '}
          <Link to="/auth/login" className="font-medium text-primary hover:text-primary-hover">
            Login
          </Link>
        </p>
      </div>
    </Card>
  );
}
