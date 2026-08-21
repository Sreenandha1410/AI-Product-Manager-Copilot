import React, { useState } from 'react';
import axios from "axios";
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {

  e.preventDefault();

  setError("");

  if (password.length < 6) {

    setError("Password must be at least 6 characters long.");

    return;

  }

  if (password !== confirmPassword) {

    setError("Passwords do not match.");

    return;

  }

  try {

    await axios.post(
      "http://localhost:8000/reset-password",
      {
        password: password
      }
    );

    setIsSuccess(true);

  } catch (error) {

    console.error(error);

    setError(
      error.response?.data?.detail ||
      "Failed to reset password."
    );

  }

};

  return (
    <Card className="border-0 shadow-lg sm:border sm:shadow-sm">
      <CardContent className="p-8">
        <div className="mb-6 text-center">
          <h3 className="text-xl font-semibold text-text-primary">Set new password</h3>
          {!isSuccess && (
            <p className="mt-2 text-sm text-text-secondary">
              Your new password must be different to previously used passwords.
            </p>
          )}
        </div>
        
        {isSuccess ? (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm text-text-secondary">
              Your password has been successfully reset.
            </p>
            <div className="mt-6 text-center">
              <Button onClick={() => navigate('/auth/login')} className="w-full">
                Continue to Login
              </Button>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-danger/10 p-3 text-sm text-danger border border-danger/20">
                {error}
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">New Password</label>
              <div className="relative">
                <Input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••" 
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
                  placeholder="••••••••" 
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
            <Button type="submit" className="w-full">Reset Password</Button>
            <div className="mt-4 text-center">
              <Link to="/auth/login" className="inline-flex items-center text-sm font-medium text-primary hover:text-primary-hover">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
