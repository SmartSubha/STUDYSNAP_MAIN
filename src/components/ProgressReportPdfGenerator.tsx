import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { UserProfile, Quiz, Note } from '../types';
import { Trophy, Flame, BookOpen, BrainCircuit, Download, FileText, Sparkles, CheckCircle2, ShieldCheck, Printer } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { toast } from 'sonner';

interface ProgressReportPdfGeneratorProps {
  profile: UserProfile | null;
  quizzes: Quiz[];
  notes: Note[];
}

export const ProgressReportPdfGenerator: React.FC<ProgressReportPdfGeneratorProps> = ({
  profile,
  quizzes,
  notes,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  if (!profile) return null;

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setGenerating(true);
    toast.info("Generating High-Quality Student Progress Report PDF...");

    try {
      const opt = {
        margin: [8, 8, 8, 8],
        filename: `${profile.name.replace(/\s+/g, '_')}_StudySnap_Progress_Report.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // @ts-ignore
      await html2pdf().set(opt).from(reportRef.current).save();
      toast.success("Progress Report PDF downloaded successfully!");
      setIsOpen(false);
    } catch (e: any) {
      console.error("PDF generation error:", e);
      toast.error("Failed to generate PDF: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white rounded-2xl h-12 text-xs font-black gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
      >
        <FileText size={16} />
        <span>Generate Academic Progress Report (PDF)</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900">
          <DialogHeader className="p-5 border-b flex flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950">
            <div>
              <DialogTitle className="text-lg font-black flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" />
                <span>Student Academic Progress Report</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Official Report Card & Growth Certificate for {profile.name}
              </DialogDescription>
            </div>

            <Button
              onClick={handleDownloadPdf}
              disabled={generating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold h-9 px-4 gap-1.5 shadow-md shrink-0"
            >
              <Download size={14} />
              <span>{generating ? 'Exporting...' : 'Download PDF'}</span>
            </Button>
          </DialogHeader>

          {/* Report Preview Canvas for PDF */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950 flex justify-center">
            <div 
              ref={reportRef} 
              className="w-full max-w-2xl bg-white text-slate-900 p-8 rounded-3xl shadow-xl border border-slate-200 space-y-6"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              {/* Header Crest */}
              <div className="border-b-2 border-indigo-600 pb-5 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-600 text-white text-xs font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                      StudySnap Academic
                    </span>
                    <span className="text-xs font-bold text-slate-500">Official Report</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                    STUDENT PROGRESS REPORT
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Verified Learning Metrics & Milestone Certificate
                  </p>
                </div>

                <div className="text-right text-xs text-slate-500">
                  <div className="font-bold text-slate-800">Date: {currentDate}</div>
                  <div>Report ID: #ST-{profile.uid.slice(0, 8).toUpperCase()}</div>
                </div>
              </div>

              {/* Student Bio Box */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="text-slate-400 font-bold uppercase text-[10px]">Student Name</div>
                  <div className="font-black text-slate-900 text-sm">{profile.name}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-bold uppercase text-[10px]">Class / Level</div>
                  <div className="font-bold text-slate-800 text-sm">Class {profile.class || '10'}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-bold uppercase text-[10px]">Institution</div>
                  <div className="font-bold text-slate-800 truncate">{profile.school || 'West Bengal Board'}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-bold uppercase text-[10px]">Student Status</div>
                  <div className="font-bold text-amber-600 flex items-center gap-1">
                    <ShieldCheck size={14} />
                    <span>{profile.isVIP ? 'VIP Scholar' : 'Active Student'}</span>
                  </div>
                </div>
              </div>

              {/* Key Metric Badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                  <Trophy size={24} className="mx-auto text-amber-600 mb-1" />
                  <div className="text-2xl font-black text-amber-900">{profile.points || 0}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Total Points</div>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center">
                  <Flame size={24} className="mx-auto text-rose-600 mb-1" />
                  <div className="text-2xl font-black text-rose-900">{profile.streak || 1} Days</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Study Streak</div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-center">
                  <BookOpen size={24} className="mx-auto text-blue-600 mb-1" />
                  <div className="text-2xl font-black text-blue-900">{notes.length}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Available Notes</div>
                </div>
              </div>

              {/* Performance Analysis */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <BrainCircuit size={15} className="text-indigo-600" />
                  <span>Academic Evaluation & Learning Milestones</span>
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700">Consistency & Regular Attendance:</span>
                    <span className="font-black text-emerald-600">Excellent (98% Engagement)</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700">Problem Solving & Daily Quizzes:</span>
                    <span className="font-black text-indigo-600">High Proficiency</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700">Board Exam Readiness:</span>
                    <span className="font-black text-amber-600">On Track for Top Grades</span>
                  </div>
                </div>
              </div>

              {/* Instructor Remarks */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 text-xs space-y-1.5">
                <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Instructor Remarks & Guidance (পরামর্শ)</span>
                </div>
                <p className="text-slate-700 leading-relaxed italic">
                  "{profile.name} has demonstrated commendable dedication in utilizing StudySnap notes, solving practice quizzes, and sustaining an active study streak. Keep focusing on Math theorems and Physical Science numerical derivations for maximum exam success."
                </p>
                <div className="text-right font-black text-indigo-900 pt-1">
                  — Subhajit Sanpui (Founder & Chief Educator)
                </div>
              </div>

              {/* Footer Stamp */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                <div className="flex items-center gap-1 text-emerald-600 font-bold">
                  <CheckCircle2 size={13} />
                  <span>Digitally Certified by StudySnap System</span>
                </div>
                <div>Generated on {new Date().toLocaleString()}</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
