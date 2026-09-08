import { Link } from 'react-router-dom';
import { BookOpen, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-3xl mb-6">
          <BookOpen className="w-10 h-10 text-primary-600" />
        </div>
        <h1 className="text-6xl font-bold text-gray-200 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Page Not Found</h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link to="/app/dashboard" className="btn-primary inline-flex">
          <ArrowLeft className="w-4 h-4" /> Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
