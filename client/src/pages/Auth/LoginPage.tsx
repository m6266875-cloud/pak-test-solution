import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setCredentials } from '../../store/slices/authSlice';
import { authApi } from '../../api/auth';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { BookOpen, Mail, Lock, Eye, EyeOff, ArrowRight, Shield, GraduationCap } from 'lucide-react';
import clsx from 'clsx';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  if (isAuthenticated) return <Navigate to="/app/dashboard" replace />;

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(data.email, data.password);
      dispatch(setCredentials({
        user: res.data.data.user,
        accessToken: res.data.data.accessToken,
      }));
      toast.success(`Welcome back, ${res.data.data.user.name}!`);
      navigate('/app/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ═══ LEFT: BRANDING ═══ */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden gradient-brand">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.06%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')]" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-white">Pak Test Software</span>
          </div>

          {/* Center content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-8"
          >
            <div>
              <h1 className="font-display text-4xl font-bold text-white leading-tight">
                Pakistan's Smart<br />Exam Paper Generator
              </h1>
              <p className="text-white/80 mt-4 text-lg leading-relaxed max-w-md">
                Create professional, board-standard examination papers in under 2 minutes.
                Trusted by 500+ schools across Pakistan.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="space-y-4">
              {[
                { icon: GraduationCap, text: 'Classes 1-12 — All subjects covered' },
                { icon: Shield, text: 'Secure teacher & admin authentication' },
                { icon: BookOpen, text: 'Intelligent question bank integration' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white/90 font-medium">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Footer */}
          <div className="text-white/60 text-sm">
            &copy; {new Date().getFullYear()} Pak Test Software. All rights reserved.
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
      </div>

      {/* ═══ RIGHT: LOGIN FORM ═══ */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 gradient-brand rounded-xl flex items-center justify-center shadow-brand">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-surface-900">Pak Test Software</span>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold text-surface-900">Welcome back</h2>
            <p className="text-surface-500 mt-1.5">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-surface-400" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@school.edu.pk"
                  className={clsx('input pl-11', errors.email && 'border-red-400 focus:ring-red-400')}
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Password</label>
                <button type="button" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-surface-400" />
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className={clsx('input pl-11 pr-11', errors.password && 'border-red-400 focus:ring-red-400')}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-base mt-6"
            >
              {isLoading ? (
                <><span className="spinner" /> Signing in...</>
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8 p-4 bg-surface-50 rounded-2xl border border-surface-100">
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Demo Accounts</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  (document.querySelector('input[type="email"]') as HTMLInputElement).value = 'admin@paktestsolution.com';
                  (document.querySelector('input[type="password"]') as HTMLInputElement).value = 'Admin@123456';
                }}
                className="p-3 bg-white rounded-xl border border-surface-200 hover:border-brand-300 transition-all text-left"
              >
                <div className="text-xs font-bold text-brand-600 mb-1">Admin</div>
                <div className="text-xs text-surface-500">admin@paktestsolution.com</div>
                <div className="text-xs text-surface-400">Admin@123456</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  (document.querySelector('input[type="email"]') as HTMLInputElement).value = 'teacher@demo.com';
                  (document.querySelector('input[type="password"]') as HTMLInputElement).value = 'Teacher@123';
                }}
                className="p-3 bg-white rounded-xl border border-surface-200 hover:border-brand-300 transition-all text-left"
              >
                <div className="text-xs font-bold text-emerald-600 mb-1">Teacher</div>
                <div className="text-xs text-surface-500">teacher@demo.com</div>
                <div className="text-xs text-surface-400">Teacher@123</div>
              </button>
            </div>
          </div>

          {/* Back to home */}
          <div className="mt-8 text-center">
            <Link to="/" className="text-sm text-surface-500 hover:text-surface-700 transition-colors">
              &larr; Back to home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
