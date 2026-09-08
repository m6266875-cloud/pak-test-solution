import { Link } from 'react-router-dom';
import { BookOpen, ArrowLeft, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-20 h-20 gradient-brand rounded-3xl mb-8 shadow-brand">
          <BookOpen className="w-10 h-10 text-white" />
        </div>
        <h1 className="font-display text-7xl font-bold text-surface-200 mb-2">404</h1>
        <h2 className="text-xl font-bold text-surface-900 mb-3">Page Not Found</h2>
        <p className="text-surface-500 mb-8 max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/" className="btn-secondary">
            <Home className="w-4 h-4" /> Home
          </Link>
          <Link to="/app/dashboard" className="btn-primary">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
