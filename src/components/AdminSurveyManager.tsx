import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  FileSpreadsheet, 
  Sparkles, 
  ExternalLink, 
  Copy, 
  Check, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  Layers, 
  HelpCircle,
  Eye,
  ToggleLeft,
  ToggleRight,
  Send,
  Users,
  Download,
  BarChart3
} from 'lucide-react';
import { SurveyConfig, UserProfile } from '../types';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

interface SurveyResponse {
  id: string;
  surveyId: string;
  surveyTitle: string;
  userId: string;
  userName: string;
  userEmail?: string;
  answers: Record<string, string>;
  submittedAt: string;
}

interface AdminSurveyManagerProps {
  currentUser: UserProfile | null;
  isAdmin: boolean;
}

const GOOGLE_FORMS_AI_TEMPLATES = [
  {
    id: 'tpl-madhyamik',
    title: 'Madhyamik 2025 Syllabus & Preparation Survey',
    description: 'Mandatory survey for all Class 10 students assessing syllabus coverage, weak subjects, and mock test readiness.',
    googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSe-sample-madhyamik/viewform?embedded=true',
    questions: [
      { id: 'q1', question: 'Which subject do you feel needs the most revision before exams?', type: 'choice' as const, options: ['Physical Science', 'Mathematics', 'Life Science', 'History', 'Geography', 'Bengali', 'English'] },
      { id: 'q2', question: 'How many hours daily are you dedicating to self-study?', type: 'choice' as const, options: ['Under 2 hours', '2 - 4 hours', '4 - 6 hours', '6+ hours'] },
      { id: 'q3', question: 'Have you solved previous 5 years Test Papers (ABTA / WBBSE)?', type: 'choice' as const, options: ['Completed all', 'Partially completed (50%)', 'Just started', 'Not yet started'] },
      { id: 'q4', question: 'Any specific topic or formula where you want a special live class with Subhajit Sir?', type: 'text' as const }
    ]
  },
  {
    id: 'tpl-weekly-doubts',
    title: 'Weekly Study Experience & Teacher Evaluation',
    description: 'Quick feedback to evaluate teacher notes quality, doubts resolution speed, and student engagement.',
    googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSc-sample-weekly/viewform?embedded=true',
    questions: [
      { id: 'q1', question: 'Rate the clarity and usefulness of the study notes uploaded this week:', type: 'choice' as const, options: ['⭐⭐⭐⭐⭐ Outstanding', '⭐⭐⭐⭐ Very Good', '⭐⭐⭐ Average', '⭐⭐ Needs Improvement'] },
      { id: 'q2', question: 'Are the AI Summaries and Flashcards helping you understand concepts faster?', type: 'choice' as const, options: ['Yes, significantly!', 'Sometimes helpful', 'Prefer reading full notes', 'Haven’t tried yet'] },
      { id: 'q3', question: 'What is the most difficult question you faced this week that was unresolved?', type: 'text' as const }
    ]
  },
  {
    id: 'tpl-app-feedback',
    title: 'StudySnap App Feature Suggestions & Roadmap Survey',
    description: 'Gather student votes on upcoming features like Virtual Study Rooms, Google Docs templates, and offline audio notes.',
    googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfp-sample-feedback/viewform?embedded=true',
    questions: [
      { id: 'q1', question: 'Which new Google Workspace integration are you most excited to use?', type: 'choice' as const, options: ['Google Meet Virtual Study Rooms', 'Google Drive Note Backup', 'Google Tasks for Homework', 'Google Classroom Sync', 'Google Keep Ideas'] },
      { id: 'q2', question: 'What improvements do you want in the note viewing experience on laptop/desktop?', type: 'text' as const },
      { id: 'q3', question: 'Would you join weekly evening group study sessions with fellow classmates?', type: 'choice' as const, options: ['Yes, definitely count me in!', 'Only on weekends', 'Prefer solo self-study'] }
    ]
  }
];

export const AdminSurveyManager: React.FC<AdminSurveyManagerProps> = ({
  currentUser,
  isAdmin
}) => {
  const [surveys, setSurveys] = useState<SurveyConfig[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [selectedSurveyForResponses, setSelectedSurveyForResponses] = useState<SurveyConfig | null>(null);
  const [responsesModalOpen, setResponsesModalOpen] = useState(false);

  // Form Creation State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [googleFormUrl, setGoogleFormUrl] = useState('');
  const [isMandatory, setIsMandatory] = useState(true);
  const [customQuestions, setCustomQuestions] = useState<{ id: string; question: string; type: 'text' | 'choice'; options?: string[] }[]>([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<'text' | 'choice'>('text');
  const [newQuestionOptions, setNewQuestionOptions] = useState('');

  // Real-time listener for surveys & surveyResponses
  useEffect(() => {
    try {
      const q = query(collection(db, 'surveys'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        const list: SurveyConfig[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as SurveyConfig));
        setSurveys(list);
      }, (err) => {
        console.warn("Surveys snapshot:", err);
      });
      return unsub;
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const q = query(collection(db, 'surveyResponses'), orderBy('submittedAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as SurveyResponse));
        setResponses(list);
      }, (err) => {
        console.warn("Responses snapshot:", err);
      });
      return unsub;
    } catch {}
  }, []);

  const handleExportResponses = (survey: SurveyConfig) => {
    const surveyResp = responses.filter(r => r.surveyId === survey.id);
    if (surveyResp.length === 0) {
      toast.info("No responses to export yet.");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(surveyResp, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Survey_Responses_${survey.title.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Exported ${surveyResp.length} student responses!`);
  };

  const handleApplyTemplate = (tpl: typeof GOOGLE_FORMS_AI_TEMPLATES[0]) => {
    setTitle(tpl.title);
    setDescription(tpl.description);
    setGoogleFormUrl(tpl.googleFormUrl);
    setCustomQuestions(tpl.questions);
    toast.success(`Template applied: "${tpl.title}"`);
  };

  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) return;
    const opts = newQuestionType === 'choice' 
      ? newQuestionOptions.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    setCustomQuestions(prev => [
      ...prev,
      {
        id: `q_${Date.now()}`,
        question: newQuestionText.trim(),
        type: newQuestionType,
        options: opts && opts.length > 0 ? opts : ['Yes', 'No', 'Neutral']
      }
    ]);
    setNewQuestionText('');
    setNewQuestionOptions('');
  };

  const handleRemoveQuestion = (id: string) => {
    setCustomQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleCreateSurvey = async () => {
    if (!title.trim()) {
      toast.error("Please enter a Survey Title");
      return;
    }

    try {
      // If there are other active surveys, deactivate them so only one is active at a time
      for (const s of surveys) {
        if (s.isActive) {
          await updateDoc(doc(db, 'surveys', s.id), { isActive: false });
        }
      }

      const newSurvey = {
        title: title.trim(),
        description: description.trim(),
        googleFormUrl: googleFormUrl.trim(),
        questions: customQuestions,
        isActive: true, // immediately activate so user gets full screen mandatory popup on refresh
        isMandatory: isMandatory,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'surveys'), newSurvey);

      toast.success("Survey created and ACTIVATED as Mandatory Full-Screen Popup!");
      setIsOpen(false);
      setTitle('');
      setDescription('');
      setGoogleFormUrl('');
      setCustomQuestions([]);
    } catch (err: any) {
      toast.error("Failed to create survey: " + err.message);
    }
  };

  const handleToggleSurveyStatus = async (survey: SurveyConfig) => {
    try {
      const nextStatus = !survey.isActive;
      // If activating, deactivate others
      if (nextStatus) {
        for (const s of surveys) {
          if (s.id !== survey.id && s.isActive) {
            await updateDoc(doc(db, 'surveys', s.id), { isActive: false });
          }
        }
      }
      await updateDoc(doc(db, 'surveys', survey.id), { isActive: nextStatus });
      toast.success(nextStatus ? "Survey Activated (Mandatory for all students)" : "Survey Deactivated");
    } catch (err: any) {
      toast.error("Failed to update survey: " + err.message);
    }
  };

  const handleDeleteSurvey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this survey?")) return;
    try {
      await deleteDoc(doc(db, 'surveys', id));
      toast.success("Survey deleted");
    } catch (err: any) {
      toast.error("Failed to delete survey: " + err.message);
    }
  };

  if (!isAdmin) return null;

  return (
    <>
      <Card className="rounded-[2.5rem] border-2 border-purple-200 dark:border-purple-900 bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950/30 shadow-xl overflow-hidden">
        <CardHeader className="p-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-black">
                <FileSpreadsheet size={14} className="text-purple-600" />
                ADMIN SURVEY ENGINE (GOOGLE FORMS)
              </div>
              <CardTitle className="text-xl font-black text-slate-900 dark:text-white">
                Mandatory User Surveys & Questionnaires
              </CardTitle>
              <CardDescription className="text-xs">
                Create surveys via Google Forms or Native form builder. When active, students see a mandatory full-screen modal upon entering or refreshing until completed.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsGuideOpen(true)}
                className="rounded-xl border-purple-200 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:text-purple-300 text-xs font-bold gap-1.5 h-10 px-3 cursor-pointer"
              >
                <HelpCircle size={14} />
                <span>AI Creation Guide</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setIsOpen(true)}
                className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs gap-1.5 h-10 px-4 shadow-md shadow-purple-500/20 cursor-pointer"
              >
                <Plus size={16} />
                <span>Create New Survey</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 pt-2 space-y-4">
          {/* Active Status Banner */}
          {surveys.some(s => s.isActive) ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <div>
                  <div className="text-xs font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                    Active Mandatory Survey Live
                  </div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    "{surveys.find(s => s.isActive)?.title}"
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Students refreshing or visiting the app are currently presented with this mandatory popup.
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-600 text-white text-xs font-black">
                ENFORCED
              </Badge>
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3.5 rounded-2xl flex items-center gap-3 text-xs text-amber-800 dark:text-amber-300 font-medium">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <span>No mandatory survey is currently active. Click "Create New Survey" or choose a template below to deploy one.</span>
            </div>
          )}

          {/* Existing Surveys List */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
              Survey Registry ({surveys.length})
            </h4>

            {surveys.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <FileSpreadsheet size={32} className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No surveys created yet</p>
                <p className="text-xs text-slate-400 mt-1">Use the pre-made AI templates below to launch your first survey instantly!</p>
              </div>
            ) : (
              surveys.map(s => (
                <div 
                  key={s.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900 dark:text-white">{s.title}</span>
                      {s.isActive && (
                        <Badge className="bg-emerald-500 text-white text-[10px] font-black">
                          ACTIVE POPUP
                        </Badge>
                      )}
                      {s.isMandatory && (
                        <Badge variant="outline" className="text-[10px] font-bold border-rose-300 text-rose-600">
                          Mandatory
                        </Badge>
                      )}
                    </div>
                    {s.description && (
                      <p className="text-xs text-slate-500 line-clamp-1">{s.description}</p>
                    )}
                    <div className="text-[10px] text-slate-400">
                      Created: {new Date(s.createdAt).toLocaleDateString()} • {s.questions?.length || 0} Questions
                      {s.googleFormUrl && ' • Google Form Embedded'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedSurveyForResponses(s);
                        setResponsesModalOpen(true);
                      }}
                      className="rounded-xl text-xs font-bold h-9 px-3 gap-1.5 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer shadow-xs"
                      title="View all student responses for this survey"
                    >
                      <BarChart3 size={14} />
                      <span>Responses ({responses.filter(r => r.surveyId === s.id).length})</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleSurveyStatus(s)}
                      className={`rounded-xl text-xs font-bold h-9 px-3 gap-1.5 cursor-pointer ${
                        s.isActive 
                          ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' 
                          : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {s.isActive ? <ToggleRight size={16} className="text-emerald-600" /> : <ToggleLeft size={16} />}
                      <span>{s.isActive ? 'Deactivate' : 'Set as Mandatory'}</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteSurvey(s.id)}
                      className="rounded-xl text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-9 w-9 p-0 cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Survey Modal with Templates */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-[2.5rem] p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Sparkles size={20} className="text-purple-600" />
              <span>Create Mandatory Student Survey</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              When activated, students must complete this full-screen survey upon entering or refreshing the app before accessing notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Quick Templates Picker */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-purple-600 tracking-wider flex items-center gap-1.5">
                <Layers size={14} />
                <span>1-Click AI Pre-built Templates:</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {GOOGLE_FORMS_AI_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleApplyTemplate(tpl)}
                    className="p-3 rounded-2xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 text-left hover:border-purple-500 transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-black text-purple-900 dark:text-purple-200 group-hover:text-purple-600 transition-colors line-clamp-1">
                      {tpl.title}
                    </div>
                    <div className="text-[10px] text-slate-500 line-clamp-2 mt-1">
                      {tpl.description}
                    </div>
                    <div className="mt-2 text-[10px] font-bold text-purple-600 flex items-center gap-1">
                      <span>Use Template</span>
                      <Check size={12} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 border-t pt-4 border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Survey Title *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Madhyamik 2025 Syllabus & Preparation Survey"
                  className="rounded-xl h-11 text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Description / Instructions for Students
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain why this survey is mandatory and how it helps their board exam prep..."
                  className="rounded-xl text-sm"
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Google Form Embed URL (Optional)</span>
                  <a 
                    href="https://forms.google.com" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[11px] text-purple-600 hover:underline flex items-center gap-1"
                  >
                    Create in Google Forms <ExternalLink size={10} />
                  </a>
                </label>
                <Input
                  value={googleFormUrl}
                  onChange={(e) => setGoogleFormUrl(e.target.value)}
                  placeholder="https://docs.google.com/forms/d/e/.../viewform?embedded=true"
                  className="rounded-xl h-11 text-sm font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400">
                  If provided, Google Form is embedded directly in the full-screen popup. Or use the built-in native questionnaire below.
                </p>
              </div>

              {/* Native Question Builder */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Native Questions ({customQuestions.length})
                </label>

                {customQuestions.map((q, idx) => (
                  <div key={q.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {idx + 1}. {q.question}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Type: {q.type === 'choice' ? `Multiple Choice (${q.options?.join(', ')})` : 'Long Text Answer'}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="text-rose-500 hover:bg-rose-50 h-7 w-7 p-0 shrink-0"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                ))}

                {/* Add new question box */}
                <div className="p-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2.5">
                  <div className="flex gap-2">
                    <Input
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      placeholder="Add custom question (e.g. Which chapter needs extra practice?)"
                      className="rounded-xl h-9 text-xs"
                    />
                    <select
                      value={newQuestionType}
                      onChange={(e: any) => setNewQuestionType(e.target.value)}
                      className="rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 text-xs font-bold"
                    >
                      <option value="text">Text Answer</option>
                      <option value="choice">Multiple Choice</option>
                    </select>
                  </div>

                  {newQuestionType === 'choice' && (
                    <Input
                      value={newQuestionOptions}
                      onChange={(e) => setNewQuestionOptions(e.target.value)}
                      placeholder="Comma-separated options: Yes, No, Need Help"
                      className="rounded-xl h-9 text-xs"
                    />
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddQuestion}
                    className="rounded-xl text-xs font-bold h-8 px-3 gap-1"
                  >
                    <Plus size={13} />
                    <span>Add Question</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateSurvey}
                className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs h-11 px-6 shadow-lg shadow-purple-500/20 cursor-pointer"
              >
                <Sparkles size={16} className="mr-1.5" />
                Publish & Activate as Mandatory Popup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Google Form Creation Guide Dialog */}
      <Dialog open={isGuideOpen} onOpenChange={setIsGuideOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <Sparkles size={20} />
              <span>AI-Assisted Google Form Creation Guide</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Follow these simple steps to build a high-conversion student survey in Google Forms and embed it in StudySnap.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 space-y-2">
              <h4 className="font-black text-purple-900 dark:text-purple-200 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">1</span>
                <span>Open Google Forms & Start a Blank Form</span>
              </h4>
              <p>
                Visit <a href="https://forms.google.com" target="_blank" rel="noreferrer" className="text-purple-600 font-bold underline">forms.google.com</a> and click the <strong>"+" Blank form</strong> button.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-2">
              <h4 className="font-black text-blue-900 dark:text-blue-200 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                <span>Copy Questions from Templates or AI Prompts</span>
              </h4>
              <p>
                Use short, direct questions. Make key questions <strong>Required</strong> so students cannot skip them. For board exam feedback, use multiple choice with clear options (e.g., Physical Science, Mathematics, Life Science).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 space-y-2">
              <h4 className="font-black text-emerald-900 dark:text-emerald-200 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">3</span>
                <span>Get the Embed Link</span>
              </h4>
              <p>
                In Google Forms, click the <strong>"Send"</strong> button at top right &rarr; Click the <strong>"&lt;&gt;" (Embed HTML)</strong> tab &rarr; Copy the link from <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">src="https://docs.google.com/forms/d/e/.../viewform?embedded=true"</code>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-2">
              <h4 className="font-black text-amber-900 dark:text-amber-200 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">4</span>
                <span>Paste & Activate as Mandatory</span>
              </h4>
              <p>
                Paste the URL into the "Google Form Embed URL" field in StudySnap and click "Publish". All students will instantly receive the non-dismissible full-screen popup upon page load!
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              onClick={() => setIsGuideOpen(false)}
              className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
            >
              Got it, let's create a survey
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Survey Responses Inspection Dialog */}
      {selectedSurveyForResponses && (
        <Dialog open={responsesModalOpen} onOpenChange={setResponsesModalOpen}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto rounded-[2.5rem] p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <DialogHeader className="mb-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-black">
                    <BarChart3 size={13} />
                    STUDENT SURVEY RESPONSES & ANALYTICS
                  </div>
                  <DialogTitle className="text-xl font-black mt-1 text-slate-900 dark:text-white">
                    {selectedSurveyForResponses.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Total Submissions: {responses.filter(r => r.surveyId === selectedSurveyForResponses.id).length} Students
                  </DialogDescription>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleExportResponses(selectedSurveyForResponses)}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black h-9 px-4 gap-1.5 cursor-pointer shadow-md"
                >
                  <Download size={14} />
                  <span>Export JSON</span>
                </Button>
              </div>
            </DialogHeader>

            {/* List of responses */}
            <div className="space-y-4">
              {responses.filter(r => r.surveyId === selectedSurveyForResponses.id).length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                  <Users size={36} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No responses recorded yet</p>
                  <p className="text-xs text-slate-400 mt-1">When students complete this mandatory survey, their detailed answers will appear here in real-time.</p>
                </div>
              ) : (
                responses
                  .filter(r => r.surveyId === selectedSurveyForResponses.id)
                  .map((resp, i) => (
                    <div 
                      key={resp.id || i}
                      className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b pb-2 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-black">
                            {resp.userName?.slice(0, 1).toUpperCase() || 'S'}
                          </span>
                          <div>
                            <div className="font-black text-sm text-slate-900 dark:text-white">
                              {resp.userName}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {resp.userEmail || 'Student'} • {new Date(resp.submittedAt).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <Badge className="bg-emerald-600 text-white text-[10px] font-mono">
                          Completed ✓
                        </Badge>
                      </div>

                      {/* Answers Grid */}
                      <div className="space-y-2 pt-1">
                        {selectedSurveyForResponses.questions?.map((q, qIdx) => {
                          const ans = resp.answers?.[q.id] || resp.answers?.[qIdx] || 'No answer provided';
                          return (
                            <div key={q.id} className="text-xs space-y-0.5">
                              <div className="font-bold text-slate-600 dark:text-slate-400">
                                Q{qIdx + 1}: {q.question}
                              </div>
                              <div className="font-black text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                                {ans}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
