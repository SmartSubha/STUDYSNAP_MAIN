import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Compass, 
  CheckCircle2, 
  BookOpen, 
  Sparkles, 
  Clock, 
  Calendar, 
  ArrowRight, 
  Award, 
  Flame, 
  TrendingUp, 
  Filter, 
  Eye, 
  FileText,
  Check
} from 'lucide-react';
import { UserProfile, Note } from '../types';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import confetti from 'canvas-confetti';

interface LearningRoadmapProps {
  currentUser: UserProfile | null;
  notes: Note[];
  onOpenNote?: (note: Note) => void;
  onAddPoints?: (pts: number) => void;
}

export const LearningRoadmap: React.FC<LearningRoadmapProps> = ({
  currentUser,
  notes,
  onOpenNote,
  onAddPoints
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [userProfileData, setUserProfileData] = useState<UserProfile | null>(currentUser);

  // Real-time listener for current user's read history
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserProfileData(docSnap.data() as UserProfile);
      }
    });
    return unsub;
  }, [currentUser?.uid]);

  const readHistory = userProfileData?.readNotesHistory || [];

  // Match read history with full note objects if available, or create display objects
  const readNotesList = readHistory.map((item) => {
    const fullNote = notes.find(n => n.id === item.noteId);
    return {
      noteId: item.noteId,
      title: item.noteTitle || fullNote?.title || 'Study Note',
      subject: item.subject || fullNote?.subject || 'General',
      viewedAt: item.viewedAt,
      timeSpentSeconds: item.timeSpentSeconds || 60,
      fullNote: fullNote || null,
      type: fullNote?.type || 'text'
    };
  });

  const subjectsList = ['All', 'Physical Science', 'Math', 'Life Science', 'History', 'Geography', 'Bengali', 'English'];

  const filteredNotes = selectedSubject === 'All'
    ? readNotesList
    : readNotesList.filter(n => n.subject.toLowerCase() === selectedSubject.toLowerCase() || (n.subject === 'Phy Sci' && selectedSubject === 'Physical Science'));

  // Calculate subject progress statistics
  const totalNotesAvailable = notes.length || 1;
  const totalReadCount = readNotesList.length;
  const overallPercentage = Math.min(100, Math.round((totalReadCount / Math.max(1, totalNotesAvailable)) * 100));

  const formatViewedDate = (isoStr: string) => {
    if (!isoStr) return 'Recently';
    const date = new Date(isoStr);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Roadmap Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-black tracking-wider uppercase backdrop-blur-md">
              <Compass size={14} className="text-amber-400" />
              <span>Personalized Study Path (পঠিত নোটের রোডম্যাপ)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>My Completed Notes Roadmap</span>
              <Sparkles size={24} className="text-amber-400" />
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
              এখানে কেবলমাত্র আপনি যেসব নোট পড়েছেন এবং সম্পন্ন করেছেন সেগুলো বিষয়ভিত্তিক রোডম্যাপে প্রদর্শিত হচ্ছে।
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Notes Read</div>
              <div className="text-2xl font-black text-amber-300">{totalReadCount}</div>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Curriculum Coverage</div>
              <div className="text-2xl font-black text-emerald-300">{overallPercentage}%</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 space-y-1.5 relative z-10">
          <div className="flex justify-between text-xs font-bold text-blue-200">
            <span>Overall Note Reading Progress</span>
            <span>{totalReadCount} / {notes.length} Notes Completed</span>
          </div>
          <Progress value={overallPercentage} className="h-2.5 bg-blue-950/60" />
        </div>

        {/* Ambient Glows */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Subject Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {subjectsList.map((subj) => {
          const countInSubject = subj === 'All' 
            ? readNotesList.length 
            : readNotesList.filter(n => n.subject.toLowerCase() === subj.toLowerCase() || (n.subject === 'Phy Sci' && subj === 'Physical Science')).length;

          const isSelected = selectedSubject === subj;

          return (
            <button
              key={subj}
              onClick={() => setSelectedSubject(subj)}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-sm ${
                isSelected 
                  ? 'bg-blue-600 text-white shadow-blue-500/20' 
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              <span>{subj}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                {countInSubject}
              </span>
            </button>
          );
        })}
      </div>

      {/* Read Notes Timeline Cards */}
      <div className="space-y-4">
        {filteredNotes.length === 0 ? (
          <Card className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center shadow-lg">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-4 shadow-inner">
              <BookOpen size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {selectedSubject === 'All' ? 'No Notes Read Yet' : `No Notes Read in ${selectedSubject}`}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
              আপনি হোম ড্যাশবোর্ডে গিয়ে নোট পড়া শুরু করলেই এখানে স্বয়ংক্রিয়ভাবে আপনার পঠিত নোটের তালিকা ও রোডম্যাপ তৈরি হয়ে যাবে!
            </p>
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => (window as any).setMainTab?.('home')}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black h-10 px-5 gap-1.5 cursor-pointer shadow-md"
              >
                <BookOpen size={14} />
                <span>Go to Notes Library</span>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNotes.map((item, index) => (
              <Card 
                key={`${item.noteId}-${index}`}
                className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md hover:shadow-lg transition-all p-5 flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold text-[10px] gap-1">
                      <CheckCircle2 size={11} />
                      Completed & Studied
                    </Badge>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Calendar size={11} />
                      {formatViewedDate(item.viewedAt)}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1.5 text-xs">
                      <span className="font-bold text-blue-600 dark:text-blue-400 uppercase text-[10px] tracking-wider">
                        {item.subject}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Format: {item.type.toUpperCase()}
                      </span>
                      {item.timeSpentSeconds && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-0.5">
                            <Clock size={10} />
                            {item.timeSpentSeconds > 60 ? `${Math.round(item.timeSpentSeconds / 60)}m` : `${item.timeSpentSeconds}s`} study time
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                    <Award size={12} />
                    Verified on Roadmap
                  </span>

                  {item.fullNote && onOpenNote && (
                    <Button
                      size="sm"
                      onClick={() => {
                        onOpenNote(item.fullNote!);
                        confetti({ particleCount: 30, spread: 40 });
                      }}
                      className="bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-600 dark:text-blue-300 rounded-xl text-xs font-black h-8 px-3 gap-1 cursor-pointer"
                    >
                      <Eye size={12} />
                      <span>Re-read Note</span>
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
