import React, { useState } from 'react';
import axios from "axios";
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    await axios.post("http://localhost:8000/forgot-password", {
      email: email,
    });

    setIsSubmitted(true);
  } catch (error) {
    console.error(error);
    alert("Unable to send reset link.");
  }
};

  return (
    <Card className="border-0 shadow-lg sm:border sm:shadow-sm">
      <CardContent className="p-8">
        <div className="mb-6 text-center">
          <h3 className="text-xl font-semibold text-text-primary">Reset your password</h3>
          {!isSubmitted && (
            <p className="mt-2 text-sm text-text-secondary">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          )}
        </div>
        
        {isSubmitted ? (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm text-text-secondary">
              We've sent a password reset link to <strong>{email}</strong>. Please check your inbox.
            </p>
            <div className="mt-6 text-center">
              <Link to="/auth/login" className="inline-flex items-center text-sm font-medium text-primary hover:text-primary-hover">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
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
            <Button type="submit" className="w-full">Send Reset Link</Button>
            
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
