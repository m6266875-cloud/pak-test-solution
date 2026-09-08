import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { authApi } from '../../api/auth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Shield, Lock, LogOut, Eye, EyeOff, Check } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string()
    .min(8, 'Must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must include uppercase, lowercase, and number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
type PasswordForm = z.infer<typeof passwordSchema>;

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Administrator',
  school_admin: 'School Administrator',
  teacher: 'Teacher',
};

export default function ProfilePage() {
  const { user } = useAppSelector(s => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const onChangePassword = async (data: PasswordForm) => {
    setChangingPass(true);
    try {
      await authApi.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      toast.success('Password changed! Please log in again.');
      dispatch(logout());
      navigate('/login');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPass(false);
    }
  };

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    dispatch(logout());
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <h1 className="text-xl font-bold text-gray-900">My Profile</h1>

      {/* Account Info */}
      <div className="card p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-700 text-2xl font-bold flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">{user.name}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium">
                <Shield className="w-3 h-3" />
                {ROLE_LABELS[user.role] || user.role}
              </span>
              <span className={clsx(
                'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              )}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
          {user.schoolName && (
            <div>
              <div className="text-xs text-gray-500 mb-0.5">School / Institution</div>
              <div className="font-medium text-gray-900">{user.schoolName}</div>
            </div>
          )}
          {user.phone && (
            <div>
              <div className="text-xs text-gray-500 mb-0.5">Phone</div>
              <div className="font-medium text-gray-900">{user.phone}</div>
            </div>
          )}
          {user.lastLoginAt && (
            <div>
              <div className="text-xs text-gray-500 mb-0.5">Last Login</div>
              <div className="font-medium text-gray-900">{format(new Date(user.lastLoginAt), 'dd MMM yyyy, HH:mm')}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-gray-500 mb-0.5">Member Since</div>
            <div className="font-medium text-gray-900">{format(new Date(user.createdAt), 'dd MMM yyyy')}</div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
            <Lock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Change Password</h3>
            <p className="text-xs text-gray-500">You will be logged out after changing your password</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4 max-w-md">
          <div>
            <label className="label">Current Password</label>
            <div className="relative">
              <input
                {...register('currentPassword')}
                type={showCurrent ? 'text' : 'password'}
                className={`input pr-10 ${errors.currentPassword ? 'border-red-400' : ''}`}
                placeholder="Enter current password"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.currentPassword && <p className="form-error">{errors.currentPassword.message}</p>}
          </div>

          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <input
                {...register('newPassword')}
                type={showNew ? 'text' : 'password'}
                className={`input pr-10 ${errors.newPassword ? 'border-red-400' : ''}`}
                placeholder="Min 8 chars, upper + lower + number"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && <p className="form-error">{errors.newPassword.message}</p>}
          </div>

          <div>
            <label className="label">Confirm New Password</label>
            <input
              {...register('confirmPassword')}
              type="password"
              className={`input ${errors.confirmPassword ? 'border-red-400' : ''}`}
              placeholder="Repeat new password"
            />
            {errors.confirmPassword && <p className="form-error">{errors.confirmPassword.message}</p>}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={changingPass} className="btn-primary">
              {changingPass ? <span className="spinner" /> : <Check className="w-4 h-4" />}
              Update Password
            </button>
            <button type="button" onClick={() => reset()} className="btn-secondary">Reset</button>
          </div>
        </form>
      </div>

      {/* Sign Out */}
      <div className="card p-5 border-red-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Sign Out</h3>
            <p className="text-sm text-gray-500">Sign out of your account on this device</p>
          </div>
          <button onClick={handleLogout} className="btn-danger text-sm">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
