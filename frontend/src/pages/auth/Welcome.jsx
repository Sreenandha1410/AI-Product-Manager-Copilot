import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export function Welcome() {
  return (
    <div className="flex flex-col items-center justify-center text-center w-full max-w-md mx-auto space-y-4">
      <Link to="/auth/signup" className="block w-full">
        <Button className="w-full text-lg py-6 flex items-center justify-center gap-2">
          Get Started <ArrowRight className="h-5 w-5" />
        </Button>
      </Link>
      <Link to="/auth/login" className="block w-full">
        <Button variant="outline" className="w-full text-lg py-6 bg-surface border-border text-text-primary hover:bg-background">
          Already have an account? Sign In
        </Button>
      </Link>
    </div>
  );
}
