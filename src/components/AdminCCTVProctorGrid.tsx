import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Camera, 
  Mic, 
  MicOff, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Volume2, 
  VolumeX, 
  Lock, 
  Unlock, 
  Maximize2, 
  RefreshCw, 
  Monitor, 
  Smartphone,
  Laptop,
  Radio,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { UserProfile } from '../types';
import { db } from '../lib/firebase';
import { doc, updateDoc, onSnapshot, collection } from 'firebase/firestore';
import { toast } from 'sonner';

interface AdminCCTVProctorGridProps {
  currentUser: UserProfile;
  users: UserProfile[];
  onRefresh?: () => void;
}

export const AdminCCTVProctorGrid: React.FC<AdminCCTVProctorGridProps> = ({
  currentUser,
  users: initialUsers,
  onRefresh
}) => {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [liveFeeds, setLiveFeeds] = useState<Record<string, { cameraSnapshot?: string; screenSnapshot?: string; cameraUpdatedAt?: string; screenUpdatedAt?: string }>>({});
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'camera_active' | 'screen_active' | 'tab_switched' | 'threat_locked'>('all');
  const [cardFeedMode, setCardFeedMode] = useState<Record<string, 'camera' | 'screen'>>({});
  const [zoomModalTab, setZoomModalTab] = useState<'split' | 'camera' | 'screen'>('split');
  const [adminMicActive, setAdminMicActive] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isAllThreatLocked, setIsAllThreatLocked] = useState(false);

  // Sync users prop
  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  // Real-time listener for liveProctoring collection
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'liveProctoring'), (snapshot) => {
        const feeds: Record<string, any> = {};
        snapshot.docs.forEach(docSnap => {
          feeds[docSnap.id] = docSnap.data();
        });
        setLiveFeeds(feeds);
      });
      return unsub;
    } catch (e) {
      console.warn("liveProctoring listener error:", e);
    }
  }, []);

  // Toggle Admin microphone
  const toggleAdminMic = async () => {
    if (!adminMicActive) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioStream(stream);
        setAdminMicActive(true);
        toast.success("🎙️ Admin Microphone Live! Voice broadcast active.");
      } catch (e: any) {
        toast.error("Microphone access denied: " + e.message);
      }
    } else {
      if (audioStream) {
        audioStream.getTracks().forEach(t => t.stop());
        setAudioStream(null);
      }
      setAdminMicActive(false);
      toast.info("Microphone Muted");
    }
  };

  // Request Camera Activation on a student
  const handleRequestCamera = async (student: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', student.uid), {
        'proctorStatus.requested': true,
        'proctorStatus.requestTimestamp': new Date().toISOString()
      });
      toast.success(`📹 Requested Live Camera feed on ${student.name}'s device!`);
    } catch (e: any) {
      toast.error("Failed to request camera: " + e.message);
    }
  };

  // Remote Audio Alarm
  const handleRemoteAudioTrigger = async (user: UserProfile, shouldPlay: boolean) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        remoteAudioAlarm: {
          isPlaying: shouldPlay,
          audioUrl: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
          title: shouldPlay ? "🚨 TEACHER STUDY ALERT: RETURN TO NOTES" : "ALARM_STOPPED",
          startedAt: shouldPlay ? new Date().toISOString() : null,
          triggeredBy: currentUser.name || 'Admin Subhajit Sanpui'
        }
      });
      if (shouldPlay) {
        toast.success(`🔊 Playing Remote Study Alert on ${user.name}'s device!`);
      } else {
        toast.info(`⏹️ Stopped audio alert on ${user.name}'s device.`);
      }
    } catch (e: any) {
      toast.error("Failed to trigger remote audio: " + e.message);
    }
  };

  // Dark Threat Screen Lock
  const handleToggleDarkThreatLock = async (user: UserProfile, lock: boolean) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isDarkThreatLocked: lock,
        darkThreatMessage: lock ? "LOCKED BY SMART SUBHA" : "",
        isLockedOut: lock
      });
      if (lock) {
        toast.error(`🚨 DARK THREAT LOCK ACTIVATED on ${user.name}'s screen!`);
      } else {
        toast.success(`Unlocked ${user.name}'s screen.`);
      }
    } catch (e: any) {
      toast.error("Failed to update lock: " + e.message);
    }
  };

  // Bulk Threat Screen Lock
  const handleBulkThreatLock = async (lock: boolean) => {
    const studentUsers = users.filter(u => u.role !== 'admin');
    try {
      const promises = studentUsers.map(u => 
        updateDoc(doc(db, 'users', u.uid), {
          isDarkThreatLocked: lock,
          darkThreatMessage: lock ? "LOCKED BY SMART SUBHA" : "",
          isLockedOut: lock
        })
      );
      await Promise.all(promises);
      setIsAllThreatLocked(lock);
      if (lock) {
        toast.error(`🚨 GLOBAL DARK THREAT LOCK ACTIVATED on all ${studentUsers.length} student screens!`);
      } else {
        toast.success(`Global lock removed from all student screens.`);
      }
    } catch (e: any) {
      toast.error("Bulk lock failed: " + e.message);
    }
  };

  // Filter students
  const filteredUsers = users.filter(u => {
    if (u.role === 'admin') return false;
    const feed = liveFeeds[u.uid];
    const hasCam = feed?.cameraSnapshot || u.cameraSnapshot || u.proctorStatus?.cameraEnabled;
    const hasScreen = feed?.screenSnapshot || u.screenSnapshot;

    if (filterMode === 'camera_active') return hasCam;
    if (filterMode === 'screen_active') return hasScreen;
    if (filterMode === 'tab_switched') return (u.tabSwitchCount || 0) > 0 || u.isTabFocused === false;
    if (filterMode === 'threat_locked') return u.isDarkThreatLocked;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top CCTV Surveillance Command Center Header */}
      <Card className="rounded-[2.5rem] bg-slate-950 text-white border-2 border-rose-500/40 shadow-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-black tracking-widest">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              LIVE PROCTORING & CCTV COMMAND CENTER
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Real-Time Student Camera & Live Screen Surveillance Grid
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              শিক্ষার্থী কী করছে তা সরাসরি দেখতে ফ্রন্ট ক্যামেরা ফিড এবং তাদের ডিভাইসের লাইভ স্ক্রিন (Live Screen) রিয়েল-টাইমে মনিটর করুন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={toggleAdminMic}
              className={`rounded-2xl text-xs font-black h-11 px-5 gap-2 transition-all cursor-pointer ${
                adminMicActive 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 animate-pulse' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              {adminMicActive ? <Mic size={16} /> : <MicOff size={16} />}
              <span>{adminMicActive ? 'MIC LIVE (BROADCASTING)' : 'MIC MUTED'}</span>
            </Button>

            <Button
              onClick={() => handleBulkThreatLock(!isAllThreatLocked)}
              className={`rounded-2xl text-xs font-black h-11 px-5 gap-2 transition-all cursor-pointer ${
                isAllThreatLocked 
                  ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30'
              }`}
            >
              <Lock size={16} />
              <span>{isAllThreatLocked ? 'UNLOCK ALL SCREENS' : 'ALL DARK THREAT LOCK'}</span>
            </Button>

            {onRefresh && (
              <Button
                variant="outline"
                size="icon"
                onClick={onRefresh}
                className="rounded-2xl h-11 w-11 border-slate-700 text-slate-300 hover:text-white"
                title="Refresh student list"
              >
                <RefreshCw size={16} />
              </Button>
            )}
          </div>
        </div>

        {/* Real-Time Telemetry Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Enrolled</div>
            <div className="text-2xl font-black text-white mt-0.5">{users.filter(u => u.role !== 'admin').length} Students</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60">
            <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1.5">
              <Camera size={13} />
              <span>Live Camera Feeds</span>
            </div>
            <div className="text-2xl font-black text-emerald-300 mt-0.5">
              {users.filter(u => liveFeeds[u.uid]?.cameraSnapshot || u.cameraSnapshot).length}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-800/60">
            <div className="text-[10px] uppercase font-bold text-indigo-400 flex items-center gap-1.5">
              <Monitor size={13} />
              <span>Live Screen Streams</span>
            </div>
            <div className="text-2xl font-black text-indigo-300 mt-0.5">
              {users.filter(u => liveFeeds[u.uid]?.screenSnapshot || u.screenSnapshot).length}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/60">
            <div className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1.5">
              <ShieldAlert size={13} />
              <span>Threat Locked</span>
            </div>
            <div className="text-2xl font-black text-rose-300 mt-0.5">
              {users.filter(u => u.isDarkThreatLocked).length}
            </div>
          </div>
        </div>
      </Card>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: `All Students (${users.filter(u => u.role !== 'admin').length})` },
          { id: 'camera_active', label: '📹 Live Cam Only' },
          { id: 'screen_active', label: '🖥️ Live Screen Only' },
          { id: 'tab_switched', label: '⚠️ Tab Switched' },
          { id: 'threat_locked', label: '🔒 Threat Locked' }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilterMode(f.id as any)}
            className={`px-4 py-2 rounded-2xl text-xs font-black cursor-pointer transition-all ${
              filterMode === f.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid of Student Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-900">
            <Camera size={36} className="mx-auto text-slate-400 mb-2" />
            <p className="font-bold text-sm text-slate-600 dark:text-slate-400">No active students match this filter</p>
          </div>
        ) : (
          filteredUsers.map(student => {
            const feed = liveFeeds[student.uid] || {};
            const cameraImg = feed.cameraSnapshot || student.cameraSnapshot;
            const screenImg = feed.screenSnapshot || student.screenSnapshot;
            const currentMode = cardFeedMode[student.uid] || (cameraImg ? 'camera' : 'screen');
            const isCamLive = !!cameraImg;
            const isScreenLive = !!screenImg;
            const tabSwitches = student.tabSwitchCount || 0;
            const isTabFocused = student.isTabFocused !== false;
            const isAlarmPlaying = (student as any).remoteAudioAlarm?.isPlaying;
            const isLocked = student.isDarkThreatLocked;

            return (
              <div 
                key={student.uid}
                className={`relative rounded-3xl p-5 border-2 transition-all shadow-md flex flex-col justify-between space-y-4 ${
                  isLocked 
                    ? 'bg-slate-950 border-rose-600 text-white' 
                    : !isTabFocused 
                    ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800' 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Mode Switcher Tabs (Camera vs Screen) */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCardFeedMode(prev => ({ ...prev, [student.uid]: 'camera' }))}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        currentMode === 'camera'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <Camera size={12} />
                      <span>Camera</span>
                      {isCamLive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping ml-0.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setCardFeedMode(prev => ({ ...prev, [student.uid]: 'screen' }))}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        currentMode === 'screen'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <Monitor size={12} />
                      <span>Live Screen</span>
                      {isScreenLive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping ml-0.5" />}
                    </button>
                  </div>

                  <Badge className={`text-[9px] font-mono px-2 py-0.5 ${
                    isCamLive || isScreenLive ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {isCamLive ? 'FEED LIVE' : 'STANDBY'}
                  </Badge>
                </div>

                {/* CCTV Frame Display (Live Camera or Live Screen Image) */}
                <div 
                  onClick={() => setSelectedStudent(student)}
                  className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center cursor-pointer group shadow-inner"
                >
                  {/* Digital HUD Overlay */}
                  <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      (currentMode === 'camera' ? isCamLive : isScreenLive) ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'
                    }`} />
                    <span className="text-[9px] font-mono font-black text-white/95 bg-black/70 px-1.5 py-0.5 rounded uppercase backdrop-blur-sm">
                      {currentMode === 'camera' ? (isCamLive ? 'CAM: LIVE FEED' : 'CAM: WAITING') : (isScreenLive ? 'SCREEN: LIVE' : 'SCREEN: WAITING')}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                    <span className="text-[9px] font-mono text-emerald-400 bg-black/70 px-1.5 py-0.5 rounded backdrop-blur-sm">
                      {currentMode === 'camera' && feed.cameraUpdatedAt ? 'Updated recently' : 'Auto Sync'}
                    </span>
                  </div>

                  {/* Visual Content: Live Camera Frame or Live Screen Frame */}
                  {currentMode === 'camera' && isCamLive && cameraImg ? (
                    <img 
                      src={cameraImg} 
                      alt={`${student.name}'s live camera`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : currentMode === 'screen' && isScreenLive && screenImg ? (
                    <img 
                      src={screenImg} 
                      alt={`${student.name}'s live screen`}
                      className="w-full h-full object-contain bg-slate-900 transition-transform group-hover:scale-105"
                    />
                  ) : (
                    /* Standby State with Request Action */
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-4 text-center space-y-2 bg-slate-900/90">
                      {currentMode === 'camera' ? (
                        <>
                          <Camera size={32} className="text-slate-600 animate-pulse" />
                          <span className="text-xs font-bold text-slate-400">Waiting for Camera Feed</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRequestCamera(student);
                            }}
                            className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-lg shadow-sm"
                          >
                            Ping Camera Request
                          </button>
                        </>
                      ) : (
                        <>
                          <Monitor size={32} className="text-slate-600 animate-pulse" />
                          <span className="text-xs font-bold text-slate-400">Capturing Student Screen...</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {student.currentlyReadingNote ? `Reading: ${student.currentlyReadingNote.noteTitle}` : 'Screen stream initiating'}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Hover Zoom Hint */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs backdrop-blur-[2px]">
                    <Maximize2 size={16} />
                    <span>Click for Full-Screen Inspection</span>
                  </div>
                </div>

                {/* Student Info & Telemetry */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{student.name}</span>
                        {student.isVIP && <Badge className="bg-amber-400 text-slate-950 text-[9px] font-black">VIP</Badge>}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Class {student.class || 10} • {student.school || 'Student'}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {isTabFocused ? (
                        <Badge className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 gap-1">
                          <Eye size={10} />
                          On Tab
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-600 text-white text-[9px] font-black px-2 py-0.5 gap-1 animate-pulse">
                          <EyeOff size={10} />
                          Left Tab ({tabSwitches})
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono space-y-0.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between">
                      <span>Device Battery:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {student.battery?.level || 80}% {student.battery?.isCharging ? '⚡' : '🔋'}
                      </span>
                    </div>
                    {student.currentActivity && (
                      <div className="flex justify-between truncate text-indigo-500 font-semibold">
                        <span>Activity:</span>
                        <span className="truncate max-w-[180px]">{student.currentActivity}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Control Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    size="sm"
                    onClick={() => handleRemoteAudioTrigger(student, !isAlarmPlaying)}
                    className={`rounded-xl text-[10px] font-black h-9 gap-1 cursor-pointer ${
                      isAlarmPlaying 
                        ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {isAlarmPlaying ? <VolumeX size={13} /> : <Volume2 size={13} />}
                    <span>{isAlarmPlaying ? 'STOP ALARM' : 'PLAY REMINDER'}</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleToggleDarkThreatLock(student, !isLocked)}
                    className={`rounded-xl text-[10px] font-black h-9 gap-1 cursor-pointer ${
                      isLocked 
                        ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                        : 'bg-slate-900 hover:bg-black text-white dark:bg-slate-800'
                    }`}
                  >
                    {isLocked ? <Unlock size={13} /> : <Lock size={13} />}
                    <span>{isLocked ? 'UNLOCK SCREEN' : 'THREAT LOCK'}</span>
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* High-Resolution Zoom / Split-Screen Inspection Dialog */}
      {selectedStudent && (
        <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
          <DialogContent className="max-w-5xl w-[96vw] max-h-[92vh] overflow-y-auto rounded-[2.5rem] p-6 sm:p-8 bg-slate-950 text-white border-2 border-slate-800 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-2">
                  <Camera size={22} className="text-rose-500" />
                  <span>HIGH-RES PROCTORING INSPECTION • {selectedStudent.name}</span>
                </span>
                
                <div className="flex items-center gap-2">
                  {/* View Mode Switcher in Modal */}
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setZoomModalTab('split')}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                        zoomModalTab === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Split View
                    </button>
                    <button
                      onClick={() => setZoomModalTab('camera')}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                        zoomModalTab === 'camera' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Camera Only
                    </button>
                    <button
                      onClick={() => setZoomModalTab('screen')}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                        zoomModalTab === 'screen' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Screen Only
                    </button>
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>

            {/* Main Visual Display */}
            <div className="space-y-6 pt-2">
              {zoomModalTab === 'split' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Split Tile 1: Front Camera */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-400">
                      <span className="flex items-center gap-1.5">
                        <Camera size={14} />
                        <span>STUDENT FRONT CAMERA</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {liveFeeds[selectedStudent.uid]?.cameraUpdatedAt ? 'Live Stream Active' : 'Standby'}
                      </span>
                    </div>

                    <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black border-2 border-emerald-500/40 flex items-center justify-center relative">
                      {liveFeeds[selectedStudent.uid]?.cameraSnapshot || selectedStudent.cameraSnapshot ? (
                        <img 
                          src={liveFeeds[selectedStudent.uid]?.cameraSnapshot || selectedStudent.cameraSnapshot} 
                          alt="Front camera feed"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-6 space-y-2">
                          <Camera size={48} className="mx-auto text-emerald-500/40 animate-pulse" />
                          <p className="text-xs text-slate-400">Camera feed waiting for student connection</p>
                          <Button
                            size="sm"
                            onClick={() => handleRequestCamera(selectedStudent)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
                          >
                            Send Camera Ping
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Split Tile 2: Live Screen Stream */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-indigo-400">
                      <span className="flex items-center gap-1.5">
                        <Monitor size={14} />
                        <span>STUDENT LIVE SCREEN (VIEWPORT)</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {liveFeeds[selectedStudent.uid]?.screenUpdatedAt ? 'Screen Synced' : 'Syncing'}
                      </span>
                    </div>

                    <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black border-2 border-indigo-500/40 flex items-center justify-center relative">
                      {liveFeeds[selectedStudent.uid]?.screenSnapshot || selectedStudent.screenSnapshot ? (
                        <img 
                          src={liveFeeds[selectedStudent.uid]?.screenSnapshot || selectedStudent.screenSnapshot} 
                          alt="Live screen stream"
                          className="w-full h-full object-contain bg-slate-900"
                        />
                      ) : (
                        <div className="text-center p-6 space-y-2">
                          <Monitor size={48} className="mx-auto text-indigo-500/40 animate-pulse" />
                          <p className="text-xs text-slate-400">Screen capture initializing...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : zoomModalTab === 'camera' ? (
                /* Full Camera View */
                <div className="w-full aspect-video rounded-3xl overflow-hidden bg-black border-2 border-emerald-500 flex items-center justify-center relative">
                  {liveFeeds[selectedStudent.uid]?.cameraSnapshot || selectedStudent.cameraSnapshot ? (
                    <img 
                      src={liveFeeds[selectedStudent.uid]?.cameraSnapshot || selectedStudent.cameraSnapshot} 
                      alt="Front camera full"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-8 space-y-2">
                      <Camera size={64} className="mx-auto text-emerald-500 animate-pulse" />
                      <p className="text-sm text-slate-300">Front Camera feed in standby</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Full Screen View */
                <div className="w-full aspect-video rounded-3xl overflow-hidden bg-black border-2 border-indigo-500 flex items-center justify-center relative">
                  {liveFeeds[selectedStudent.uid]?.screenSnapshot || selectedStudent.screenSnapshot ? (
                    <img 
                      src={liveFeeds[selectedStudent.uid]?.screenSnapshot || selectedStudent.screenSnapshot} 
                      alt="Screen full view"
                      className="w-full h-full object-contain bg-slate-900"
                    />
                  ) : (
                    <div className="text-center p-8 space-y-2">
                      <Monitor size={64} className="mx-auto text-indigo-500 animate-pulse" />
                      <p className="text-sm text-slate-300">Screen stream in standby</p>
                    </div>
                  )}
                </div>
              )}

              {/* Forensic Details & Remote Control Toolbar */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>{selectedStudent.name}</span>
                    <span className="text-slate-400 font-normal">({selectedStudent.email})</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Class: {selectedStudent.class || 10} • School: {selectedStudent.school || 'Student'} • Total Points: {selectedStudent.points || 0}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleRemoteAudioTrigger(selectedStudent, !(selectedStudent as any).remoteAudioAlarm?.isPlaying)}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-1"
                  >
                    <Volume2 size={14} />
                    <span>Trigger Alarm</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleToggleDarkThreatLock(selectedStudent, !selectedStudent.isDarkThreatLocked)}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1"
                  >
                    <Lock size={14} />
                    <span>{selectedStudent.isDarkThreatLocked ? 'Unlock Screen' : 'Threat Lock'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
