import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  UserCheck, 
  UserX, 
  Clock, 
  Sparkles, 
  School, 
  Phone, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Radio,
  RefreshCw
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export interface GuestRequestItem {
  id: string;
  name: string;
  classNumber: number | string;
  school: string;
  contact: string;
  purpose?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

interface AdminGuestRequestsManagerProps {
  onTotalPendingChange?: (count: number) => void;
}

export const AdminGuestRequestsManager: React.FC<AdminGuestRequestsManagerProps> = ({
  onTotalPendingChange
}) => {
  const [requests, setRequests] = useState<GuestRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const q = query(collection(db, 'guestRequests'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        } as GuestRequestItem));
        setRequests(list);
        setLoading(false);

        const pendingCount = list.filter(r => r.status === 'pending').length;
        if (onTotalPendingChange) {
          onTotalPendingChange(pendingCount);
        }
      }, (err) => {
        console.warn("Guest requests snapshot error:", err);
        setLoading(false);
      });
      return unsub;
    } catch (e) {
      setLoading(false);
    }
  }, [onTotalPendingChange]);

  const handleApprove = async (req: GuestRequestItem) => {
    try {
      await updateDoc(doc(db, 'guestRequests', req.id), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: 'Admin Subhajit Sanpui'
      });
      toast.success(`🎉 Approved Special Guest Access for ${req.name}! Their screen will unlock instantly.`);
    } catch (e: any) {
      toast.error("Failed to approve guest request: " + e.message);
    }
  };

  const handleReject = async (req: GuestRequestItem) => {
    try {
      await updateDoc(doc(db, 'guestRequests', req.id), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        approvedBy: 'Admin Subhajit Sanpui'
      });
      toast.info(`Rejected Guest Access for ${req.name}`);
    } catch (e: any) {
      toast.error("Failed to reject guest: " + e.message);
    }
  };

  const handleDelete = async (reqId: string) => {
    try {
      await deleteDoc(doc(db, 'guestRequests', reqId));
      toast.success("Guest request record deleted");
    } catch (e: any) {
      toast.error("Failed to delete request: " + e.message);
    }
  };

  const pendingList = requests.filter(r => r.status === 'pending');
  const historyList = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Top Banner Alert for Pending Guests */}
      {pendingList.length > 0 && (
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-900 text-white p-6 sm:p-8 shadow-xl animate-pulse">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 text-amber-300 text-xs font-black tracking-widest uppercase">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                🚨 LIVE BLINKING ALERT • GUEST ACCESS WAITING
              </div>
              <h2 className="text-xl sm:text-2xl font-black">
                {pendingList.length} Student Guest Access Request{pendingList.length > 1 ? 's' : ''} Awaiting Approval!
              </h2>
              <p className="text-xs text-white/80 max-w-xl">
                নতুন ছাত্রছাত্রীরা Special Guest Pass দিয়ে অ্যাপে প্রবেশ করতে আবেদন করেছে। আপনার অনুমোদনের সাথে সাথে তাদের ডিভাইসের লক স্ক্রিন খুলে যাবে।
              </p>
            </div>
            
            <Badge className="bg-white text-rose-700 font-mono font-black text-sm px-4 py-2 rounded-2xl">
              {pendingList.length} PENDING
            </Badge>
          </div>
        </div>
      )}

      {/* Pending Requests Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Radio size={18} className="text-amber-500 animate-ping" />
            <span>Pending Special Guest Approvals ({pendingList.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs font-bold">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-500" />
            Loading guest verification requests...
          </div>
        ) : pendingList.length === 0 ? (
          <Card className="rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center bg-slate-50 dark:bg-slate-900/50">
            <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2 opacity-80" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Pending Guest Requests</p>
            <p className="text-xs text-slate-400 mt-1">All student guest requests have been reviewed and approved.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingList.map(req => (
              <Card 
                key={req.id} 
                className="rounded-3xl border-2 border-amber-400 dark:border-amber-600 bg-white dark:bg-slate-900 shadow-xl p-5 space-y-4 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-3 py-1 rounded-bl-2xl">
                  WAITING APPROVAL
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-black text-lg">
                      {req.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-black text-base text-slate-900 dark:text-white">{req.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">Class: {req.classNumber || 'General'}</p>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <School size={14} className="text-slate-400" />
                      <span className="font-semibold">{req.school || 'Not specified'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-slate-400" />
                      <span className="font-mono">{req.contact || 'No contact provided'}</span>
                    </div>
                    {req.purpose && (
                      <div className="pt-1 text-[11px] text-slate-500 italic border-t border-slate-200 dark:border-slate-700 mt-1">
                        "{req.purpose}"
                      </div>
                    )}
                  </div>
                  
                  <div className="text-[10px] text-slate-400 font-mono">
                    Requested: {new Date(req.createdAt).toLocaleString()}
                  </div>
                </div>

                {/* Instant Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    onClick={() => handleApprove(req)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs h-11 gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <UserCheck size={16} />
                    <span>Approve Pass</span>
                  </Button>

                  <Button
                    onClick={() => handleReject(req)}
                    variant="outline"
                    className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-2xl font-black text-xs h-11 gap-1.5 cursor-pointer"
                  >
                    <UserX size={16} />
                    <span>Reject</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Historical Processed Requests */}
      {historyList.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-slate-200 dark:border-slate-800">
          <h4 className="text-sm font-black text-slate-600 dark:text-slate-400">
            Previously Reviewed Guests ({historyList.length})
          </h4>

          <div className="space-y-2">
            {historyList.slice(0, 10).map(req => (
              <div 
                key={req.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{req.name}</span>
                  <span className="text-slate-400 ml-2">Class {req.classNumber} • {req.school}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Badge className={req.status === 'approved' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}>
                    {req.status.toUpperCase()}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(req.id)}
                    className="text-slate-400 hover:text-rose-600 h-8 w-8 p-0"
                  >
                    <XCircle size={15} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
