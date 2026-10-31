import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  ShieldCheck, 
  Users, 
  FileSpreadsheet, 
  Video, 
  FolderSync, 
  Lightbulb, 
  Compass, 
  FileText, 
  Settings, 
  Lock, 
  Unlock, 
  Bell, 
  AlertTriangle, 
  Sparkles, 
  Clock, 
  Flame, 
  Check, 
  Search, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Smartphone, 
  Camera,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Zap,
  Activity,
  ShieldAlert, 
  Wifi, 
  Globe, 
  LogOut, 
  Award,
  BookOpen,
  Radio,
  HardDrive,
  Copy,
  Printer,
  Download,
  Share2,
  FileCheck2,
  Crown,
  QrCode
} from 'lucide-react';
import { UserProfile, Note, Quiz, SurveyConfig, MeetingRoom, StudentIdea, AppConfig } from '../types';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, getDocs, doc, setDoc, updateDoc, deleteDoc, limit, addDoc } from 'firebase/firestore';
import { toast } from 'sonner';

// Child Control Sub-Components
import { AdminSurveyManager } from './AdminSurveyManager';
import { LiveMeetingsHub } from './LiveMeetingsHub';
import { GoogleWorkspaceHub } from './GoogleWorkspaceHub';
import { GoogleKeepIdeasHub } from './GoogleKeepIdeasHub';
import { ProgressReportPdfGenerator } from './ProgressReportPdfGenerator';
import { LearningRoadmap } from './LearningRoadmap';
import { AdminCCTVProctorGrid } from './AdminCCTVProctorGrid';
import { AdminGuestRequestsManager } from './AdminGuestRequestsManager';

interface AdminMasterControlCenterProps {
  currentUser: UserProfile;
  notes: Note[];
  quizzes: Quiz[];
  appConfig: AppConfig;
  onRefreshAll?: () => void;
}

type AdminModuleType = 'devices' | 'cctv' | 'guests' | 'health' | 'student_command' | 'broadcast' | 'surveys' | 'meetings' | 'workspace' | 'ideas' | 'reports' | 'examgen' | 'backup' | 'roadmap' | 'config';

export const AdminMasterControlCenter: React.FC<AdminMasterControlCenterProps> = ({
  currentUser,
  notes,
  quizzes,
  appConfig,
  onRefreshAll
}) => {
  const [activeModule, setActiveModule] = useState<AdminModuleType>('devices');

  // Device & User Management State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserForReport, setSelectedUserForReport] = useState<UserProfile | null>(currentUser);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<UserProfile | null>(null);

  // Student Direct Command & Badge State
  const [targetStudentUid, setTargetStudentUid] = useState('');
  const [directMessageTitle, setDirectMessageTitle] = useState('🌟 Teacher Special Instruction');
  const [directMessageText, setDirectMessageText] = useState('');
  const [isSendingDirectMessage, setIsSendingDirectMessage] = useState(false);
  const [examFocusActive, setExamFocusActive] = useState(false);
  const [healthFilter, setHealthFilter] = useState<'all' | 'low' | 'charging' | 'online'>('all');
  const [pendingGuestsCount, setPendingGuestsCount] = useState(0);

  // Live Listener for Pending Special Guest Requests to trigger Blinking Alert
  useEffect(() => {
    try {
      const q = query(collection(db, 'guestRequests'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        const count = snap.docs.filter(d => d.data().status === 'pending').length;
        setPendingGuestsCount(count);
      }, (err) => console.warn("Guest requests badge error:", err));
      return unsub;
    } catch {}
  }, []);

  // App Config State
  const [configCountdown, setConfigCountdown] = useState(appConfig.countdownMessage || '');
  const [configCountdownDate, setConfigCountdownDate] = useState(appConfig.countdownDate || '');
  const [configTape, setConfigTape] = useState(appConfig.crimeTapeText || '');
  const [configBannerText, setConfigBannerText] = useState(appConfig.hyperlinkText || '');
  const [configBannerUrl, setConfigBannerUrl] = useState(appConfig.hyperlinkUrl || '');
  const [savingConfig, setSavingConfig] = useState(false);

  // Broadcast Alert State
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('📢 EMERGENCY ACADEMIC ANNOUNCEMENT');
  const [broadcastSeverity, setBroadcastSeverity] = useState<'info' | 'warning' | 'urgent'>('urgent');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [currentBroadcast, setCurrentBroadcast] = useState<any>(null);

  // Real-time Active Broadcast Listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'broadcasts', 'current'), (snap) => {
      if (snap.exists()) {
        setCurrentBroadcast(snap.data());
      } else {
        setCurrentBroadcast(null);
      }
    }, (err) => console.warn("Broadcast listener err:", err));
    return unsub;
  }, []);

  // Question Paper Generator State
  const [examSubject, setExamSubject] = useState('Physical Science');
  const [examMarks, setExamMarks] = useState(50);
  const [generatedExamPaper, setGeneratedExamPaper] = useState<string | null>(null);

  const handleToggleVipForStudent = async (student: UserProfile, makeVip: boolean) => {
    try {
      await updateDoc(doc(db, 'users', student.uid), {
        isVIP: makeVip,
        vipSince: makeVip ? new Date().toISOString() : null,
        vipPlan: makeVip ? 'Manual Admin VIP Pass' : null
      });
      await setDoc(doc(db, 'leaderboard', student.uid), { isVIP: makeVip }, { merge: true }).catch(() => {});
      setUsers(prev => prev.map(u => u.uid === student.uid ? { ...u, isVIP: makeVip } : u));
      toast.success(`VIP status for ${student.name} ${makeVip ? 'Activated' : 'Revoked'}`);
    } catch (e: any) {
      toast.error("Failed to update VIP status: " + e.message);
    }
  };

  // Pending items counts for badges
  const [pendingIdeasCount, setPendingIdeasCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [adminRequests, setAdminRequests] = useState<any[]>([]);

  // Fetch Users for Device Monitoring
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const q = query(collection(db, 'users'), limit(150));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      list.sort((a, b) => new Date(b.lastActive || 0).getTime() - new Date(a.lastActive || 0).getTime());
      setUsers(list);
    } catch (e: any) {
      console.warn("Failed to fetch users for device monitoring:", e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    try {
      const q = query(collection(db, 'users'), limit(150));
      const unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
        list.sort((a, b) => new Date(b.lastActive || 0).getTime() - new Date(a.lastActive || 0).getTime());
        setUsers(list);
        setLoadingUsers(false);
      }, (err) => {
        console.warn("User onSnapshot error:", err);
      });
      return unsub;
    } catch {
      fetchUsers();
    }
  }, []);

  // Listen for Ideas
  useEffect(() => {
    try {
      const q = query(collection(db, 'studentIdeas'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        const count = snap.docs.filter(d => !d.data().isReviewed).length;
        setPendingIdeasCount(count);
      });
      return unsub;
    } catch {}
  }, []);

  // Listen for Promotion Requests
  useEffect(() => {
    try {
      const q = query(collection(db, 'adminRequests'), orderBy('requestedAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAdminRequests(reqs);
        setPendingRequestsCount(reqs.filter((r: any) => r.status === 'pending').length);
      });
      return unsub;
    } catch {}
  }, []);

  // Remote Device Commands
  const handleRemoteLockDevice = async (targetUser: UserProfile, enable: boolean) => {
    try {
      const defaultPin = targetUser.lockoutPassword || '123456';
      await setDoc(doc(db, 'users', targetUser.uid), {
        lockoutEnabled: enable,
        lockoutPassword: defaultPin,
        lockoutPermanentSiren: false,
        lockoutAttemptsCount: 0
      }, { merge: true });

      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, lockoutEnabled: enable, lockoutPassword: defaultPin } : u));
      toast.success(enable ? `🔒 Remotely LOCKED device for ${targetUser.name}! Siren armed.` : `🔓 Device unlocked for ${targetUser.name}!`);
    } catch (e: any) {
      toast.error("Device lock operation failed: " + e.message);
    }
  };

  const handleRemoteTriggerSiren = async (targetUser: UserProfile) => {
    try {
      await setDoc(doc(db, 'users', targetUser.uid), {
        lockoutEnabled: true,
        lockoutPermanentSiren: true
      }, { merge: true });
      toast.error(`🚨 EMERGENCY SIREN TRIGGERED on ${targetUser.name}'s device!`);
    } catch (e: any) {
      toast.error("Failed to trigger siren: " + e.message);
    }
  };

  const handleAdjustPoints = async (targetUser: UserProfile, delta: number) => {
    try {
      const newPts = Math.max(0, (targetUser.points || 0) + delta);
      await setDoc(doc(db, 'users', targetUser.uid), { points: newPts }, { merge: true });
      await setDoc(doc(db, 'leaderboard', targetUser.uid), { points: newPts }, { merge: true });
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, points: newPts } : u));
      toast.success(`Updated points for ${targetUser.name}: ${newPts} pts (${delta > 0 ? `+${delta}` : delta})`);
    } catch (e: any) {
      toast.error("Points update failed: " + e.message);
    }
  };

  // Bulk Points to all students
  const handleBulkBonusPoints = async (amount: number) => {
    if (!window.confirm(`Are you sure you want to award +${amount} points to all ${users.length} registered students?`)) return;
    try {
      const updates = users.map(u => {
        const newPts = (u.points || 0) + amount;
        return setDoc(doc(db, 'users', u.uid), { points: newPts }, { merge: true });
      });
      await Promise.all(updates);
      toast.success(`🎉 Bonus +${amount} points distributed to all ${users.length} students!`);
    } catch (e: any) {
      toast.error("Bulk points failed: " + e.message);
    }
  };

  // Broadcast Alert to all screens (Dual-Channel Multi-Screen Publish)
  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error("Please enter a broadcast announcement message");
      return;
    }
    setIsSendingBroadcast(true);
    const broadcastId = `bc_${Date.now()}`;
    const broadcastData = {
      id: broadcastId,
      message: broadcastMessage.trim(),
      title: broadcastTitle.trim() || '📢 EMERGENCY ACADEMIC ANNOUNCEMENT',
      sender: currentUser?.name || 'Subhajit Sanpui (Founder)',
      timestamp: new Date().toISOString(),
      severity: broadcastSeverity,
      isActive: true
    };

    try {
      // 1. Publish to active broadcasts collection - triggers real-time snapshot on all connected clients
      await setDoc(doc(db, 'broadcasts', 'current'), broadcastData);

      // 2. Also update config/app for ticker banner sync
      await setDoc(doc(db, 'config', 'app'), {
        crimeTapeText: `📢 ADMIN ALERT: ${broadcastMessage.trim().toUpperCase()}`,
        hyperlinkText: broadcastMessage.trim(),
        hyperlinkUrl: '#smart-subha-ai-agent'
      }, { merge: true });

      // 3. Fallback: Write directly into top 100 registered user profiles for guaranteed instant modal
      const userBatch = users.slice(0, 100).map(u => 
        setDoc(doc(db, 'users', u.uid), {
          activeBroadcast: broadcastData
        }, { merge: true })
      );
      await Promise.all(userBatch);

      // 4. Record history
      await addDoc(collection(db, 'broadcastsHistory'), broadcastData).catch(() => {});

      toast.success("📢 Alert Broadcasted INSTANTLY to all student screens!");
      setBroadcastMessage('');
    } catch (e: any) {
      toast.error("Failed to broadcast alert: " + e.message);
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const handleStopBroadcast = async () => {
    try {
      await setDoc(doc(db, 'broadcasts', 'current'), {
        isActive: false,
        clearedAt: new Date().toISOString()
      }, { merge: true });

      await setDoc(doc(db, 'config', 'app'), {
        crimeTapeText: '',
        hyperlinkText: ''
      }, { merge: true });

      // Clear for top users
      const userClears = users.slice(0, 100).map(u => 
        setDoc(doc(db, 'users', u.uid), {
          activeBroadcast: null
        }, { merge: true })
      );
      await Promise.all(userClears);

      toast.success("Broadcast alert cleared from all student screens!");
    } catch (e: any) {
      toast.error("Failed to clear broadcast: " + e.message);
    }
  };

  // Direct Message to Student
  const handleSendDirectMessage = async () => {
    if (!targetStudentUid) {
      toast.error("Please select a student from the dropdown");
      return;
    }
    if (!directMessageText.trim()) {
      toast.error("Please enter a message for the student");
      return;
    }
    setIsSendingDirectMessage(true);
    try {
      await setDoc(doc(db, 'users', targetStudentUid), {
        adminDirectMessage: {
          title: directMessageTitle,
          text: directMessageText.trim(),
          sender: currentUser?.name || 'Subhajit Sanpui (Founder)',
          sentAt: new Date().toISOString()
        }
      }, { merge: true });
      toast.success("Direct notification sent to student device!");
      setDirectMessageText('');
    } catch (e: any) {
      toast.error("Failed to send message: " + e.message);
    } finally {
      setIsSendingDirectMessage(false);
    }
  };

  const handleToggleVip = async (targetUser: UserProfile) => {
    try {
      await setDoc(doc(db, 'users', targetUser.uid), {
        isVIP: !targetUser.isVIP
      }, { merge: true });
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, isVIP: !targetUser.isVIP } : u));
      toast.success(targetUser.isVIP ? `VIP removed from ${targetUser.name}` : `🌟 VIP status awarded to ${targetUser.name}!`);
    } catch (e: any) {
      toast.error("Failed to update VIP: " + e.message);
    }
  };

  const handleAwardHonorBadge = async (targetUser: UserProfile, badge: string) => {
    try {
      await setDoc(doc(db, 'users', targetUser.uid), {
        honorBadge: badge
      }, { merge: true });
      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, honorBadge: badge } : u));
      toast.success(`Awarded ${badge} badge to ${targetUser.name}!`);
    } catch (e: any) {
      toast.error("Failed to award badge: " + e.message);
    }
  };

  const handleToggleExamFocus = async () => {
    const nextState = !examFocusActive;
    setExamFocusActive(nextState);
    try {
      await setDoc(doc(db, 'config', 'app'), {
        crimeTapeText: nextState ? "🚨 EXAM REVISION MODE ACTIVE - ZERO DISTRACTION STRICT FOCUS" : configTape,
        hyperlinkText: nextState ? "🎯 Final Madhyamik Revision in Progress! Study all notes now." : configBannerText
      }, { merge: true });
      toast.success(nextState ? "🎯 High-Intensity Exam Focus Mode ENABLED!" : "Exam Focus Mode disabled.");
    } catch (e: any) {
      toast.error("Failed to update focus mode: " + e.message);
    }
  };

  // Device Health Battery Alerts
  const handleSendLowBatteryPing = async (targetUser: UserProfile) => {
    try {
      const level = targetUser.battery?.level || 15;
      await setDoc(doc(db, 'users', targetUser.uid), {
        adminDirectMessage: {
          title: "⚡ URGENT: LOW BATTERY WARNING",
          text: `Your device battery is critically low (${level}%). Please plug in your charger immediately to avoid an unexpected shutdown during critical study and exam preparation!`,
          sender: "System Battery Monitor (Admin)",
          sentAt: new Date().toISOString()
        }
      }, { merge: true });
      toast.success(`⚡ Low battery charging reminder sent to ${targetUser.name}!`);
    } catch (e: any) {
      toast.error("Failed to send alert: " + e.message);
    }
  };

  const handleBulkLowBatteryPing = async () => {
    const lowBatteryUsers = users.filter(u => u.battery && u.battery.level <= 20 && !u.battery.isCharging);
    if (lowBatteryUsers.length === 0) {
      toast.info("No active devices currently have critically low (<20%) discharging batteries!");
      return;
    }
    try {
      const alerts = lowBatteryUsers.map(u => 
        setDoc(doc(db, 'users', u.uid), {
          adminDirectMessage: {
            title: "⚡ CRITICAL LOW BATTERY REMINDER",
            text: `Your battery level is ${u.battery?.level}%. Connect your charger right now to avoid sudden shutdown during your study session!`,
            sender: "System Battery Monitor (Admin)",
            sentAt: new Date().toISOString()
          }
        }, { merge: true })
      );
      await Promise.all(alerts);
      toast.success(`⚡ Dispatched low battery alerts to ${lowBatteryUsers.length} student devices!`);
    } catch (e: any) {
      toast.error("Bulk alert failed: " + e.message);
    }
  };

  // 1-Click Complete System JSON Backup
  const handleExportFullBackup = () => {
    try {
      const backupPayload = {
        title: "StudySnap Full Platform Database Backup",
        backupTimestamp: new Date().toISOString(),
        exportedBy: currentUser.email,
        counts: {
          notesCount: notes.length,
          quizzesCount: quizzes.length,
          studentsCount: users.length,
        },
        notes: notes,
        quizzes: quizzes,
        registeredStudents: users.map(u => ({
          uid: u.uid,
          name: u.name,
          email: u.email,
          class: u.class,
          school: u.school,
          points: u.points,
          streak: u.streak,
          readNotesHistory: u.readNotesHistory || []
        })),
        appConfig: appConfig
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `StudySnap_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast.success(`✅ Backup generated successfully! (${notes.length} notes, ${users.length} student profiles secured)`);
    } catch (e: any) {
      toast.error("Failed to generate backup: " + e.message);
    }
  };

  // Question Paper Generator
  const handleGenerateExamPaper = () => {
    let paper = '';
    if (examSubject === 'Physical Science') {
      paper = `# StudySnap Madhyamik Model Examination 2025
বিষয়: ভৌতবিজ্ঞান (Physical Science) | সময়: ১ ঘণ্টা ৩০ মিনিট | পূর্ণমান: ${examMarks}

বিভাগ - ক (সঠিক উত্তরটি নির্বাচন করো - MCQ) [১ x ৫ = ৫]
১.১ নীচের কোনটি ওজোনস্তরকে ক্ষয় করে না? (ক) NO  (খ) NO2  (গ) CFC  (ঘ) CO2
১.২ বয়েল-এর সূত্রে ধ্রুবক রাশি হলো - (ক) চাপ ও ভর  (খ) তাপমাত্রা ও ভর  (গ) আয়তন  (ঘ) ঘনত্ব
১.৩ একটি অবতল দর্পণের বক্রতা ব্যাসার্ধ 20 cm হলে ফোকাস দৈর্ঘ্য হবে - (ক) 10 cm  (খ) 20 cm  (গ) 40 cm
১.৪ রোধের SI একক হলো - (ক) ভোল্ট  (খ) ওহম  (গ) অ্যাম্পিয়ার  (ঘ) জুল
১.৫ কোনটি ক্ষার ধাতু? (ক) Mg  (খ) Na  (গ) Fe  (ঘ) Cu

বিভাগ - খ (একটি বাক্যে উত্তর দাও) [১ x ৫ = ৫]
২.১ বায়ুমণ্ডলের শীতলতম স্তর কোনটি?
২.২ পরমশূন্য তাপমাত্রার মান সেলসিয়াস স্কেলে কত?
২.৩ আলোর প্রতিসরণে কোন ধর্মটি অপরিবর্তিত থাকে?
২.৪ ফ্লেমিং-এর বামহস্ত নিয়মে মধ্যমা কোন রাশিকে নির্দেশ করে?
২.৫ আধুনিক পর্যায় সারণির জনক কে?

বিভাগ - গ (সংক্ষিপ্ত উত্তরভিত্তিক প্রশ্ন) [২ x ৫ = ১০]
৩.১ বিশ্ব উষ্ণায়ন (Global Warming) প্রতিরোধের দুটি উপায় লেখো।
৩.২ চার্লসের সূত্রটি বিবৃত করো এবং লেখচিত্র অঙ্কন করো।
৩.৩ ওহমের সূত্রটি লেখো এবং গাণিতিক রূপ প্রকাশ করো।
৩.৪ দীর্ঘদৃষ্টি বা হাইপারমেট্রোপিয়া কী? এর প্রতিকার কী?
৩.৫ মেন্ডেলিফের পর্যায় সূত্র ও মোজলের আধুনিক পর্যায় সূত্রের পার্থক্য লেখো।

বিভাগ - ঘ (দীর্ঘ উত্তরভিত্তিক প্রশ্ন) [৩ x ৫ = ১৫]
৪.১ আদর্শ গ্যাস সমীকরণ PV = nRT প্রতিষ্ঠা করো।
৪.২ প্রমাণ করো উত্তল বা অবতল দর্পণের ক্ষেত্রে r = 2f (চিত্র আবশ্যক)।
৪.৩ সমান্তরাল সমবায়ে যুক্ত 2Ω, 3Ω ও 6Ω রোধের তুল্য রোধ নির্ণয় করো।
৪.৪ তড়িৎচৌম্বকীয় আবেশ সংক্রান্ত ফ্যারাডের সূত্রগুলি লেখো এবং লেঞ্জের সূত্রটি উল্লেখ করো।`;
    } else if (examSubject === 'Mathematics') {
      paper = `# StudySnap Madhyamik Model Examination 2025
বিষয়: গণিত (Mathematics) | সময়: ১ ঘণ্টা ৩০ মিনিট | পূর্ণমান: ${examMarks}

বিভাগ - ক (সঠিক উত্তর নির্বাচন করো) [১ x ৪ = ৪]
১.১ ax² + bx + c = 0 সমীকরণের বীজদ্বয় সমান ও বাস্তব হওয়ার শর্ত - (ক) b² - 4ac > 0  (খ) b² - 4ac = 0  (গ) b² - 4ac < 0
১.২ বার্ষিক r% সরল সুদে p টাকার t বছরের সুদ I হলে - (ক) I = prt/100  (খ) p = Irt  (গ) r = 100/Ipt
১.৩ অর্ধবৃত্তস্থ কোণের মান - (ক) 60°  (খ) 90°  (গ) 180°
১.৪ দুটি বৃত্ত পরস্পরকে বহিস্পর্শ করলে সাধারণ স্পর্শকের সংখ্যা - (ক) ১  (খ) ২  (গ) ৩  (ঘ) ৪

বিভাগ - খ (সংক্ষিপ্ত প্রশ্ন) [২ x ৫ = ১০]
২.১ বার্ষিক 5% চক্রবৃদ্ধি সুদের হারে 8000 টাকার 2 বছরের সমূল চক্রবৃদ্ধি কত?
২.২ x² - 22x + 105 = 0 দ্বিঘাত সমীকরণের বীজদ্বয় নির্ণয় করো।
২.৩ একটি লম্ববৃত্তাকার শঙ্কুর ভূমির ব্যাসার্ধ 7 সেমি এবং তির্যক উচ্চতা 25 সেমি হলে আয়তন কত?
২.৪ sec²θ - tan²θ এর মান কত যখন 0° < θ < 90°?
২.৫ একটি ঘনকের সমগ্রতলের ক্ষেত্রফল 216 বর্গসেমি হলে তার কর্ণের দৈর্ঘ্য কত?

বিভাগ - গ (উপপাদ্য ও দীর্ঘ উত্তরভিত্তিক প্রশ্ন) [৫ x ৩ = ১৫]
৩.১ প্রমাণ করো: ব্যাস নয় এরূপ কোনো জ্যা-কে যদি বৃত্তের কেন্দ্রবিন্দুগামী কোনো সরলরেখা সমদ্বিখণ্ডিত করে, তবে সেই সরলরেখা ওই জ্যা-এর ওপর লম্ব হবে।
৩.২ প্রমাণ করো: বৃত্তস্থ চতুর্ভুজের বিপরীত কোণগুলি পরস্পর সম্পূরক।
৩.৩ সমদ্বিবাহু ত্রিভুজ ABC-এর পরিবৃত্ত অঙ্কন করো যার ভূমি BC = 6 সেমি এবং সমান বাহুদ্বয় AB = AC = 5 সেমি।`;
    } else {
      paper = `# StudySnap Madhyamik Model Examination 2025
বিষয়: ${examSubject} | সময়: ১ ঘণ্টা ৩০ মিনিট | পূর্ণমান: ${examMarks}

বিভাগ - ক (বহুবিকল্পভিত্তিক প্রশ্ন - MCQ) [১ x ৫ = ৫]
১.১ সঠিক উত্তরটি নির্বাচন করে লেখো।
১.২ সঠিক বিকল্পটি চিহ্নিত করো।
১.৩ সঠিক উত্তর নির্বাচন করো।

বিভাগ - খ (অতিসংক্ষিপ্ত প্রশ্ন) [১ x ৫ = ৫]
২.১ একটি পূর্ণ বাক্যে উত্তর দাও।
২.২ শূন্যস্থান পূরণ করো।
২.৩ সত্য অথবা মিথ্যা নির্বাচন করো।

বিভাগ - গ (সংক্ষিপ্ত ব্যাখ্যামূলক প্রশ্ন) [২ x ৫ = ১০]
৩.১ পরিভাষা ও সংজ্ঞা বিশ্লেষণ করো।
৩.২ দুটি বিষয়ের মধ্যে পার্থক্য নিরূপণ করো।
৩.৩ উদাহরণসহ ভৌগোলিক / ঐতিহাসিক গুরুত্ব ব্যাখ্যা করো।

বিভাগ - ঘ (বিশ্লেষণমূলক বড় প্রশ্ন) [৫ x ৩ = ১৫]
৪.১ চিত্রসহ / প্রমাণসহ বিস্তারিত আলোচনা করো।
৪.২ মাধ্যমিক পরীক্ষার জন্য নির্ধারিত ৩টি গুরুত্বপূর্ণ প্রশ্ন প্রস্তুত করো।`;
    }

    setGeneratedExamPaper(paper);
    toast.success(`Generated official ${examSubject} Question Paper (${examMarks} marks)!`);
  };

  const handleSaveAppConfig = async () => {
    setSavingConfig(true);
    try {
      await setDoc(doc(db, 'config', 'app'), {
        countdownMessage: configCountdown,
        countdownDate: configCountdownDate,
        crimeTapeText: configTape,
        hyperlinkText: configBannerText,
        hyperlinkUrl: configBannerUrl
      }, { merge: true });
      toast.success("✅ App Global Configuration updated successfully!");
    } catch (e: any) {
      toast.error("Failed to update app config: " + e.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(searchUser.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchUser.toLowerCase()) ||
    (u.school || '').toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div className="w-full space-y-6">
      {/* Master Control Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-navy-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-2xl border-2 border-indigo-500/30">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-black tracking-widest border border-rose-500/30 uppercase">
              <ShieldCheck size={14} className="text-rose-400" />
              <span>SUPER ADMIN COMMAND & SYSTEM CONTROL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>All-In-One Admin Control Center</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Centralized command center for managing user devices, Google Forms surveys, virtual study rooms, Google Workspace, Google Keep student ideas, and academic progress reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                fetchUsers();
                if (onRefreshAll) onRefreshAll();
                toast.success("System status refreshed!");
              }}
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl text-xs font-bold gap-1.5 h-10 px-3 cursor-pointer"
            >
              <RefreshCw size={14} className={loadingUsers ? "animate-spin" : ""} />
              <span>Refresh Stats</span>
            </Button>
          </div>
        </div>

        {/* Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Live Blinking Alert for Special Guest Requests */}
      {pendingGuestsCount > 0 && (
        <div 
          onClick={() => setActiveModule('guests')}
          className="cursor-pointer rounded-[2rem] bg-gradient-to-r from-amber-500 via-rose-600 to-indigo-900 text-white p-4 sm:p-5 shadow-2xl flex items-center justify-between animate-pulse border-2 border-amber-300"
        >
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-white animate-ping" />
            <div>
              <div className="text-xs font-mono font-black uppercase text-amber-300 tracking-wider">
                🚨 SPECIAL GUEST ACCESS PENDING APPROVAL
              </div>
              <div className="text-sm font-black text-white">
                {pendingGuestsCount} New Student(s) Waiting For Entry Approval! Click to Review & Approve
              </div>
            </div>
          </div>
          <Badge className="bg-white text-rose-700 font-mono font-black text-xs px-3 py-1.5 rounded-xl">
            REVIEW GUESTS →
          </Badge>
        </div>
      )}

      {/* Module Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveModule('devices')}
          className={`p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all text-[11px] font-black cursor-pointer text-center ${
            activeModule === 'devices'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <Smartphone size={17} />
          <span className="truncate w-full">Devices</span>
        </button>

        <button
          onClick={() => setActiveModule('cctv')}
          className={`relative p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all text-[11px] font-black cursor-pointer text-center ${
            activeModule === 'cctv'
              ? 'bg-rose-700 text-white shadow-lg shadow-rose-700/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <Camera size={17} />
          <span className="truncate w-full">CCTV Proctor</span>
          {users.some(u => (u.tabSwitchCount || 0) > 0 || u.isDarkThreatLocked) && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveModule('guests')}
          className={`relative p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all text-[11px] font-black cursor-pointer text-center ${
            activeModule === 'guests'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles size={17} />
          <span className="truncate w-full">Guest Passes</span>
          {pendingGuestsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveModule('health')}
          className={`relative p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all text-[11px] font-black cursor-pointer text-center ${
            activeModule === 'health'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <Activity size={17} />
          <span className="truncate w-full">Device Health</span>
          {users.some(u => u.battery && u.battery.level <= 20 && !u.battery.isCharging) && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveModule('student_command')}
          className={`p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all text-[11px] font-black cursor-pointer text-center ${
            activeModule === 'student_command'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <Award size={17} />
          <span className="truncate w-full">Student Hub</span>
        </button>

        <button
          onClick={() => setActiveModule('broadcast')}
          className={`p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all text-[11px] font-black cursor-pointer text-center ${
            activeModule === 'broadcast'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <Radio size={17} />
          <span className="truncate w-full">Broadcast</span>
        </button>

        <button
          onClick={() => setActiveModule('surveys')}
          className={`p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all text-[11px] font-black cursor-pointer text-center ${
            activeModule === 'surveys'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet size={17} />
          <span className="truncate w-full">Surveys</span>
        </button>

        <button
          onClick={() => setActiveModule('meetings')}
          className={`p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all text-[11px] font-black cursor-pointer text-center ${
            activeModule === 'meetings'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <Video size={17} />
          <span className="truncate w-full">Meetings</span>
        </button>

        <button
          onClick={() => setActiveModule('workspace')}
          className={`p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all text-[11px] font-black cursor-pointer text-center ${
            activeModule === 'workspace'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <FolderSync size={17} />
          <span className="truncate w-full">Workspace</span>
        </button>

        <button
          onClick={() => setActiveModule('ideas')}
          className={`relative p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all text-[11px] font-black cursor-pointer text-center ${
            activeModule === 'ideas'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <Lightbulb size={17} />
          <span className="truncate w-full">Ideas</span>
          {pendingIdeasCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveModule('reports')}
          className={`p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all text-[11px] font-black cursor-pointer text-center ${
            activeModule === 'reports'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <FileText size={17} />
          <span className="truncate w-full">PDF Reports</span>
        </button>

        <button
          onClick={() => setActiveModule('examgen')}
          className={`p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all text-[11px] font-black cursor-pointer text-center ${
            activeModule === 'examgen'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck2 size={17} />
          <span className="truncate w-full">Exam Maker</span>
        </button>

        <button
          onClick={() => setActiveModule('backup')}
          className={`p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all text-[11px] font-black cursor-pointer text-center ${
            activeModule === 'backup'
              ? 'bg-green-700 text-white shadow-lg shadow-green-700/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <HardDrive size={17} />
          <span className="truncate w-full">Backup</span>
        </button>

        <button
          onClick={() => setActiveModule('roadmap')}
          className={`p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all text-[11px] font-black cursor-pointer text-center ${
            activeModule === 'roadmap'
              ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <Compass size={17} />
          <span className="truncate w-full">Roadmap</span>
        </button>

        <button
          onClick={() => setActiveModule('config')}
          className={`relative p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all text-[11px] font-black cursor-pointer text-center ${
            activeModule === 'config'
              ? 'bg-slate-800 text-white shadow-lg'
              : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
          }`}
        >
          <Settings size={17} />
          <span className="truncate w-full">Config</span>
          {pendingRequestsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          )}
        </button>
      </div>

      {/* Module 1: Device Control & Remote Lockout Center */}
      {activeModule === 'devices' && (
        <Card className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
          <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-black">
                <Smartphone size={14} />
                REMOTE DEVICE CONTROL & SECURITY LOCKOUT
              </div>
              <CardTitle className="text-xl font-black mt-1">Student Devices Live Telemetry & Control</CardTitle>
              <CardDescription className="text-xs">
                Remotely arm security sirens, suspend device access, monitor battery & IP address, or adjust academic points in real-time.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Bulk Points Booster */}
              <Button
                size="sm"
                onClick={() => handleBulkBonusPoints(20)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black h-10 px-3 cursor-pointer"
              >
                +20 Pts to All Students
              </Button>
              <div className="w-full sm:w-56">
                <Input
                  placeholder="Search student or school..."
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  className="rounded-xl h-10 text-xs"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-sm">
                No users found. Click "Refresh Stats" above.
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isOnline = u.status === 'online' && u.lastActive && (new Date().getTime() - new Date(u.lastActive).getTime() < 180000);

                return (
                  <div 
                    key={u.uid}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      u.lockoutEnabled 
                        ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900' 
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* User Info */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                            {u.name || 'Student'}
                          </h4>
                          <Badge variant="outline" className="text-[10px] font-bold">
                            Class {u.class || 10} • {u.school || 'School'}
                          </Badge>
                          {u.lockoutEnabled && (
                            <Badge className="bg-rose-600 text-white text-[10px] font-black animate-pulse flex items-center gap-1">
                              <Lock size={10} />
                              LOCKED (SIREN ARMED)
                            </Badge>
                          )}
                          {u.isVIP && (
                            <Badge className="bg-amber-400 text-navy-950 text-[10px] font-black">
                              VIP
                            </Badge>
                          )}
                        </div>

                        {/* Telemetry Chips */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {u.battery && (
                            <span className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                              <Battery size={11} className={u.battery.level < 25 ? "text-rose-500" : "text-emerald-500"} />
                              <span>{u.battery.level}% {u.battery.isCharging ? '⚡' : ''}</span>
                            </span>
                          )}
                          {u.ipAddress && (
                            <span className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                              <Wifi size={11} className="text-blue-500" />
                              <span>IP: {u.ipAddress}</span>
                            </span>
                          )}
                          {u.deviceInfo?.platform && (
                            <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                              {u.deviceInfo.platform}
                            </span>
                          )}
                          <span className="text-amber-600 dark:text-amber-400 font-black font-sans">
                            Points: {u.points || 0} • Streak: {u.streak || 0}d
                          </span>
                        </div>

                        {/* Live Currently Reading Note Indicator */}
                        {u.currentlyReadingNote && (
                          <div className="flex items-center gap-2 p-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 animate-pulse mt-1">
                            <BookOpen size={14} className="text-emerald-600 shrink-0" />
                            <span>📖 LIVE STUDYING: <strong>{u.currentlyReadingNote.noteTitle}</strong> ({u.currentlyReadingNote.subject})</span>
                          </div>
                        )}
                      </div>

                      {/* Device Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Reading History Log Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedUserForHistory(u)}
                          className="rounded-xl text-xs font-bold h-9 px-3 gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer shadow-xs"
                          title="View all notes this student has studied"
                        >
                          <BookOpen size={13} />
                          <span>Reading Log ({u.readNotesHistory?.length || 0})</span>
                        </Button>

                        {/* Points Adjusters */}
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                          <button
                            onClick={() => handleAdjustPoints(u, 10)}
                            className="px-2 py-1 text-[10px] font-black text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            title="Add 10 points"
                          >
                            +10 Pts
                          </button>
                          <button
                            onClick={() => handleAdjustPoints(u, 50)}
                            className="px-2 py-1 text-[10px] font-black text-indigo-600 hover:bg-indigo-50 rounded-lg"
                            title="Add 50 points"
                          >
                            +50 Pts
                          </button>
                        </div>

                        {/* Remote Lockout Trigger */}
                        <Button
                          size="sm"
                          variant={u.lockoutEnabled ? "default" : "destructive"}
                          onClick={() => handleRemoteLockDevice(u, !u.lockoutEnabled)}
                          className={`rounded-xl text-xs font-black h-9 px-3 gap-1.5 shadow-sm cursor-pointer ${
                            u.lockoutEnabled ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                          }`}
                        >
                          {u.lockoutEnabled ? (
                            <>
                              <Unlock size={14} />
                              <span>Unlock Device</span>
                            </>
                          ) : (
                            <>
                              <Lock size={14} />
                              <span>Remote Lock Device</span>
                            </>
                          )}
                        </Button>

                        {/* Siren Override */}
                        {u.lockoutEnabled && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemoteTriggerSiren(u)}
                            className="rounded-xl text-xs font-black h-9 px-3 gap-1.5 bg-rose-700 hover:bg-rose-800 text-white animate-pulse"
                            title="Force dual high-intensity audio alarm"
                          >
                            <AlertTriangle size={14} />
                            <span>Force Siren</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* Module: CCTV & AI Proctoring Grid */}
      {activeModule === 'cctv' && (
        <AdminCCTVProctorGrid 
          currentUser={currentUser} 
          users={users} 
          onRefresh={fetchUsers} 
        />
      )}

      {/* Module: Special Guest Access Requests Manager */}
      {activeModule === 'guests' && (
        <AdminGuestRequestsManager onTotalPendingChange={setPendingGuestsCount} />
      )}

      {/* Module: Device Health & Real-time Battery Telemetry */}
      {activeModule === 'health' && (
        <div className="space-y-6">
          <Card className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-black">
                  <Activity size={14} />
                  LIVE DEVICE HEALTH & POWER MONITOR
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  Active Student Session Battery & Charging Health
                </h3>
                <p className="text-xs text-slate-500 max-w-xl">
                  লাইভ ব্যাটারি লেভেল ও চার্জিং স্ট্যাটাস মনিটর করুন যাতে পড়াশোনা বা পরীক্ষার সময় স্টুডেন্টদের ডিভাইস হঠাৎ বন্ধ হয়ে না যায়।
                </p>
              </div>

              {/* Bulk Low Battery Ping Tool */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={handleBulkLowBatteryPing}
                  className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black h-11 px-4 gap-2 shadow-md cursor-pointer"
                >
                  <Zap size={15} />
                  <span>Ping Low Battery Students (&le;20%)</span>
                </Button>
              </div>
            </div>

            {/* Health KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Monitored</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{users.length} Devices</div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                  <BatteryCharging size={12} />
                  <span>Charging (AC)</span>
                </div>
                <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {users.filter(u => u.battery?.isCharging).length}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
                <div className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Avg Battery Level</div>
                <div className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-0.5">
                  {Math.round(
                    users.reduce((acc, u) => acc + (u.battery?.level || 80), 0) / Math.max(1, users.length)
                  )}%
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center">
                <div className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1">
                  <BatteryWarning size={12} />
                  <span>Low Power (&le;20%)</span>
                </div>
                <div className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-0.5">
                  {users.filter(u => u.battery && u.battery.level <= 20 && !u.battery.isCharging).length}
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All Devices' },
                { id: 'low', label: 'Low Battery (≤20%) ⚠️' },
                { id: 'charging', label: 'Currently Charging ⚡' },
                { id: 'online', label: 'Online Sessions' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setHealthFilter(f.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                    healthFilter === f.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Student Device Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {users
                .filter(u => {
                  if (healthFilter === 'low') return u.battery && u.battery.level <= 20 && !u.battery.isCharging;
                  if (healthFilter === 'charging') return u.battery?.isCharging;
                  if (healthFilter === 'online') return u.status === 'online';
                  return true;
                })
                .map((u) => {
                  const level = u.battery?.level ?? 75;
                  const isCharging = u.battery?.isCharging ?? false;
                  const isLow = level <= 20 && !isCharging;

                  return (
                    <div
                      key={u.uid}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        isLow 
                          ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900 shadow-sm' 
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{u.name || 'Student'}</span>
                            {u.isVIP && <Badge className="bg-amber-400 text-navy-950 text-[9px] font-black">VIP</Badge>}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Class {u.class || 10} • {u.school || 'School'}
                          </div>
                        </div>

                        {isCharging ? (
                          <Badge className="bg-emerald-600 text-white font-black text-[9px] gap-1 px-2 py-0.5">
                            <Zap size={10} />
                            Charging ⚡
                          </Badge>
                        ) : isLow ? (
                          <Badge className="bg-rose-600 text-white font-black text-[9px] gap-1 px-2 py-0.5 animate-pulse">
                            <BatteryWarning size={10} />
                            Low Battery
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] font-mono">
                            On Battery
                          </Badge>
                        )}
                      </div>

                      {/* Visual Battery Level Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                            <Battery size={13} className={isLow ? 'text-rose-500' : isCharging ? 'text-emerald-500' : 'text-slate-500'} />
                            <span>Battery Level</span>
                          </span>
                          <span className={`font-black ${isLow ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                            {level}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              isLow ? 'bg-rose-600' : level > 50 ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${level}%` }}
                          />
                        </div>
                      </div>

                      {/* Device Metadata */}
                      <div className="text-[10px] text-slate-400 font-mono space-y-0.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex justify-between">
                          <span>Device:</span>
                          <span className="text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                            {u.deviceInfo?.platform || 'Mobile / Web'}
                          </span>
                        </div>
                        {u.currentlyReadingNote && (
                          <div className="text-emerald-600 dark:text-emerald-400 font-bold truncate">
                            📖 Studying: {u.currentlyReadingNote.noteTitle}
                          </div>
                        )}
                        {(u as any).lastScreenshotViolation && (
                          <div className="text-rose-600 font-black flex items-center gap-1 pt-0.5">
                            <ShieldAlert size={10} />
                            <span>Screenshot Warning Logged</span>
                          </div>
                        )}
                      </div>

                      {/* Action */}
                      {isLow && (
                        <Button
                          size="sm"
                          onClick={() => handleSendLowBatteryPing(u)}
                          className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black h-8 gap-1 cursor-pointer"
                        >
                          <Zap size={12} />
                          <span>Send Charging Reminder</span>
                        </Button>
                      )}
                    </div>
                  );
                })}
            </div>
          </Card>
        </div>
      )}

      {/* Module: Student Direct Command, VIP & Focus Control */}
      {activeModule === 'student_command' && (
        <div className="space-y-6">
          {/* Card 1: Direct Student Message Dispatcher */}
          <Card className="rounded-[2.5rem] border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900 shadow-xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-black">
                  <Award size={14} />
                  DIRECT STUDENT TARGETED DISPATCHER
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  Send Direct Commendation or Study Instruction to Any Student
                </h3>
                <p className="text-xs text-slate-500">
                  নির্দিষ্ট ছাত্রের ডিভাইসে অফিশিয়াল অ্যাডমিন নোটিশ পাঠান। শিক্ষার্থী অ্যাপ খুললেই এটি তার স্ক্রিনে ভেসে উঠবে।
                </p>
              </div>

              {/* High Intensity Exam Focus Switch */}
              <Button
                onClick={handleToggleExamFocus}
                className={`rounded-2xl text-xs font-black h-11 px-5 gap-2 shadow-md cursor-pointer ${
                  examFocusActive 
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse' 
                    : 'bg-slate-800 hover:bg-slate-900 text-white'
                }`}
              >
                <Flame size={16} className={examFocusActive ? 'text-amber-300' : ''} />
                <span>{examFocusActive ? 'Exam Revision Mode: ACTIVE' : 'Enable Exam Focus Mode'}</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Target Student
                </label>
                <select
                  value={targetStudentUid}
                  onChange={e => setTargetStudentUid(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 h-11 text-xs font-bold outline-none"
                >
                  <option value="">-- Choose Student from Roster --</option>
                  {users.map(u => (
                    <option key={u.uid} value={u.uid}>
                      {u.name} (Class {u.class || 10} • {u.school || 'School'}) - {u.points || 0} pts
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Official Message Category
                </label>
                <select
                  value={directMessageTitle}
                  onChange={e => setDirectMessageTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 h-11 text-xs font-bold outline-none"
                >
                  <option value="🌟 Special Academic Commendation">🌟 Special Academic Commendation</option>
                  <option value="🎯 Mandatory Study Reading Target">🎯 Mandatory Study Reading Target</option>
                  <option value="📝 Pending Homework & Notes Reminder">📝 Pending Homework & Notes Reminder</option>
                  <option value="🏆 VIP Scholar Recognition">🏆 VIP Scholar Recognition</option>
                  <option value="⚠️ Urgent Attendance & Quiz Notice">⚠️ Urgent Attendance & Quiz Notice</option>
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Message Content
                </label>
                <textarea
                  value={directMessageText}
                  onChange={e => setDirectMessageText(e.target.value)}
                  placeholder="Type your message for this student (e.g. Great progress on Chapter 2! Please review Chapter 3 and attempt the 2025 question paper before tomorrow)."
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 h-24"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSendDirectMessage}
                disabled={isSendingDirectMessage}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black h-11 px-6 gap-2 shadow-lg shadow-amber-600/20 cursor-pointer"
              >
                <Award size={15} />
                <span>{isSendingDirectMessage ? 'Sending...' : 'Dispatch Direct Notice to Student'}</span>
              </Button>
            </div>
          </Card>

          {/* Card 2: VIP & Honor Badges Center */}
          <Card className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-6 sm:p-8 space-y-4">
            <div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="text-amber-500" size={18} />
                <span>Student Honor Badges & VIP Status Granter</span>
              </h4>
              <p className="text-xs text-slate-500">
                Grant prestige badges and VIP privileges to reward high study performance.
              </p>
            </div>

            <div className="space-y-2">
              {users.slice(0, 10).map((u) => (
                <div key={u.uid} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-3 text-xs flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{u.name}</span>
                      {u.isVIP && <Badge className="bg-amber-400 text-navy-950 font-black text-[9px]">VIP</Badge>}
                      {u.honorBadge && <Badge className="bg-indigo-600 text-white font-black text-[9px]">{u.honorBadge}</Badge>}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Class {u.class || 10} • {u.school || 'School'} • {u.points || 0} Points
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleVip(u)}
                      className={`h-8 px-2.5 rounded-lg text-[10px] font-black cursor-pointer ${
                        u.isVIP ? 'border-amber-400 text-amber-600 bg-amber-50' : 'border-slate-200'
                      }`}
                    >
                      {u.isVIP ? 'Revoke VIP' : 'Make VIP'}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAwardHonorBadge(u, '🌟 Top Scholar')}
                      className="h-8 px-2 rounded-lg text-[10px] font-black border-slate-200 text-indigo-600 hover:bg-indigo-50"
                    >
                      Scholar 🌟
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAwardHonorBadge(u, '🔬 Science Champ')}
                      className="h-8 px-2 rounded-lg text-[10px] font-black border-slate-200 text-emerald-600 hover:bg-emerald-50"
                    >
                      Science 🔬
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAwardHonorBadge(u, '📐 Math Prodigy')}
                      className="h-8 px-2 rounded-lg text-[10px] font-black border-slate-200 text-blue-600 hover:bg-blue-50"
                    >
                      Math 📐
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Module: Broadcast & Urgent Alert Engine */}
      {activeModule === 'broadcast' && (
        <Card className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-black">
                <Radio size={14} />
                LIVE EMERGENCY MULTI-SCREEN BROADCAST ENGINE
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Instant Alert Broadcast to All Student Screens
              </h3>
              <p className="text-xs text-slate-500">
                সমস্ত শিক্ষার্থীর স্ক্রিনে সাথে সাথে হাই-প্রাইওরিটি স্ক্রল ব্যানার ও ফুল-স্ক্রিন নোটিফিকেশন পাঠাতে নিচের বক্সে মেসেজ লিখে ব্রডকাস্ট করুন।
              </p>
            </div>

            {currentBroadcast && currentBroadcast.isActive && (
              <Button
                onClick={handleStopBroadcast}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black h-10 px-4 gap-1.5 shadow-md cursor-pointer shrink-0 animate-pulse"
              >
                🛑 Stop Active Broadcast
              </Button>
            )}
          </div>

          {/* Live Active Status Indicator */}
          {currentBroadcast && currentBroadcast.isActive && (
            <div className="p-4 rounded-2xl bg-red-500/15 border-2 border-red-500/50 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-2 text-xs font-black text-red-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span>🔴 ACTIVE LIVE BROADCAST DISPLAYING ON ALL STUDENT SCREENS</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Sent: {currentBroadcast.timestamp ? new Date(currentBroadcast.timestamp).toLocaleTimeString() : 'Just now'}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white bg-white/40 dark:bg-black/40 p-3 rounded-xl">
                "{currentBroadcast.message}"
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Broadcast Announcement Message
              </label>
              <textarea
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                placeholder="e.g. 📢 ATTENTION: Tonight at 8:00 PM Madhyamik Physical Science Live Quiz will start. All students must be online!"
                className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500 h-28"
              />
            </div>

            {/* Template Shortcuts */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-[10px] font-black uppercase text-slate-400 shrink-0">Templates:</span>
              <button
                type="button"
                onClick={() => setBroadcastMessage('⚠️ EXAM NOTICE: Madhyamik Test Examination Question Papers are now uploaded in the Notes library. Please start revision!')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 shrink-0 cursor-pointer"
              >
                📝 Exam Papers Ready
              </button>
              <button
                type="button"
                onClick={() => setBroadcastMessage('⚡ CHARGING ALERT: All students must connect chargers before tonight\'s live online test to prevent sudden shutdown.')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 shrink-0 cursor-pointer"
              >
                ⚡ Charger Reminder
              </button>
              <button
                type="button"
                onClick={() => setBroadcastMessage('🎯 CLASS SCHEDULE: Live Doubt-Solving Class will start in 15 minutes on Google Meet. Click Join Room!')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 shrink-0 cursor-pointer"
              >
                🎯 Class in 15 Mins
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
              <div className="flex items-center gap-2">
                <Button
                  onClick={async () => {
                    await handleStopBroadcast();
                  }}
                  variant="outline"
                  className="rounded-xl text-xs font-bold h-11 px-4 text-slate-600 border-slate-200"
                >
                  Clear Broadcast
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSendBroadcast}
                  disabled={isSendingBroadcast}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black h-11 px-6 gap-2 shadow-lg shadow-red-600/30 cursor-pointer"
                >
                  <Radio size={16} />
                  <span>{isSendingBroadcast ? 'Broadcasting...' : 'Broadcast to All Screens Now'}</span>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Module: 1-Click System Backup & Disaster Recovery */}
      {activeModule === 'backup' && (
        <Card className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-black">
              <HardDrive size={14} />
              SYSTEM BACKUP & DATABASE GUARANTEE
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              1-Click Full Platform Backup (JSON Export)
            </h3>
            <p className="text-xs text-slate-500">
              আপনার অ্যাপের কোনো ডেটা যেন কখনই হারিয়ে না যায় তার জন্য এক ক্লিকে সম্পূর্ণ ডেটাবেস (সকল নোট, কুইজ ও ইউজার প্রোফাইল) কম্পিউটারে ডাউনলোড করে রাখুন।
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-center space-y-1">
              <div className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">Total Notes Secured</div>
              <div className="text-2xl font-black text-blue-900 dark:text-white">{notes.length} Notes</div>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 text-center space-y-1">
              <div className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400">Total Quizzes Secured</div>
              <div className="text-2xl font-black text-purple-900 dark:text-white">{quizzes.length} Quizzes</div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-center space-y-1">
              <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Student Profiles</div>
              <div className="text-2xl font-black text-emerald-900 dark:text-white">{users.length} Users</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-black text-sm text-slate-900 dark:text-white">Export All Data as Structured JSON File</h4>
              <p className="text-xs text-slate-500 mt-0.5">Compatible with any database restore and local archiving.</p>
            </div>

            <Button
              onClick={handleExportFullBackup}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black h-11 px-6 gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer shrink-0"
            >
              <Download size={16} />
              <span>Download Complete JSON Backup</span>
            </Button>
          </div>
        </Card>
      )}

      {/* Module: Exam & Question Paper Generator */}
      {activeModule === 'examgen' && (
        <Card className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 text-xs font-black">
              <FileCheck2 size={14} />
              ACADEMIC QUESTION PAPER GENERATOR
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Instant Madhyamik Model Examination Paper Builder
            </h3>
            <p className="text-xs text-slate-500">
              যেকোনো বিষয়ের জন্য মাধ্যমিক মানসম্মত মক টেস্ট ও ইউনিট পরীক্ষার প্রশ্নপত্র তৈরি করুন।
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Subject</label>
              <select
                value={examSubject}
                onChange={e => setExamSubject(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 h-11 text-xs font-bold outline-none"
              >
                <option value="Physical Science">ভৌতবিজ্ঞান (Physical Science)</option>
                <option value="Mathematics">গণিত (Mathematics)</option>
                <option value="Life Science">জীবন বিজ্ঞান (Life Science)</option>
                <option value="History">ইতিহাস (History)</option>
                <option value="Geography">ভূগোল (Geography)</option>
                <option value="Bengali">বাংলা (Bengali)</option>
                <option value="English">ইংরেজি (English)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Marks</label>
              <select
                value={examMarks}
                onChange={e => setExamMarks(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 h-11 text-xs font-bold outline-none"
              >
                <option value={25}>25 Marks (Class Test)</option>
                <option value={50}>50 Marks (Unit Test)</option>
                <option value={90}>90 Marks (Full Mock Board Exam)</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleGenerateExamPaper}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-black h-11 gap-2 cursor-pointer shadow-md"
              >
                <Sparkles size={15} />
                <span>Build Question Paper</span>
              </Button>
            </div>
          </div>

          {generatedExamPaper && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">Generated Examination Paper:</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedExamPaper);
                      toast.success("Question paper copied to clipboard!");
                    }}
                    className="rounded-xl text-xs font-bold h-8 px-3 gap-1"
                  >
                    <Copy size={13} />
                    <span>Copy Text</span>
                  </Button>
                </div>
              </div>

              <pre className="p-5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-96 overflow-y-auto border border-slate-200 dark:border-slate-700">
                {generatedExamPaper}
              </pre>
            </div>
          )}
        </Card>
      )}

      {/* Module 2: Google Forms Survey Engine */}
      {activeModule === 'surveys' && (
        <AdminSurveyManager currentUser={currentUser} isAdmin={true} />
      )}

      {/* Module 3: Virtual Study Rooms & Google Meet Hub */}
      {activeModule === 'meetings' && (
        <LiveMeetingsHub currentUser={currentUser} isAdmin={true} />
      )}

      {/* Module 4: Google Workspace Master Hub */}
      {activeModule === 'workspace' && (
        <GoogleWorkspaceHub notes={notes} currentUser={currentUser} isAdmin={true} />
      )}

      {/* Module 5: Google Keep Ideas Hub */}
      {activeModule === 'ideas' && (
        <GoogleKeepIdeasHub currentUser={currentUser} isAdmin={true} />
      )}

      {/* Module 6: Student Academic Progress PDF Reports */}
      {activeModule === 'reports' && (
        <Card className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-black">
              <FileText size={14} />
              STUDENT ACADEMIC REPORT GENERATOR (PDF)
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Official Progress Report Cards & Growth Certificates
            </h3>
            <p className="text-xs text-slate-500">
              Select any registered student below to generate and print their official progress report with current points, daily streak, and academic milestones.
            </p>
          </div>

          {/* Student Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {users.slice(0, 12).map((u) => (
              <div
                key={u.uid}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex flex-col justify-between gap-3"
              >
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">{u.name || 'Student'}</h4>
                  <p className="text-xs text-slate-500">Class {u.class || 10} • {u.school || 'School'}</p>
                  <p className="text-xs font-bold text-amber-600 mt-1">Points: {u.points || 0} • Streak: {u.streak || 0} Days</p>
                </div>

                <ProgressReportPdfGenerator 
                  profile={u} 
                  quizzes={quizzes} 
                  notes={notes} 
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Module: Learning Roadmap & Milestones */}
      {activeModule === 'roadmap' && (
        <LearningRoadmap currentUser={currentUser} notes={notes} />
      )}

      {/* Module 8: App Global Configuration & Admin Promotion Requests */}
      {activeModule === 'config' && (
        <div className="space-y-6">
          {/* Promotion Requests Queue */}
          <Card className="rounded-[2.5rem] border border-orange-200 dark:border-orange-950/60 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black flex items-center gap-2 text-slate-900 dark:text-white">
                  <Award size={18} className="text-orange-500" />
                  <span>Teacher & Admin Promotion Requests Queue</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Students requesting upgraded roles to help manage study resources and conduct classes.
                </p>
              </div>
              <Badge className="bg-orange-500 text-white font-black text-xs">
                {adminRequests.filter(r => r.status === 'pending').length} Pending
              </Badge>
            </div>

            {adminRequests.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No promotion requests at this time.</p>
            ) : (
              <div className="space-y-2">
                {adminRequests.map((req) => (
                  <div key={req.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="font-black text-slate-900 dark:text-white">{req.userName} ({req.userEmail})</div>
                      <div className="text-[10px] text-slate-400">Status: {req.status} • Requested: {new Date(req.requestedAt).toLocaleDateString()}</div>
                    </div>
                    {req.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              await setDoc(doc(db, 'users', req.id), { role: 'admin' }, { merge: true });
                              await setDoc(doc(db, 'adminRequests', req.id), { status: 'approved' }, { merge: true });
                              toast.success(`Promoted ${req.userName} to Admin!`);
                            } catch (e: any) {
                              toast.error(e.message);
                            }
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-8 px-3 rounded-lg text-xs"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await setDoc(doc(db, 'adminRequests', req.id), { status: 'rejected' }, { merge: true });
                              toast.info("Request rejected");
                            } catch (e: any) {
                              toast.error(e.message);
                            }
                          }}
                          className="h-8 px-3 rounded-lg text-xs text-rose-600 border-rose-200"
                        >
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* App Config Form */}
          <Card className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xl space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Settings size={18} className="text-slate-600" />
              <span>Global App Configuration Settings</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">Countdown Message Banner</label>
                <Input
                  value={configCountdown}
                  onChange={e => setConfigCountdown(e.target.value)}
                  placeholder="e.g. Madhyamik Exam 2025 Countdown"
                  className="rounded-xl h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">Countdown Target Date (YYYY-MM-DD)</label>
                <Input
                  value={configCountdownDate}
                  onChange={e => setConfigCountdownDate(e.target.value)}
                  placeholder="2025-02-12"
                  className="rounded-xl h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">Crime Scene Yellow Warning Tape Text</label>
                <Input
                  value={configTape}
                  onChange={e => setConfigTape(e.target.value)}
                  placeholder="e.g. CAUTION: EXAM PREPARATION ZONE - HARD WORK REQUIRED"
                  className="rounded-xl h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">Blinking Alert Banner Text</label>
                <Input
                  value={configBannerText}
                  onChange={e => setConfigBannerText(e.target.value)}
                  placeholder="e.g. New Madhyamik Suggestion PDF Uploaded!"
                  className="rounded-xl h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-300">Blinking Alert Banner Redirect URL</label>
                <Input
                  value={configBannerUrl}
                  onChange={e => setConfigBannerUrl(e.target.value)}
                  placeholder="https://..."
                  className="rounded-xl h-10 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveAppConfig}
                disabled={savingConfig}
                className="bg-navy-900 hover:bg-black text-white rounded-xl text-xs font-black h-10 px-6 shadow-md cursor-pointer"
              >
                {savingConfig ? "Saving..." : "Save App Configuration"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Reading History & Study Details Dialog */}
      <Dialog open={!!selectedUserForHistory} onOpenChange={(open) => !open && setSelectedUserForHistory(null)}>
        <DialogContent className="max-w-2xl w-[95vw] rounded-[2.5rem] p-6 sm:p-8 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <BookOpen className="text-blue-600" />
              <span>Student Study Log: {selectedUserForHistory?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Class {selectedUserForHistory?.class} • {selectedUserForHistory?.school} • Points: {selectedUserForHistory?.points || 0} • Streak: {selectedUserForHistory?.streak || 0}d
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {selectedUserForHistory?.currentlyReadingNote ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
                <div className="text-[10px] uppercase font-black text-emerald-700 dark:text-emerald-400 tracking-wider">
                  📖 Currently Reading Right Now (Live)
                </div>
                <div className="font-black text-sm sm:text-base text-emerald-900 dark:text-emerald-200 mt-1">
                  {selectedUserForHistory.currentlyReadingNote.noteTitle}
                </div>
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase mt-0.5">
                  Subject: {selectedUserForHistory.currentlyReadingNote.subject}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 font-medium">
                Student is not currently reading a note right now.
              </div>
            )}

            <div>
              <h4 className="font-black text-sm text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                <span>Completed Notes Reading History</span>
                <Badge variant="outline" className="text-[10px] font-bold">
                  {selectedUserForHistory?.readNotesHistory?.length || 0} Notes Read
                </Badge>
              </h4>

              {(!selectedUserForHistory?.readNotesHistory || selectedUserForHistory.readNotesHistory.length === 0) ? (
                <div className="p-8 text-center text-slate-400 font-bold text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                  This student has not read any notes yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {selectedUserForHistory.readNotesHistory.map((item, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1">{item.noteTitle}</div>
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase">{item.subject}</div>
                      </div>
                      <div className="text-right text-[10px] text-slate-500 font-mono shrink-0">
                        <div>{new Date(item.viewedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-emerald-600 dark:text-emerald-400 font-bold">{item.timeSpentSeconds ? `${Math.round(item.timeSpentSeconds / 60)}m ${item.timeSpentSeconds % 60}s read` : 'Completed'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
