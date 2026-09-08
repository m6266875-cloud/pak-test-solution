import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { authApi } from '../../api/auth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Avatar, RoleBadge } from '../../components/ui';
import { Shield, Lock, LogOut, Eye, EyeOff, Check, Mail, Phone, Building2, Calendar } from 'lucide-react';
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="page-title">My Profile</h1>

      {/* Account Info */}
      <div className="card p-6">
        <div className="flex items-start gap-5">
          <Avatar name={user.name} size="lg" />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-surface-900">{user.name}</h2>
            <p className="text-sm text-surface-500">{user.email}</p>
            <div className="flex items-center gap-2 mt-3">
              <RoleBadge role={user.role} />
              <span className={clsx(
                'badge',
                user.isActive ? 'badge-green' : 'badge-gray'
              )}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-surface-100 grid grid-cols-2 gap-4 text-sm">
          {user.schoolName && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-surface-400" />
              <div>
                <div className="text-xs text-surface-500">School</div>
                <div className="font-medium text-surface-900">{user.schoolName}</div>
              </div>
            </div>
          )}
          {user.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-surface-400" />
              <div>
                <div className="text-xs text-surface-500">Phone</div>
                <div className="font-medium text-surface-900">{user.phone}</div>
              </div>
            </div>
          )}
          {user.lastLoginAt && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-surface-400" />
              <div>
                <div className="text-xs text-surface-500">Last Login</div>
                <div className="font-medium text-surface-900">{format(new Date(user.lastLoginAt), 'dd MMM yyyy, HH:mm')}</div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-surface-400" />
            <div>
              <div className="text-xs text-surface-500">Member Since</div>
              <div className="font-medium text-surface-900">{format(new Date(user.createdAt), 'dd MMM yyyy')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-surface-900">Change Password</h3>
            <p className="text-xs text-surface-500">You'll be logged out after changing your password</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4 max-w-md">
          <div>
            <label className="label">Current Password</label>
            <div className="relative">
              <input {...register('currentPassword')} type={showCurrent ? 'text' : 'password'} className={clsx('input pr-10', errors.currentPassword && 'border-red-400')} placeholder="Enter current password" />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.currentPassword && <p className="form-error">{errors.currentPassword.message}</p>}
          </div>

          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <input {...register('newPassword')} type={showNew ? 'text' : 'password'} className={clsx('input pr-10', errors.newPassword && 'border-red-400')} placeholder="Min 8 chars, upper + lower + number" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && <p className="form-error">{errors.newPassword.message}</p>}
          </div>

          <div>
            <label className="label">Confirm New Password</label>
            <input {...register('confirmPassword')} type="password" className={clsx('input', errors.confirmPassword && 'border-red-400')} placeholder="Repeat new password" />
            {errors.confirmPassword && <p className="form-error">{errors.confirmPassword.message}</p>}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={changingPass} className="btn-primary">
              {changingPass ? <span className="spinner" /> : <Check className="w-4 h-4" />} Update Password
            </button>
            <button type="button" onClick={() => reset()} className="btn-secondary">Reset</button>
          </div>
        </form>
      </div>

      {/* Sign Out */}
      <div className="card p-5 border-red-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-surface-900">Sign Out</h3>
            <p className="text-sm text-surface-500">Sign out of your account on this device</p>
          </div>
          <button onClick={handleLogout} className="btn-danger btn-sm">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
