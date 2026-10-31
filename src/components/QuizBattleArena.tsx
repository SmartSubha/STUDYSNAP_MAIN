import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Swords, 
  Flame, 
  LogOut, 
  ArrowLeft,
  Crown,
  Trophy,
  Zap,
  AlertCircle
} from 'lucide-react';
import { Quiz, UserProfile } from '../types';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, limit } from 'firebase/firestore';
import { toast } from 'sonner';

interface QuizBattleArenaProps {
  currentUser: UserProfile | null;
  quizzes: Quiz[];
  users: UserProfile[];
  onExitBattle?: () => void;
}

interface BattleMatch {
  id: string;
  creatorId: string;
  creatorName: string;
  opponentId?: string;
  opponentName?: string;
  subject: string;
  status: 'waiting' | 'active' | 'completed';
  creatorScore: number;
  opponentScore: number;
  currentQuestionIndex: number;
  createdAt: string;
}

export const QuizBattleArena: React.FC<QuizBattleArenaProps> = ({
  currentUser,
  quizzes,
  users,
  onExitBattle
}) => {
  const [battles, setBattles] = useState<BattleMatch[]>([]);
  const [activeBattle, setActiveBattle] = useState<BattleMatch | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('Physical Science');
  const [isCreatingBattle, setIsCreatingBattle] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);

  // Listen to live battles
  useEffect(() => {
    try {
      const q = query(collection(db, 'quizBattles'), orderBy('createdAt', 'desc'), limit(20));
      const unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as BattleMatch));
        setBattles(list);

        // Sync active battle if current user is participating
        if (currentUser) {
          const myBattle = list.find(b => 
            (b.creatorId === currentUser.uid || b.opponentId === currentUser.uid) && 
            (b.status === 'active' || b.status === 'waiting')
          );
          if (myBattle) {
            setActiveBattle(myBattle);
          } else {
            setActiveBattle(null);
          }
        }
      });
      return unsub;
    } catch (e) {
      console.warn("Quiz battles listener error:", e);
    }
  }, [currentUser?.uid]);

  // Handle Exit Battle / Forfeit Match
  const handleExitMatch = async () => {
    if (activeBattle) {
      try {
        await updateDoc(doc(db, 'quizBattles', activeBattle.id), {
          status: 'completed',
          endedReason: 'User exited battle match'
        });
      } catch (e) {}
      setActiveBattle(null);
      toast.info("🚪 You exited the 1v1 battle match.");
    }
    if (onExitBattle) {
      onExitBattle();
    }
  };

  // Handle Create Battle
  const handleCreateChallenge = async () => {
    if (!currentUser) return;
    setIsCreatingBattle(true);
    try {
      const battleRef = await addDoc(collection(db, 'quizBattles'), {
        creatorId: currentUser.uid,
        creatorName: currentUser.name,
        subject: selectedSubject,
        status: 'waiting',
        creatorScore: 0,
        opponentScore: 0,
        currentQuestionIndex: 0,
        createdAt: new Date().toISOString()
      });
      toast.success("⚔️ 1v1 Battle Challenge Room Created! Waiting for an opponent to join...");
    } catch (e: any) {
      toast.error("Failed to create battle: " + e.message);
    } finally {
      setIsCreatingBattle(false);
    }
  };

  // Join Existing Challenge
  const handleJoinBattle = async (battle: BattleMatch) => {
    if (!currentUser) return;
    if (battle.creatorId === currentUser.uid) {
      toast.info("You already created this battle! Waiting for an opponent.");
      return;
    }
    try {
      await updateDoc(doc(db, 'quizBattles', battle.id), {
        opponentId: currentUser.uid,
        opponentName: currentUser.name,
        status: 'active'
      });
      toast.success(`⚔️ Battle Started against ${battle.creatorName}! May the best scholar win!`);
    } catch (e: any) {
      toast.error("Failed to join battle: " + e.message);
    }
  };

  // Answer question in battle
  const handleAnswerQuestion = async (optionIndex: number) => {
    if (!activeBattle || !currentUser || isAnswerSubmitted) return;
    setSelectedAnswer(optionIndex);
    setIsAnswerSubmitted(true);

    const isCreator = activeBattle.creatorId === currentUser.uid;
    const currentQ = quizzes[currentQIndex % quizzes.length];
    const isCorrect = currentQ && optionIndex === currentQ.correctAnswer;

    if (isCorrect) {
      toast.success("🎯 Correct Answer! +10 Points in Battle!");
    } else {
      toast.error("❌ Incorrect Answer!");
    }

    try {
      const updatePayload = isCreator 
        ? { creatorScore: (activeBattle.creatorScore || 0) + (isCorrect ? 10 : 0) }
        : { opponentScore: (activeBattle.opponentScore || 0) + (isCorrect ? 10 : 0) };

      await updateDoc(doc(db, 'quizBattles', activeBattle.id), updatePayload);

      setTimeout(() => {
        setIsAnswerSubmitted(false);
        setSelectedAnswer(null);
        setCurrentQIndex(prev => prev + 1);
      }, 1500);
    } catch (e) {}
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner with Exit Battle Action */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-amber-600 via-rose-600 to-indigo-950 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black tracking-widest backdrop-blur-md">
                <Swords size={14} className="text-amber-300" />
                1V1 LIVE MADHYAMIK QUIZ BATTLE ARENA
              </div>
              
              {/* Top Exit Battle Option */}
              {onExitBattle && (
                <button
                  type="button"
                  onClick={handleExitMatch}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/30 hover:bg-rose-500/50 text-white text-xs font-black tracking-wide border border-rose-300/30 cursor-pointer transition-all"
                >
                  <LogOut size={13} />
                  <span>Exit Battle Arena</span>
                </button>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Challenge Classmates in Real-Time 1v1 Battles
            </h2>
            <p className="text-xs text-white/80 max-w-xl leading-relaxed">
              আপনার সহপাঠীকে সরাসরি চ্যালেঞ্জ করুন! দ্রুত সঠিক উত্তর দিয়ে লিডারবোর্ডের শীর্ষে উঠুন এবং রিওয়ার্ড পয়েন্ট অর্জন করুন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="bg-black/30 text-white border border-white/20 rounded-2xl px-4 h-12 text-xs font-black outline-none cursor-pointer"
            >
              <option value="Physical Science" className="text-black">ভৌতবিজ্ঞান (Physical Science)</option>
              <option value="Mathematics" className="text-black">গণিত (Mathematics)</option>
              <option value="Life Science" className="text-black">জীবনবিজ্ঞান (Life Science)</option>
              <option value="History" className="text-black">ইতিহাস (History)</option>
              <option value="Geography" className="text-black">ভূগোল (Geography)</option>
            </select>

            <Button
              onClick={handleCreateChallenge}
              disabled={isCreatingBattle}
              className="bg-white text-rose-600 hover:bg-slate-100 rounded-2xl text-xs font-black h-12 px-6 gap-2 shadow-lg cursor-pointer"
            >
              <Swords size={16} />
              <span>Create Challenge</span>
            </Button>

            {onExitBattle && (
              <Button
                variant="outline"
                onClick={handleExitMatch}
                className="bg-black/40 hover:bg-black/60 border-white/30 text-white rounded-2xl text-xs font-black h-12 px-5 gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Exit Arena</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Active Battle Arena if participating */}
      {activeBattle && activeBattle.status === 'active' && (
        <Card className="rounded-[2.5rem] border-2 border-amber-400 bg-white dark:bg-slate-900 shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in">
          {/* Header with Exit Battle Option */}
          <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-black">
                {activeBattle.creatorName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white">{activeBattle.creatorName}</h4>
                <div className="text-xs font-black text-amber-600">Score: {activeBattle.creatorScore} pts</div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <Badge className="bg-rose-600 text-white font-black text-xs px-3 py-1 animate-pulse">
                ⚔️ VS ⚔️
              </Badge>
              <span className="text-[10px] text-slate-400 font-mono mt-1">{activeBattle.subject}</span>
            </div>

            <div className="flex items-center gap-3 text-right">
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white">{activeBattle.opponentName || 'Opponent'}</h4>
                <div className="text-xs font-black text-indigo-600">Score: {activeBattle.opponentScore} pts</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-600 flex items-center justify-center font-black">
                {(activeBattle.opponentName || 'OP').slice(0, 2).toUpperCase()}
              </div>
            </div>

            {/* Prominent Exit Battle Button */}
            <div className="w-full sm:w-auto flex justify-end pt-2 sm:pt-0">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleExitMatch}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black px-4 h-9 gap-1.5 cursor-pointer shadow-md"
              >
                <LogOut size={14} />
                <span>Exit Battle (Forfeit)</span>
              </Button>
            </div>
          </div>

          {/* Question Display */}
          {quizzes.length > 0 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] font-black uppercase text-slate-400">
                  Battle Question #{((currentQIndex) % quizzes.length) + 1}
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
                  {quizzes[currentQIndex % quizzes.length]?.question}
                </h3>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quizzes[currentQIndex % quizzes.length]?.options.map((opt, idx) => (
                  <button
                    key={idx}
                    disabled={isAnswerSubmitted}
                    onClick={() => handleAnswerQuestion(idx)}
                    className={`p-4 rounded-2xl border text-left text-xs font-bold transition-all cursor-pointer ${
                      selectedAnswer === idx
                        ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span className="font-black mr-2 opacity-60">[{String.fromCharCode(65 + idx)}]</span>
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Live Open Challenges List */}
      <div className="space-y-4">
        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Flame size={18} className="text-rose-500" />
          <span>Live 1v1 Open Battle Rooms</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {battles.filter(b => b.status === 'waiting').length === 0 ? (
            <div className="col-span-full p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs font-bold">
              No active challenges right now. Click "Create Challenge" above to invite a classmate!
            </div>
          ) : (
            battles.filter(b => b.status === 'waiting').map(battle => (
              <div 
                key={battle.id}
                className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white">{battle.creatorName}</h4>
                    <span className="text-[10px] text-slate-400">Subject: {battle.subject}</span>
                  </div>
                  <Badge className="bg-amber-500 text-slate-950 font-black text-[9px]">WAITING</Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleJoinBattle(battle)}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black h-10 gap-1.5 cursor-pointer shadow-md"
                  >
                    <Swords size={14} />
                    <span>Accept 1v1 Challenge</span>
                  </Button>

                  {battle.creatorId === currentUser?.uid && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExitMatch}
                      className="border-slate-300 dark:border-slate-700 text-rose-600 hover:text-rose-700 h-10 text-xs font-bold rounded-xl"
                      title="Cancel waiting room"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
