import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SurveyConfig, UserProfile, isAuthorizedAdminEmail } from '../types';
import { CheckCircle2, AlertTriangle, Sparkles, Send, ExternalLink, HelpCircle, Lock } from 'lucide-react';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

interface MandatorySurveyModalProps {
  activeSurvey: SurveyConfig | null;
  currentUser: UserProfile | null;
  isAdmin: boolean;
  onCompleted: (surveyId: string) => void;
}

export const MandatorySurveyModal: React.FC<MandatorySurveyModalProps> = ({
  activeSurvey,
  currentUser,
  isAdmin,
  onCompleted,
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [isSurveyCompleted, setIsSurveyCompleted] = useState(false);

  useEffect(() => {
    if (!activeSurvey) return;
    const deviceCache = localStorage.getItem(`device_survey_completed_${activeSurvey.id}`) === 'true';
    const userCache = currentUser ? localStorage.getItem(`survey_completed_${activeSurvey.id}_${currentUser.uid}`) === 'true' : false;
    const completedFirestore = currentUser?.completedSurveys?.includes(activeSurvey.id);

    if (deviceCache || userCache || completedFirestore) {
      setIsSurveyCompleted(true);
    } else {
      setIsSurveyCompleted(false);
    }
  }, [activeSurvey, currentUser]);

  if (isAdmin || currentUser?.role === 'admin' || isAuthorizedAdminEmail(currentUser?.email) || !activeSurvey || !activeSurvey.isActive || isSurveyCompleted) {
    return null;
  }

  const handleAnswerChange = (qId: string, val: string) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const handleSubmit = async () => {
    if (!currentUser) return;

    // Validate answers if questions exist
    if (activeSurvey.questions && activeSurvey.questions.length > 0) {
      const missing = activeSurvey.questions.filter(q => !answers[q.id]?.trim());
      if (missing.length > 0) {
        toast.error("অনুগ্রহ করে সব প্রশ্নের উত্তর দিন (Please answer all required questions)");
        return;
      }
    }

    setSubmitting(true);
    try {
      // 1. Record response in Firestore
      await addDoc(collection(db, 'surveyResponses'), {
        surveyId: activeSurvey.id,
        surveyTitle: activeSurvey.title,
        userId: currentUser.uid,
        userName: currentUser.name,
        userEmail: currentUser.email || '',
        answers,
        submittedAt: new Date().toISOString()
      });

      // 2. Mark survey as completed in user profile
      const prevCompleted = currentUser.completedSurveys || [];
      const updatedSurveys = [...new Set([...prevCompleted, activeSurvey.id])];
      await setDoc(doc(db, 'users', currentUser.uid), {
        completedSurveys: updatedSurveys
      }, { merge: true });

      // 3. Mark survey as permanently completed on this device so it NEVER appears again
      localStorage.setItem(`device_survey_completed_${activeSurvey.id}`, 'true');
      localStorage.setItem(`survey_completed_${activeSurvey.id}_${currentUser.uid}`, 'true');

      toast.success("Survey submitted successfully! Thank you for your feedback.");
      setIsSurveyCompleted(true);
      onCompleted(activeSurvey.id);
    } catch (e: any) {
      console.error("Survey submission error:", e);
      toast.error("Submission failed: " + (e?.message || "Please check connection"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-4xl h-[94vh] bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border-4 border-amber-500/80">
        {/* Header Alert Bar */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-700 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-lg">
              <Lock size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-lg sm:text-xl tracking-tight text-white">
                  MANDATORY STUDENT SURVEY
                </h3>
                <Badge className="bg-white text-rose-700 font-black text-[10px] uppercase border-none px-2 py-0.5">
                  বাধ্যতামূলক জরিপ
                </Badge>
              </div>
              <p className="text-xs text-amber-100 font-medium mt-0.5">
                {activeSurvey.title} • জরিপটি পূরণ করলেই আপনি অ্যাপের ভেতর প্রবেশ করতে পারবেন।
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-200">
            <AlertTriangle size={14} className="text-amber-300 animate-pulse" />
            <span>No Exit Allowed</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
          {activeSurvey.description && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/40 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
              💡 {activeSurvey.description}
            </div>
          )}

          {/* Embedded Google Form if provided */}
          {activeSurvey.googleFormUrl ? (
            <div className="w-full h-[62vh] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white">
              <iframe
                src={activeSurvey.googleFormUrl}
                className="w-full h-full border-none"
                title="Google Form Survey"
              >
                Loading Google Form...
              </iframe>
            </div>
          ) : activeSurvey.questions && activeSurvey.questions.length > 0 ? (
            <div className="space-y-4">
              {activeSurvey.questions.map((q, idx) => (
                <Card key={q.id || idx} className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
                  <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-2 flex items-start gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{q.question}</span>
                  </div>

                  {q.type === 'choice' && q.options && q.options.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pl-8">
                      {q.options.map((opt, oIdx) => {
                        const isSelected = answers[q.id] === opt;
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleAnswerChange(q.id, opt)}
                            className={`p-3 rounded-xl border-2 text-left text-xs sm:text-sm font-semibold transition-all ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-600 text-blue-700 dark:text-blue-300 shadow-sm'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-2 pl-8">
                      <Textarea
                        value={answers[q.id] || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="আপনার মূল্যবান মতামত বা উত্তর এখানে লিখুন..."
                        className="rounded-xl text-sm min-h-[80px]"
                      />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 size={48} className="mx-auto mb-2 text-emerald-500" />
              <p className="font-bold text-slate-700 dark:text-slate-300">
                Please complete the survey above to continue.
              </p>
            </div>
          )}
        </div>

        {/* Footer Unlock Action */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            ℹ️ জরিপ সম্পন্ন করার পর অ্যাপ স্বয়ংক্রিয়ভাবে আনলক হয়ে যাবে।
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full sm:w-auto ml-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm h-12 px-8 rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all gap-2"
          >
            {submitting ? (
              <span>যাচাই হচ্ছে...</span>
            ) : (
              <>
                <Send size={16} />
                <span>জরিপ সাবমিট করুন ও অ্যাপে প্রবেশ করুন (Submit & Enter)</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
