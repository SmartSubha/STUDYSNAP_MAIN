import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FolderSync, 
  CheckSquare, 
  GraduationCap, 
  Sparkles, 
  Plus, 
  Download, 
  Check, 
  Trash2,
  HardDrive,
  Calendar,
  Layers,
  BookOpen
} from 'lucide-react';
import { Note, UserProfile, WorkspaceTask } from '../types';
import { toast } from 'sonner';
import { downloadNoteAsText, downloadNoteAsHtml } from '../lib/noteDownloader';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface GoogleWorkspaceHubProps {
  notes: Note[];
  currentUser: UserProfile | null;
  isAdmin: boolean;
}

export const GoogleWorkspaceHub: React.FC<GoogleWorkspaceHubProps> = ({
  notes,
  currentUser,
  isAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'drive' | 'classroom'>('tasks');

  // Internal Drive Saved Files State
  const [savedDriveNotes, setSavedDriveNotes] = useState<string[]>([]);

  // Real-time Dynamic Workspace Tasks (No hardcoded pre-installed tasks)
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState('General');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Subscribe to persistent tasks from Firestore
  useEffect(() => {
    try {
      const q = query(collection(db, 'workspaceTasks'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snapshot) => {
        const fetched: WorkspaceTask[] = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        } as WorkspaceTask));
        setTasks(fetched);
      }, (err) => {
        console.warn("Workspace tasks snapshot error:", err);
      });
      return unsub;
    } catch {}
  }, []);

  // In-App Drive Backup
  const handleSaveToDrive = (note: Note) => {
    if (note.type === 'html') {
      downloadNoteAsHtml(note);
    } else {
      downloadNoteAsText(note, 'txt');
    }

    if (!savedDriveNotes.includes(note.id)) {
      setSavedDriveNotes(prev => [note.id, ...prev]);
    }
    toast.success(`Note "${note.title}" downloaded & backed up to storage!`);
  };

  // Add Task (Admin Only)
  const handleAddTask = async () => {
    if (!isAdmin) {
      toast.error("Only administrators can assign tasks to students");
      return;
    }
    if (!newTaskTitle.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    setIsSubmittingTask(true);
    try {
      await addDoc(collection(db, 'workspaceTasks'), {
        title: newTaskTitle.trim(),
        subject: newTaskSubject,
        dueDate: newTaskDueDate.trim() || 'This Week',
        isCompleted: false,
        assignedByAdmin: true,
        userId: currentUser?.uid || 'admin',
        createdAt: new Date().toISOString()
      });
      setNewTaskTitle('');
      setNewTaskDueDate('');
      toast.success("Study task successfully assigned to student roster!");
    } catch (e: any) {
      toast.error("Failed to add task: " + e.message);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // Toggle Task Completion
  const toggleTask = async (task: WorkspaceTask) => {
    try {
      await updateDoc(doc(db, 'workspaceTasks', task.id), {
        isCompleted: !task.isCompleted
      });
    } catch (e: any) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t));
    }
  };

  // Delete Task (Admin Only)
  const handleDeleteTask = async (id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'workspaceTasks', id));
      toast.success("Task deleted successfully");
    } catch (e: any) {
      toast.error("Failed to delete task: " + e.message);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Workspace Hub Banner */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-black tracking-wider uppercase backdrop-blur-md">
              <FolderSync size={14} className="text-amber-400" />
              <span>In-App Study Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Study Workspace & Assignment Center</span>
              <Sparkles size={24} className="text-amber-400" />
            </h1>
            <p className="text-xs sm:text-sm text-purple-100 max-w-xl">
              অ্যাসাইনমেন্ট ও হোমওয়ার্ক টাস্ক ম্যানেজার, ডিজিটাল ক্লাসরুম এবং অফলাইন ড্রাইভ ব্যাকআপ।
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-3 px-4 rounded-2xl border border-white/10">
            <CheckSquare className="text-emerald-400" size={20} />
            <div className="text-xs">
              <div className="font-bold text-white">Active Tasks</div>
              <div className="text-[10px] text-purple-200">{tasks.filter(t => !t.isCompleted).length} Tasks Assigned</div>
            </div>
          </div>
        </div>

        {/* Ambient Glows */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Main Workspace Tabs */}
      <Card className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden p-6 sm:p-8">
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
          <TabsList className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <TabsTrigger value="tasks" className="rounded-xl font-bold text-xs gap-1.5 cursor-pointer">
              <CheckSquare size={15} />
              <span>Study Tasks ({tasks.length})</span>
            </TabsTrigger>
            <TabsTrigger value="drive" className="rounded-xl font-bold text-xs gap-1.5 cursor-pointer">
              <FolderSync size={15} />
              <span>Drive Storage</span>
            </TabsTrigger>
            <TabsTrigger value="classroom" className="rounded-xl font-bold text-xs gap-1.5 cursor-pointer">
              <GraduationCap size={15} />
              <span>Classroom</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: STUDY TASKS */}
          <TabsContent value="tasks" className="space-y-4 pt-2">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                  Study Tasks & Homework Manager
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {isAdmin 
                    ? 'শিক্ষার্থীদের জন্য পড়াশোনার টাস্ক ও অ্যাসাইনমেন্ট তৈরি বা ডিলিট করুন।' 
                    : 'অ্যাডমিনের দেওয়া পড়াশোনার লক্ষ্য ও দৈনিক টাস্ক সম্পন্ন করে টিক দিন।'}
                </p>
              </div>
              <Badge className="bg-emerald-600 text-white font-bold text-xs px-3 py-1">
                {tasks.filter(t => !t.isCompleted).length} Pending
              </Badge>
            </div>

            {/* Add Task Input - Only Admin Can Assign Tasks */}
            {isAdmin ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="text-xs font-black text-slate-700 dark:text-slate-300">
                  Assign New Study Task to Students
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <Input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                    placeholder="Task details (e.g. Complete Madhyamik Math Chapter 5 Theorems)..."
                    className="rounded-xl h-11 text-xs flex-1"
                  />
                  <Input
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    placeholder="Due date (e.g. Tomorrow 8 PM)"
                    className="rounded-xl h-11 text-xs sm:w-44"
                  />
                  <select
                    value={newTaskSubject}
                    onChange={(e) => setNewTaskSubject(e.target.value)}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 h-11 text-xs font-bold outline-none"
                  >
                    <option value="General">General</option>
                    <option value="Physical Science">Physical Science</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Life Science">Life Science</option>
                    <option value="History">History</option>
                    <option value="Geography">Geography</option>
                    <option value="Bengali">Bengali</option>
                    <option value="English">English</option>
                  </select>
                  <Button
                    onClick={handleAddTask}
                    disabled={isSubmittingTask}
                    className="rounded-xl h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 gap-1.5 cursor-pointer shadow-md"
                  >
                    <Plus size={15} />
                    <span>{isSubmittingTask ? 'Assigning...' : 'Assign Task'}</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500 flex items-center justify-between">
                <span>📌 Study tasks are assigned by Administrator / Teacher. Check off your assigned tasks below:</span>
                <Badge variant="outline" className="text-[10px] font-bold">Admin-Curated</Badge>
              </div>
            )}

            {/* Task List */}
            {tasks.length === 0 ? (
              <div className="p-10 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 font-bold text-xs">
                {isAdmin ? 'No study tasks assigned yet. Use the form above to assign homework to students.' : 'No study tasks currently assigned by admin.'}
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      t.isCompleted 
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 line-through text-slate-400' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div 
                      onClick={() => toggleTask(t)} 
                      className="flex items-center gap-3 cursor-pointer flex-1"
                    >
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                        t.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-700'
                      }`}>
                        {t.isCompleted && <Check size={14} />}
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                          {t.title}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="font-bold text-emerald-600">{t.subject}</span>
                          {t.dueDate && <span>• Due: {t.dueDate}</span>}
                          <span className="text-indigo-500 font-bold">• Assigned by Admin</span>
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="text-slate-400 hover:text-rose-500 p-2 rounded-lg cursor-pointer"
                        title="Delete task"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: IN-APP DRIVE STORAGE */}
          <TabsContent value="drive" className="space-y-4 pt-2">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/40 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h4 className="font-bold text-sm text-blue-900 dark:text-blue-200">
                  Save & Backup Educational Files
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                  যেকোনো নোট এক ক্লিকে অফলাইনে সংরক্ষণ ও ব্যাকআপ ডাউনলোড করুন।
                </p>
              </div>
              <Badge className="bg-blue-600 text-white font-bold text-xs px-3 py-1">
                {savedDriveNotes.length} Files Backed Up
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {notes.slice(0, 8).map((n) => {
                const isBackedUp = savedDriveNotes.includes(n.id);
                return (
                  <div key={n.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shadow-sm hover:border-blue-300 transition-colors">
                    <div className="truncate">
                      <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {n.title}
                      </div>
                      <div className="text-[11px] text-blue-600 dark:text-blue-400 font-bold uppercase mt-0.5">
                        {n.subject} • Format: {n.type.toUpperCase()}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isBackedUp ? "default" : "outline"}
                      onClick={() => handleSaveToDrive(n)}
                      className={`rounded-xl text-xs font-bold shrink-0 h-8 gap-1.5 cursor-pointer ${
                        isBackedUp ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-blue-200 text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      {isBackedUp ? <Check size={13} /> : <Download size={13} />}
                      <span>{isBackedUp ? 'Saved' : 'Save File'}</span>
                    </Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB 3: IN-APP CLASSROOM */}
          <TabsContent value="classroom" className="space-y-4 pt-2">
            <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-900/40">
              <h4 className="font-bold text-sm text-purple-900 dark:text-purple-200">
                StudySnap Digital Classroom Stream
              </h4>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">
                সকল ক্লাস রুটিন, নোটিশ এবং মাধ্যমিক পরীক্ষার ঘোষণা
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold text-[10px]">
                    Academic Schedule
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-mono">Madhyamik 2025</span>
                </div>
                <h5 className="font-black text-sm text-slate-900 dark:text-white">
                  Physical Science Doubt Clearing Routine
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Every Monday & Wednesday from 6:30 PM. Focus chapters: গ্যাসের আচরণ ও রাসায়নিক গণনা।
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                    Upcoming Assignment
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-mono">Due This Week</span>
                </div>
                <h5 className="font-black text-sm text-slate-900 dark:text-white">
                  Mathematics Theorem Practice Test (উপপাদ্য ৩৫, ৩৮, ৪৯)
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Submit step-by-step proofs before Friday. Solutions will be published on the notes feed.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};
