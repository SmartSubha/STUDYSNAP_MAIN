import React, { useState, useEffect } from 'react';
import { Note } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  Download, 
  RefreshCcw, 
  BookOpen, 
  Send, 
  FileText,
  HelpCircle,
  Zap,
  Languages
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { sanitizeFilename, triggerDownload } from '../lib/noteDownloader';

interface NoteAISummarizerDialogProps {
  note: Note | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NoteAISummarizerDialog: React.FC<NoteAISummarizerDialogProps> = ({
  note,
  isOpen,
  onOpenChange,
}) => {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [language, setLanguage] = useState<'bn' | 'en' | 'bilingual'>('bn');
  const [styleMode, setStyleMode] = useState<'quick' | 'exam' | 'detailed'>('quick');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  
  // Follow-up Q&A
  const [question, setQuestion] = useState<string>('');
  const [answering, setAnswering] = useState<boolean>(false);
  const [qaList, setQaList] = useState<{ q: string; a: string }[]>([]);

  useEffect(() => {
    if (isOpen && note && !summary) {
      handleGenerate();
    }
  }, [isOpen, note]);

  // Clean speech when closed
  useEffect(() => {
    if (!isOpen) {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    }
  }, [isOpen]);

  if (!note) return null;

  const extractNoteContent = () => {
    const parts = [
      `Title: ${note.title}`,
      `Subject: ${note.subject}`,
      note.description ? `Description: ${note.description}` : '',
      note.content ? `Content: ${note.content}` : '',
      note.htmlContent ? `HTML Content:\n${note.htmlContent.slice(0, 3000)}` : '',
    ].filter(Boolean);
    return parts.join('\n\n');
  };

  const handleGenerate = async (customLang = language, customStyle = styleMode) => {
    setLoading(true);
    try {
      const noteData = extractNoteContent();
      
      let langInstruction = '';
      if (customLang === 'bn') {
        langInstruction = 'Write primarily in natural, clear, student-friendly Bengali (বাংলা) with English academic terms in parentheses where appropriate.';
      } else if (customLang === 'en') {
        langInstruction = 'Write in clear, structured academic English with simple explanations.';
      } else {
        langInstruction = 'Provide a bilingual summary with each key concept explained in Bengali (বাংলা) alongside its English counterpart.';
      }

      let styleInstruction = '';
      if (customStyle === 'quick') {
        styleInstruction = 'Provide a high-impact, punchy summary with 3-5 bullet points and key definitions for rapid 2-minute revision.';
      } else if (customStyle === 'exam') {
        styleInstruction = 'Focus on exam readiness: 3 highest-probability exam questions with concise model answers, key formulas/dates, and common student mistakes to avoid.';
      } else {
        styleInstruction = 'Provide a comprehensive breakdown: Core concept overview, detailed stepwise explanation, real-life examples, and memory mnemonics.';
      }

      const prompt = `You are an expert tutor creating a high-yield study summary for this student note.
${langInstruction}
${styleInstruction}

STUDY NOTE CONTENT:
${noteData}

FORMAT YOUR RESPONSE EXACTLY AS FOLLOWS USING CLEAN MARKDOWN:
### 📌 এক নজরে মূল সারাংশ (Executive Summary)
[2-3 clear sentences explaining the heart of the topic]

### 🔑 গুরুত্বপূর্ণ পয়েন্ট ও সূত্রসমূহ (Key Takeaways & Formulas)
- [Bullet 1 with bold key terms]
- [Bullet 2]
- [Bullet 3]

### 🎯 পরীক্ষায় আসার মতো প্রশ্নোত্তর (High-Yield Exam Focus)
1. **প্রশ্ন**: ...
   **উত্তর**: ...
2. **প্রশ্ন**: ...
   **উত্তর**: ...

### 💡 মনে রাখার সহজ টিপস (Memory Hooks)
- [Practical memory trick or exam shortcut]`;

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          systemInstruction: 'You are StudySnap AI Educational Summarizer (© Smart Subha). You produce accurate, beautifully formatted revision notes for students.'
        })
      });

      if (!res.ok) {
        throw new Error('AI service returned an error. Please try again.');
      }

      const data = await res.json();
      if (data && data.text) {
        setSummary(data.text);
      } else {
        throw new Error('No summary generated.');
      }
    } catch (err: any) {
      console.error('Note AI Summary Error:', err);
      toast.error(err?.message || 'Failed to generate AI summary.');
      setSummary('⚠️ **সারাংশ তৈরি করতে সমস্যা হয়েছে**: অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    const q = question.trim();
    if (!q || answering) return;
    setQuestion('');
    setAnswering(true);
    try {
      const noteData = extractNoteContent();
      const prompt = `The student is studying this note:
${noteData}

Student's question: "${q}"

Answer directly, accurately, and encouragingly in Bengali/English matching the student's question language. Keep it under 150 words.`;

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          systemInstruction: 'You are StudySnap Copilot answering student doubts on specific study notes.'
        })
      });

      if (!res.ok) throw new Error('Answer generation failed');
      const data = await res.json();
      setQaList(prev => [...prev, { q, a: data.text || 'No answer available.' }]);
    } catch (e: any) {
      toast.error('Failed to get answer: ' + (e.message || 'Error'));
    } finally {
      setAnswering(false);
    }
  };

  const toggleSpeech = () => {
    if (!window.speechSynthesis) {
      toast.error('Text-to-speech is not supported in this browser');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Strip markdown formatting for cleaner speech
    const cleanText = summary
      .replace(/[#*_`~>-]/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\s+/g, ' ')
      .slice(0, 1500);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    
    // Choose appropriate voice if available
    const voices = window.speechSynthesis.getVoices();
    const bnVoice = voices.find(v => v.lang.startsWith('bn'));
    if (bnVoice && language === 'bn') {
      utterance.voice = bnVoice;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    toast.info('Reading AI Summary aloud...');
  };

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success('Summary copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSummary = () => {
    if (!summary) return;
    const filename = `${sanitizeFilename(note.title)}_AI_Summary.txt`;
    const fullText = `=====================================================
StudySnap AI Summary • © Smart Subha
Note Title: ${note.title}
Subject: ${note.subject}
Date: ${new Date().toLocaleDateString()}
=====================================================

${summary}

=====================================================
Downloaded from StudySnap Educational Platform
`;
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, filename);
    toast.success(`Saved summary: ${filename}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 rounded-[2.5rem] overflow-hidden border border-purple-200 dark:border-purple-900 shadow-2xl bg-white dark:bg-slate-900">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 text-white relative shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300">
                <Sparkles size={22} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg sm:text-xl font-black text-white leading-tight">
                    AI Note Summarizer
                  </DialogTitle>
                  <Badge className="bg-amber-400 hover:bg-amber-400 text-slate-950 font-black text-[10px] uppercase border-none px-2 py-0.5">
                    সারাংশ সহায়ক
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-purple-100 font-medium truncate max-w-md">
                  {note.subject} • {note.title}
                </DialogDescription>
              </div>
            </div>

            {/* Language & Actions */}
            <div className="flex items-center gap-1.5 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSpeech}
                disabled={!summary || loading}
                className="h-8 px-2.5 rounded-xl text-white hover:bg-white/15 text-xs font-bold gap-1"
                title={isSpeaking ? "Stop Voice" : "Listen / Read Aloud"}
              >
                {isSpeaking ? <VolumeX size={15} className="text-amber-300" /> : <Volume2 size={15} />}
                <span className="hidden sm:inline">{isSpeaking ? 'Stop' : 'Listen'}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                disabled={!summary || loading}
                className="h-8 px-2.5 rounded-xl text-white hover:bg-white/15 text-xs font-bold gap-1"
                title="Copy Summary"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadSummary}
                disabled={!summary || loading}
                className="h-8 px-2.5 rounded-xl text-white hover:bg-white/15 text-xs font-bold gap-1"
                title="Download Summary File"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Download</span>
              </Button>
            </div>
          </div>

          {/* Quick Selectors */}
          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between gap-3 flex-wrap text-xs">
            {/* Language Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-purple-200 text-[11px] font-bold flex items-center gap-1">
                <Languages size={13} />
                ভাষা:
              </span>
              <div className="bg-white/10 backdrop-blur-md p-0.5 rounded-xl flex gap-1 border border-white/10">
                <button
                  onClick={() => { setLanguage('bn'); handleGenerate('bn', styleMode); }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    language === 'bn' ? 'bg-white text-purple-900 shadow-sm' : 'text-white/80 hover:text-white'
                  }`}
                >
                  বাংলা
                </button>
                <button
                  onClick={() => { setLanguage('en'); handleGenerate('en', styleMode); }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    language === 'en' ? 'bg-white text-purple-900 shadow-sm' : 'text-white/80 hover:text-white'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => { setLanguage('bilingual'); handleGenerate('bilingual', styleMode); }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    language === 'bilingual' ? 'bg-white text-purple-900 shadow-sm' : 'text-white/80 hover:text-white'
                  }`}
                >
                  উভয় (Bilingual)
                </button>
              </div>
            </div>

            {/* Style Selector */}
            <div className="flex items-center gap-1.5">
              <div className="bg-white/10 backdrop-blur-md p-0.5 rounded-xl flex gap-1 border border-white/10">
                <button
                  onClick={() => { setStyleMode('quick'); handleGenerate(language, 'quick'); }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    styleMode === 'quick' ? 'bg-white text-purple-900 shadow-sm' : 'text-white/80 hover:text-white'
                  }`}
                >
                  ⚡ ঝটপট
                </button>
                <button
                  onClick={() => { setStyleMode('exam'); handleGenerate(language, 'exam'); }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    styleMode === 'exam' ? 'bg-white text-purple-900 shadow-sm' : 'text-white/80 hover:text-white'
                  }`}
                >
                  🎯 পরীক্ষার প্রশ্নোত্তর
                </button>
                <button
                  onClick={() => { setStyleMode('detailed'); handleGenerate(language, 'detailed'); }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    styleMode === 'detailed' ? 'bg-white text-purple-900 shadow-sm' : 'text-white/80 hover:text-white'
                  }`}
                >
                  📖 বিস্তারিত
                </button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleGenerate()}
                disabled={loading}
                className="h-7 w-7 p-0 rounded-lg text-white hover:bg-white/15"
                title="Regenerate"
              >
                <RefreshCcw size={13} className={loading ? "animate-spin" : ""} />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <ScrollArea className="flex-1 p-5 sm:p-7 overflow-y-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-3xl bg-purple-100 dark:bg-purple-950/60 border-2 border-purple-400 flex items-center justify-center text-purple-600 animate-pulse">
                  <Sparkles size={32} />
                </div>
                <div className="w-4 h-4 bg-amber-400 rounded-full absolute -top-1 -right-1 animate-ping" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-800 dark:text-slate-100">
                  AI সারাংশ প্রস্তুত হচ্ছে...
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  Gemini AI নোটের গুরুত্বপূর্ণ তথ্য ও পরীক্ষার প্রশ্নোত্তর বিশ্লেষণ করছে।
                </p>
              </div>
              <div className="flex gap-1 pt-2">
                <div className="w-2.5 h-2.5 bg-purple-600 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2.5 h-2.5 bg-purple-600 rounded-full animate-bounce [animation-delay:0.25s]" />
                <div className="w-2.5 h-2.5 bg-purple-600 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          ) : summary ? (
            <div className="space-y-6">
              {/* Summary Text Render */}
              <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed bg-purple-50/40 dark:bg-purple-950/20 p-5 sm:p-6 rounded-3xl border border-purple-100 dark:border-purple-900/40">
                <ReactMarkdown>{summary}</ReactMarkdown>
              </div>

              {/* Follow-up Q&A Section */}
              {qaList.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <HelpCircle size={14} className="text-purple-600" />
                    নোট সম্পর্কিত প্রশ্নোত্তর (Note Q&A):
                  </h4>
                  {qaList.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 space-y-1.5 text-xs">
                      <div className="font-bold text-purple-700 dark:text-purple-300">
                        ❓ {item.q}
                      </div>
                      <div className="text-slate-700 dark:text-slate-200 pl-4 border-l-2 border-purple-400 leading-relaxed">
                        <ReactMarkdown>{item.a}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <BookOpen size={40} className="mx-auto mb-2 opacity-30" />
              <p>No summary generated yet.</p>
              <Button onClick={() => handleGenerate()} className="mt-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold">
                Generate AI Summary
              </Button>
            </div>
          )}
        </ScrollArea>

        {/* Footer Q&A Input */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
            placeholder="এই নোট সম্পর্কে যেকোনো প্রশ্ন লিখুন (e.g. এই সূত্রের প্রয়োগ কী?)..."
            disabled={answering || loading}
            className="rounded-2xl h-11 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-purple-500"
          />
          <Button
            onClick={handleAskQuestion}
            disabled={answering || !question.trim()}
            className="rounded-2xl h-11 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shrink-0 gap-1.5"
          >
            {answering ? <RefreshCcw size={14} className="animate-spin" /> : <Send size={14} />}
            <span className="hidden sm:inline">Ask Note</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
