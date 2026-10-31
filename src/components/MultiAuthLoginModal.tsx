import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  ArrowRight, 
  ChevronLeft,
  Radio,
  UserCheck
} from 'lucide-react';
import { UserProfile } from '../types';
import { db } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';

interface MultiAuthLoginModalProps {
  onGoogleLogin: () => void;
  onAuthSuccess: (profile: UserProfile) => void;
  onBackToRoles?: () => void;
}

type AuthTab = 'options' | 'guest';

export const MultiAuthLoginModal: React.FC<MultiAuthLoginModalProps> = ({
  onGoogleLogin,
  onAuthSuccess,
  onBackToRoles
}) => {
  const [activeTab, setActiveTab] = useState<AuthTab>('options');

  // Special Guest State
  const [guestName, setGuestName] = useState('');
  const [guestClass, setGuestClass] = useState('9');
  const [guestSchool, setGuestSchool] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [guestPurpose, setGuestPurpose] = useState('Study Madhyamik & Class 9 Notes');
  const [guestRequestId, setGuestRequestId] = useState<string | null>(null);
  const [isWaitingGuestApproval, setIsWaitingGuestApproval] = useState(false);

  // Submit Special Guest Request
  const handleSubmitGuestRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      toast.error("Please enter your name for the guest pass");
      return;
    }

    const reqId = `guest_${Date.now()}`;
    setGuestRequestId(reqId);
    setIsWaitingGuestApproval(true);

    try {
      await setDoc(doc(db, 'guestRequests', reqId), {
        name: guestName.trim(),
        classNumber: guestClass,
        school: guestSchool.trim() || 'Guest Student',
        contact: guestContact.trim() || 'Guest Contact',
        purpose: guestPurpose.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast.success("🌟 Special Guest Access Request sent to Admin Subhajit Sanpui!");
    } catch (e: any) {
      toast.error("Request failed: " + e.message);
      setIsWaitingGuestApproval(false);
    }
  };

  // Real-time listener for Guest Approval
  useEffect(() => {
    if (!guestRequestId || !isWaitingGuestApproval) return;

    const unsub = onSnapshot(doc(db, 'guestRequests', guestRequestId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      if (data?.status === 'approved') {
        toast.success("🎉 ADMIN APPROVED YOUR ACCESS! Unlocking StudySnap...");
        
        const guestUid = `guest_${guestRequestId}`;
        const guestProfile: UserProfile = {
          uid: guestUid,
          name: `${data.name} (Special Guest)`,
          displayName: data.name,
          email: `${guestRequestId}@guest.studysnap.edu`,
          phone: data.contact || 'Guest',
          class: Number(data.classNumber) || 9,
          school: data.school || 'Special Guest Student',
          points: 100,
          isVIP: true,
          role: 'student',
          streak: 1,
          lastLogin: new Date().toISOString().split('T')[0]
        };

        // Save and enter
        setDoc(doc(db, 'users', guestUid), guestProfile, { merge: true }).catch(() => {});
        onAuthSuccess(guestProfile);
      } else if (data?.status === 'rejected') {
        toast.error("Special Guest request was declined by Administrator.");
        setIsWaitingGuestApproval(false);
        setGuestRequestId(null);
      }
    });

    return () => unsub();
  }, [guestRequestId, isWaitingGuestApproval, onAuthSuccess]);

  return (
    <div className="w-full space-y-6">
      {/* Tab: Options Selection Grid */}
      {activeTab === 'options' && (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-mono font-black tracking-widest uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full">
              Student Sign-In Portal
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Access Your Study Dashboard
            </h3>
            <p className="text-xs text-slate-500">
              নিরাপদ ও সহজ পদ্ধতিতে লগইন করুন
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {/* 1. Google Sign-In */}
            <Button
              onClick={onGoogleLogin}
              className="w-full h-14 bg-navy-900 text-white hover:bg-navy-800 dark:bg-white dark:text-navy-900 dark:hover:bg-slate-100 rounded-2xl flex items-center justify-center gap-3 text-sm font-black shadow-md cursor-pointer transition-transform hover:scale-[1.01]"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5 dark:brightness-100 brightness-0 invert" alt="Google" />
              <span>Continue with Google Account</span>
            </Button>

            {/* 2. Special Guest Pass (Instant Admin Approval) */}
            <Button
              onClick={() => setActiveTab('guest')}
              variant="outline"
              className="w-full h-14 rounded-2xl border-2 border-amber-300 dark:border-amber-800/80 hover:border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 flex items-center justify-between px-5 font-black text-xs cursor-pointer shadow-sm transition-transform hover:scale-[1.01]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">Special Guest Pass</span>
                    <Badge className="bg-amber-500 text-slate-950 text-[9px] font-black h-4 px-1.5">ADMIN APPROVAL</Badge>
                  </div>
                  <div className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-normal">
                    শিক্ষক শুভজিৎ সাঁপুই-এর সরাসরি অনুমোদনে ইনস্ট্যান্ট অ্যাক্সেস
                  </div>
                </div>
              </div>
              <ArrowRight size={18} className="text-amber-600" />
            </Button>
          </div>

          {onBackToRoles && (
            <button
              onClick={onBackToRoles}
              className="text-xs text-slate-400 hover:text-slate-600 block mx-auto pt-3 cursor-pointer"
            >
              ← Back to Portal Selection
            </button>
          )}
        </div>
      )}

      {/* Tab: Special Guest Option (Pending Admin Approval) */}
      {activeTab === 'guest' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('options')}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles size={18} className="text-amber-500" />
              <span>Special Guest Pass Request</span>
            </h3>
          </div>

          {!isWaitingGuestApproval ? (
            <form onSubmit={handleSubmitGuestRequest} className="space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                আপনার নাম ও বিদ্যালয়ের তথ্য দিয়ে আবেদন করুন। অ্যাডমিন শিক্ষক অনুমোদন করলেই আপনার স্ক্রিনের লক স্বয়ংক্রিয়ভাবে খুলে যাবে।
              </p>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Full Name</Label>
                <Input
                  placeholder="e.g. Rahul Sen"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  className="h-11 rounded-xl text-xs font-semibold"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Class</Label>
                  <select
                    value={guestClass}
                    onChange={e => setGuestClass(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-bold outline-none"
                  >
                    <option value="9">Class 9 (নবম শ্রেণি)</option>
                    <option value="10">Class 10 (দশম শ্রেণি - Madhyamik)</option>
                    <option value="11">Class 11</option>
                    <option value="12">Class 12</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Contact / Phone (Optional)</Label>
                  <Input
                    placeholder="Phone or WhatsApp"
                    value={guestContact}
                    onChange={e => setGuestContact(e.target.value)}
                    className="h-11 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">School Name</Label>
                <Input
                  placeholder="e.g. Barisha High School"
                  value={guestSchool}
                  onChange={e => setGuestSchool(e.target.value)}
                  className="h-11 rounded-xl text-xs font-semibold"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 gap-2 cursor-pointer mt-2 transition-transform hover:scale-[1.01]"
              >
                <Sparkles size={16} />
                <span>Submit Guest Request to Admin</span>
              </Button>
            </form>
          ) : (
            /* Pulsing Waiting Screen for Guest Approval */
            <div className="p-6 rounded-3xl bg-slate-900 text-white border-2 border-amber-400 text-center space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center mx-auto text-amber-300 animate-bounce">
                <Radio size={28} className="animate-pulse" />
              </div>

              <div className="space-y-1">
                <Badge className="bg-amber-400 text-slate-950 font-mono font-black text-xs px-3 py-1 animate-pulse">
                  🚨 WAITING FOR TEACHER APPROVAL
                </Badge>
                <h4 className="text-lg font-black text-white mt-2">
                  Request Dispatched to Admin!
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Teacher Subhajit Sanpui has received your guest pass request. This screen will <strong>automatically unlock</strong> in real-time the instant it is approved!
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 text-left text-[11px] font-mono space-y-1">
                <div>Candidate: <strong>{guestName}</strong></div>
                <div>Class: <strong>{guestClass}</strong> • {guestSchool}</div>
                <div>Status: <span className="text-amber-400 font-bold">Pending Live Review...</span></div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setIsWaitingGuestApproval(false); setGuestRequestId(null); }}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel Request
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
