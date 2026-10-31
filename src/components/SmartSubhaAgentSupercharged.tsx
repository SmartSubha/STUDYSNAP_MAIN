import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Copy, 
  Check, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Download, 
  BookOpen, 
  HelpCircle, 
  Calendar, 
  BrainCircuit, 
  FileText,
  Lightbulb,
  Languages
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  mode?: string;
  subject?: string;
}

type AgentMode = 'doubt' | 'quiz' | 'planner' | 'concept' | 'language';

const MODE_CONFIGS: Record<AgentMode, { label: string; icon: any; promptNote: string }> = {
  doubt: {
    label: '💡 Doubt Solver (সমাধান)',
    icon: Lightbulb,
    promptNote: 'Provide step-by-step educational explanations, formulas, and verified solutions.'
  },
  quiz: {
    label: '📝 Practice Quiz (কুইজ)',
    icon: BrainCircuit,
    promptNote: 'Generate 3 high-yield multiple-choice or short practice questions with answers and explanations.'
  },
  planner: {
    label: '🗓️ Study Routine (রুটিন)',
    icon: Calendar,
    promptNote: 'Act as an academic coach providing optimized daily study timetables, break schedules, and exam revision strategies.'
  },
  concept: {
    label: '🧠 Concept & Memory (ট্রিকস)',
    icon: Sparkles,
    promptNote: 'Explain the core concept with visual analogies, mnemonics, and memory hooks for quick retention.'
  },
  language: {
    label: '🌐 Language & Grammar (ভাষা)',
    icon: Languages,
    promptNote: 'Specialist in English grammar, Bengali grammar (কারক, সমাস, প্রত্যয়), translation, and essay outlines.'
  }
};

const SUBJECT_TAGS = ['All', 'Math', 'Phy Sci', 'Life Sci', 'Bengali', 'English', 'History', 'Geography'];
const CLASS_LEVELS = ['General', 'Class 8', 'Class 9', 'Class 10 (Madhyamik)', 'Class 11', 'Class 12 (HS)', 'College'];

export const SmartSubhaAgentSupercharged: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: `### 🤖 Welcome to © Smart Subha AI Educational Copilot!
I am your advanced AI study companion, built by founder **Subhajit Sanpui** to help you ace your exams!

**What I can do for you:**
- 💡 **Doubt Solver**: Step-by-step solutions for Math, Science, and Humanities
- 📝 **Instant Practice**: Generate quizzes, board exam-style questions & tests
- 🗓️ **Smart Routine**: Personalized study timetables & revision strategies
- 🧠 **Memory Hooks**: Formulas, mnemonics & shortcuts in বাংলা & English
- 🎙️ **Voice Enabled**: Speak your questions or listen to answers!

*Select a mode below or ask your doubt right away!*`,
      timestamp: new Date()
    }
  ]);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  
  // Customization states
  const [selectedMode, setSelectedMode] = useState<AgentMode>('doubt');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedClass, setSelectedClass] = useState<string>('Class 10 (Madhyamik)');
  
  // Voice input
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, isMinimized]);

  // Clean speech on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // Initialize Speech Recognition
  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser. Please type your query.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'bn-IN'; // Bengali (India) or en-IN

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("Listening... Speak your question now (বাংলা বা English)");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
          toast.success("Voice captured!");
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          toast.error("Could not capture audio. Please try typing.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech init error:", err);
      setIsListening(false);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const userMsg = (textToSend || input).trim();
    if (!userMsg || loading) return;

    setInput('');
    const newMsg: Message = {
      role: 'user',
      content: userMsg,
      timestamp: new Date(),
      mode: selectedMode,
      subject: selectedSubject
    };

    const newHistory = [...messages, newMsg];
    setMessages(newHistory);
    setLoading(true);

    try {
      const historyToSend: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
      const firstUserIdx = newHistory.findIndex(m => m.role === 'user');
      const validHistory = firstUserIdx !== -1 ? newHistory.slice(firstUserIdx) : [];

      for (const m of validHistory.slice(-8)) {
        if (!m.content?.trim()) continue;
        const last = historyToSend[historyToSend.length - 1];
        if (last && last.role === m.role) {
          last.parts[0].text += `\n\n${m.content}`;
        } else {
          historyToSend.push({
            role: m.role,
            parts: [{ text: m.content }]
          });
        }
      }

      if (historyToSend.length === 0 || historyToSend[0].role !== 'user') {
        historyToSend.length = 0;
        historyToSend.push({ role: 'user', parts: [{ text: userMsg }] });
      }

      const modeInstruction = MODE_CONFIGS[selectedMode].promptNote;
      const systemInstruction = `You are the official Smart Subha AI Agent (© Smart Subha) for StudySnap students, created by founder Subhajit Sanpui.
TARGET AUDIENCE: ${selectedClass} students studying ${selectedSubject}.
CURRENT MODE: ${MODE_CONFIGS[selectedMode].label}.
MODE DIRECTIVE: ${modeInstruction}

CRITICAL PEDAGOGICAL GUIDELINES:
1. Provide extremely clear, step-by-step, accurate, and encouraging educational guidance.
2. Seamlessly understand and respond in English, Bengali (বাংলা), or bilingual (Banglish). If the student writes in Bengali, reply primarily in clear Bengali with key English terms in brackets.
3. For Math & Physical Science: State the formula clearly first, provide step-by-step calculation, and underline/highlight the final answer.
4. For Life Science: Use bullet points, function lists, and clear distinctions (e.g. DNA vs RNA).
5. Format with rich Markdown: headings (###), bold terms, bullet points, and code/math blocks.
6. Embody founder Subhajit Sanpui's motivating, supportive, and empowering spirit for every student.`;

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: historyToSend,
          systemInstruction
        })
      });

      if (!res.ok) {
        throw new Error('AI Agent server is currently busy. Please try again.');
      }

      const data = await res.json();
      const replyText = data && data.text ? data.text : 'Could not generate a response. Please try again.';
      
      setMessages(prev => [...prev, {
        role: 'model',
        content: replyText,
        timestamp: new Date(),
        mode: selectedMode,
        subject: selectedSubject
      }]);
    } catch (e: any) {
      console.error("Smart Subha Agent Error:", e);
      const errMsg = e.message || "Failed to reach AI Agent";
      setMessages(prev => [...prev, {
        role: 'model',
        content: `⚠️ **Agent Notice**: ${errMsg}\n\nPlease try asking your question again in a moment.`,
        timestamp: new Date()
      }]);
      toast.error(`Agent error: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const speakMessage = (content: string, index: number) => {
    if (!window.speechSynthesis) {
      toast.error("Text-to-speech is not supported in this browser.");
      return;
    }

    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = content
      .replace(/[#*_`~>-]/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\s+/g, ' ')
      .slice(0, 1500);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const bnVoice = voices.find(v => v.lang.startsWith('bn'));
    if (bnVoice) utterance.voice = bnVoice;

    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);

    window.speechSynthesis.speak(utterance);
    setSpeakingIndex(index);
    toast.info("Reading response aloud...");
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const clearChat = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setMessages([
      {
        role: 'model',
        content: `### 🤖 Conversation Reset\nChat cleared. How can **© Smart Subha AI Copilot** assist your studies right now?`,
        timestamp: new Date()
      }
    ]);
    toast.info("Conversation reset");
  };

  const downloadConversation = () => {
    const text = messages.map(m => {
      const sender = m.role === 'user' ? 'YOU (Student)' : '© SMART SUBHA AI COPILOT';
      return `[${m.timestamp.toLocaleTimeString()}] ${sender}:\n${m.content}\n\n-------------------------\n`;
    }).join('\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StudySnap_AI_Notes_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Study notes saved as text file!");
  };

  const currentQuickPrompts = [
    `📐 Solve a Class 10 Math problem with formula`,
    `⚡ Newton's 3 Laws of Motion explained simply in Bengali`,
    `🌿 Photosynthesis & Respiration difference (সালোকসংশ্লেষ ও শ্বসন)`,
    `🎯 5 High-Yield Madhyamik exam revision points`,
    `📝 Bengali Grammar: কারক ও বিভক্তি নির্ণয় করার শর্টকাট কৌশল`,
    `📚 English Grammar: Transformation of Sentences tricks`
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto rounded-[2.5rem] bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/40 shadow-2xl overflow-hidden mb-6 transition-all">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-950 text-white flex items-center justify-between gap-3 relative overflow-hidden">
        <div className="flex items-center gap-3 relative z-10">
          <div className="relative">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-inner">
              <Bot size={26} />
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-blue-950 rounded-full animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-base sm:text-lg tracking-tight text-white flex items-center gap-1.5">
                Smart Subha AI Agent
              </h3>
              <Badge className="bg-amber-400 hover:bg-amber-400 text-navy-950 text-[10px] font-black border-none px-2 py-0.5 shadow-sm">
                SUPERCHARGED COPILOT
              </Badge>
            </div>
            <p className="text-[11px] text-blue-100/90 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              24/7 Educational Copilot • Doubt Solver • Bangla & English
            </p>
          </div>
        </div>

        {/* Top Control Actions */}
        <div className="flex items-center gap-1.5 relative z-10">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={downloadConversation}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-xl h-8 px-2.5 text-xs font-bold gap-1"
            title="Download Notes as Text"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={clearChat}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-xl h-8 px-2.5 text-xs font-bold gap-1"
            title="Reset conversation"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Reset</span>
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white/90 hover:text-white hover:bg-white/10 rounded-xl h-8 w-8 p-0"
            title={isMinimized ? "Expand Agent" : "Minimize Agent"}
          >
            {isMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </Button>
        </div>

        {/* Ambient glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {!isMinimized ? (
        <div className="p-4 sm:p-6 space-y-4 bg-slate-50/60 dark:bg-slate-950/40">
          {/* Mode Switcher Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                <Sparkles size={12} className="text-amber-500" />
                Select Mode (মোড নির্বাচন):
              </span>
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                <span>Class:</span>
                <select 
                  value={selectedClass} 
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 outline-none"
                >
                  {CLASS_LEVELS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {(Object.keys(MODE_CONFIGS) as AgentMode[]).map((modeKey) => {
                const config = MODE_CONFIGS[modeKey];
                const Icon = config.icon;
                const active = selectedMode === modeKey;
                return (
                  <button
                    key={modeKey}
                    onClick={() => setSelectedMode(modeKey)}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-bold transition-all border ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 scale-[1.02]'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                    }`}
                  >
                    <Icon size={14} className={active ? 'text-amber-300' : 'text-blue-500'} />
                    <span className="truncate">{config.label.split(' ')[1]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
              Subject:
            </span>
            {SUBJECT_TAGS.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                  selectedSubject === sub
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          {/* Quick Prompts Chips */}
          <div className="space-y-1.5">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {currentQuickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                  className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages Log */}
          <div 
            ref={scrollRef}
            className="h-[320px] sm:h-[380px] overflow-y-auto p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-4 shadow-inner"
          >
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] sm:max-w-[82%] rounded-[1.75rem] p-4 text-sm shadow-sm relative group ${
                    isUser 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none' 
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/60 dark:border-slate-700/60'
                  }`}>
                    {!isUser && (
                      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                          <Bot size={14} />
                          <span>© Smart Subha AI Agent</span>
                          {msg.mode && (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[9px] px-1.5 py-0 h-4">
                              {msg.mode.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => speakMessage(msg.content, i)}
                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 transition-colors"
                            title={speakingIndex === i ? "Stop speaking" : "Listen / Read Aloud"}
                          >
                            {speakingIndex === i ? <VolumeX size={14} className="text-amber-500 animate-pulse" /> : <Volume2 size={14} />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(msg.content, i)}
                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 transition-colors"
                            title="Copy response"
                          >
                            {copiedIndex === i ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>

                    {/* Quick follow-up chips for AI responses */}
                    {!isUser && i === messages.length - 1 && !loading && (
                      <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-1.5">
                        <button
                          onClick={() => handleSend("Give me 2 practice questions with answers on this topic")}
                          className="text-[10px] font-bold bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 px-2.5 py-1 rounded-full border border-blue-200 dark:border-slate-600 hover:bg-blue-50"
                        >
                          🎯 Practice Questions
                        </button>
                        <button
                          onClick={() => handleSend("Explain this in simpler Bengali with an everyday real-world example")}
                          className="text-[10px] font-bold bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 px-2.5 py-1 rounded-full border border-blue-200 dark:border-slate-600 hover:bg-blue-50"
                        >
                          💡 সহজ বাংলায় বাস্তব উদাহরণ
                        </button>
                        <button
                          onClick={() => handleSend("What are the most common exam traps/mistakes students make in this?")}
                          className="text-[10px] font-bold bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 px-2.5 py-1 rounded-full border border-blue-200 dark:border-slate-600 hover:bg-blue-50"
                        >
                          ⚠️ Common Exam Mistakes
                        </button>
                      </div>
                    )}

                    <div className={`text-[8px] mt-1.5 opacity-40 font-bold ${isUser ? 'text-right' : 'text-left'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-3xl rounded-tl-none border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                    <Bot size={14} className="animate-spin" />
                    <span>© Smart Subha Agent is reasoning...</span>
                  </div>
                  <div className="flex gap-1.5 pl-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input & Voice Controls */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={toggleListening}
              className={`rounded-2xl h-12 w-12 p-0 shrink-0 transition-all ${
                isListening 
                  ? 'bg-rose-500 text-white border-rose-500 animate-pulse shadow-lg shadow-rose-500/30' 
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:text-blue-600'
              }`}
              title={isListening ? "Listening... click to stop" : "Speak your doubt (Microphone)"}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </Button>

            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Ask © Smart Subha in বাংলা or English (e.g. ${
                selectedMode === 'doubt' ? 'solve quadratic equation...' :
                selectedMode === 'quiz' ? 'quiz me on Life Science chapter 2...' :
                selectedMode === 'planner' ? 'routine for 7 days before exams...' :
                'explain concept...'
              })`}
              disabled={loading}
              className="rounded-2xl h-12 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm focus:ring-2 focus:ring-blue-500"
            />

            <Button 
              onClick={() => handleSend()} 
              disabled={loading || !input.trim()}
              className="rounded-2xl h-12 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black shadow-md shrink-0 active:scale-95 transition-all"
            >
              {loading ? <Bot size={18} className="animate-spin" /> : <Send size={18} />}
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-3 px-6 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-2">
            <Sparkles size={14} className="text-amber-500 animate-pulse" />
            Supercharged AI Agent ready. Click to solve doubts, generate quizzes, or ask study tips!
          </span>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setIsMinimized(false)}
            className="rounded-xl h-8 px-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50"
          >
            Open Agent
          </Button>
        </div>
      )}
    </Card>
  );
};
