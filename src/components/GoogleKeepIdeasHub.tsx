import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { StudentIdea, UserProfile } from '../types';
import { 
  Lightbulb, 
  Send, 
  Sparkles, 
  Check, 
  Trash2, 
  ExternalLink, 
  Bookmark, 
  Copy,
  Clock,
  Pin
} from 'lucide-react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

interface GoogleKeepIdeasHubProps {
  currentUser: UserProfile | null;
  isAdmin: boolean;
}

const KEEP_COLORS = [
  'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900',
  'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900',
  'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900',
  'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900',
  'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
];

export const GoogleKeepIdeasHub: React.FC<GoogleKeepIdeasHubProps> = ({
  currentUser,
  isAdmin,
}) => {
  const [ideas, setIdeas] = useState<StudentIdea[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'feature' | 'notes' | 'study_tip' | 'general'>('notes');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const q = query(collection(db, 'studentIdeas'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        const list: StudentIdea[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentIdea));
        setIdeas(list);
      }, (err) => {
        console.warn("Student ideas snapshot:", err);
      });
      return unsub;
    } catch {}
  }, []);

  const handleSubmitIdea = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in both idea title and description");
      return;
    }

    setSubmitting(true);
    try {
      const color = KEEP_COLORS[Math.floor(Math.random() * KEEP_COLORS.length)];
      await addDoc(collection(db, 'studentIdeas'), {
        title: title.trim(),
        content: content.trim(),
        category,
        studentId: currentUser?.uid || 'anonymous',
        studentName: currentUser?.name || 'Student',
        studentEmail: currentUser?.email || '',
        isReviewed: false,
        color,
        createdAt: new Date().toISOString()
      });

      toast.success("Idea sent to Admin! It will now appear on the Admin Keep Dashboard.");
      setTitle('');
      setContent('');
    } catch (e: any) {
      toast.error("Failed to send idea: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkReviewed = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, 'studentIdeas', id), { isReviewed: !current });
      toast.success(current ? "Marked unreviewed" : "Idea marked as reviewed & organized!");
    } catch (e) {
      toast.error("Update failed");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'studentIdeas', id));
      toast.success("Idea deleted");
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  const unreviewedCount = ideas.filter(i => !i.isReviewed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-700 rounded-[2.5rem] text-white flex items-center justify-between gap-4 flex-wrap shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-lg">
            <Lightbulb size={26} className="text-amber-200 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-lg sm:text-xl text-white">
                Google Keep Student Ideas & Suggestions
              </h3>
              {unreviewedCount > 0 && isAdmin && (
                <Badge className="bg-red-600 text-white font-black text-[10px] uppercase border-none px-2 py-0.5 animate-pulse shadow-md">
                  ⚡ {unreviewedCount} NEW IDEAS BLINKING
                </Badge>
              )}
            </div>
            <p className="text-xs text-amber-100 font-medium mt-0.5">
              শিক্ষার্থীদের পরামর্শ, নোটসের আবদার ও আইডিয়া গুগল কিপ স্টাইলে সংগঠিত করার ড্যাশবোর্ড
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => window.open('https://keep.google.com', '_blank')}
          className="bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold gap-1.5 h-9"
        >
          <span>Open Google Keep</span>
          <ExternalLink size={13} />
        </Button>
      </div>

      {/* Idea Submission Box for Students */}
      <Card className="rounded-[2rem] border border-amber-200 dark:border-amber-900/40 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Pin size={16} className="text-amber-500" />
              <span>Suggest an Idea or Request Study Notes to Admin (পরামর্শ বা নোটের আবদার)</span>
            </h4>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Category:</span>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 outline-none"
              >
                <option value="notes">📚 Note Request (নোটের আবদার)</option>
                <option value="feature">💡 App Feature (নতুন ফিচার)</option>
                <option value="study_tip">🧠 Study Tip (পড়ার কৌশল)</option>
                <option value="general">✨ General Suggestion</option>
              </select>
            </div>
          </div>

          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Idea title (e.g. Need Class 10 Life Science Chapter 3 Diagram Notes)..."
            className="rounded-xl h-10 text-xs font-bold"
          />

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your idea or note request in detail. Admin Subhajit Sanpui will review and add it..."
            className="rounded-xl text-xs min-h-[75px]"
          />

          <div className="flex justify-end">
            <Button
              onClick={handleSubmitIdea}
              disabled={submitting}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-10 px-6 rounded-xl gap-2 shadow-md"
            >
              <Send size={14} />
              <span>Send Idea to Admin</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Keep Style Ideas Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <span>All Ideas & Suggestions ({ideas.length})</span>
          {unreviewedCount > 0 && (
            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 animate-pulse">
              <Sparkles size={13} />
              {unreviewedCount} unreviewed idea(s) blinking for Admin
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ideas.map((idea) => {
            const cardBg = idea.color || KEEP_COLORS[0];
            return (
              <Card 
                key={idea.id}
                className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${cardBg} ${
                  !idea.isReviewed && isAdmin ? 'ring-2 ring-amber-500 ring-offset-2 animate-[pulse_2s_infinite]' : ''
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Badge className="bg-black/10 dark:bg-white/10 text-slate-800 dark:text-slate-100 text-[9px] uppercase border-none">
                      {idea.category}
                    </Badge>
                    {!idea.isReviewed ? (
                      <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        NEW
                      </span>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px]">
                        Reviewed ✔
                      </Badge>
                    )}
                  </div>

                  <h5 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                    {idea.title}
                  </h5>

                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {idea.content}
                  </p>
                </div>

                <div className="mt-4 pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-500">
                  <span>By <strong>{idea.studentName}</strong></span>
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkReviewed(idea.id, !!idea.isReviewed)}
                        className="h-6 px-2 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-black/10"
                      >
                        {idea.isReviewed ? 'Uncheck' : 'Review'}
                      </Button>
                    )}
                    {isAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(idea.id)}
                        className="h-6 w-6 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={12} />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
