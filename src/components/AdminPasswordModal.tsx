import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Lock, Eye, EyeOff, X, KeyRound, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = password.trim();
    // Strictly verify against "SUBHA ADMIN 420"
    if (trimmed.toUpperCase() === "SUBHA ADMIN 420") {
      sessionStorage.setItem('admin_unlocked_session', 'true');
      toast.success("🛡️ Admin Portal Unlocked! Welcome Boss Subhajit Sanpui.");
      setPassword('');
      setError('');
      onSuccess();
    } else {
      setError("ভুল পাসওয়ার্ড! অ্যাডমিন পোর্টাল কেবল সঠিক পাসওয়ার্ড দিলে খুলবে।");
      toast.error("Access Denied: Incorrect Admin Password!");
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10050] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-rose-100 dark:border-rose-950/50 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-indigo-700 p-6 text-white text-center relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
          
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg">
            <ShieldCheck size={36} className="text-white" />
          </div>

          <span className="inline-block px-3 py-0.5 rounded-full bg-white/25 text-[10px] font-black uppercase tracking-widest text-white mb-1">
            Restricted System Gate
          </span>
          <h2 className="text-xl font-black tracking-tight text-white">
            Admin Portal Access
          </h2>
          <p className="text-xs text-rose-100 font-medium mt-1">
            অ্যাডমিন পোর্টাল খুলতে সিক্রেট পাসওয়ার্ড প্রদান করুন
          </p>
        </div>

        {/* Content & Form */}
        <div className="p-6 sm:p-8 space-y-5">
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-3.5 flex items-start gap-3">
            <Lock className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={18} />
            <div className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed font-medium">
              <span className="font-bold">Security Notice:</span> নতুন কোনো অ্যাকাউন্টকে স্বয়ংক্রিয়ভাবে অ্যাডমিন করা হয় না। অ্যাডমিন পোর্টাল আলাদা এবং কেবলমাত্র পাসওয়ার্ড দিয়ে ওপেন হবে।
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 text-left">
              <Label htmlFor="adminSecretPassword" className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <KeyRound size={14} className="text-rose-500" />
                <span>Admin Password (পাসওয়ার্ড)</span>
              </Label>
              <div className="relative">
                <Input
                  id="adminSecretPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter secret password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  className="h-12 rounded-xl pr-12 font-mono text-sm tracking-wider bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-rose-500"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-500 font-bold mt-1 bg-red-50 dark:bg-red-950/40 p-2 rounded-xl">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-rose-500/25 active:scale-95 transition-all cursor-pointer"
              >
                Unlock Admin Portal
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                className="w-full h-10 rounded-xl text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                Cancel / Cancel Access
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
