import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Video, 
  VideoOff, 
  Lock, 
  Users, 
  Plus, 
  ExternalLink, 
  Calendar, 
  GraduationCap, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  Clock,
  KeyRound,
  Trash2
} from 'lucide-react';
import { MeetingRoom, UserProfile } from '../types';
import { collection, onSnapshot, addDoc, query, orderBy, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

interface LiveMeetingsHubProps {
  currentUser: UserProfile | null;
  isAdmin: boolean;
}

export const LiveMeetingsHub: React.FC<LiveMeetingsHubProps> = ({
  currentUser,
  isAdmin,
}) => {
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [loading, setLoading] = useState(true);

  // Create room modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Math');
  const [newMeetUrl, setNewMeetUrl] = useState('');
  const [newClassroomUrl, setNewClassroomUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newSchedule, setNewSchedule] = useState('');

  // Password verification modal
  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    try {
      const q = query(collection(db, 'meetingRooms'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snapshot) => {
        const fetched: MeetingRoom[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MeetingRoom));
        setRooms(fetched);
        setLoading(false);
      }, (err) => {
        console.warn("Meeting rooms snapshot warning:", err);
        setLoading(false);
      });
      return unsub;
    } catch {
      setLoading(false);
    }
  }, []);

  const handleCreateRoom = async () => {
    if (!newTitle.trim()) {
      toast.error("Please enter a meeting title");
      return;
    }

    const meetUrl = newMeetUrl.trim() || 'https://meet.google.com/new';

    try {
      await addDoc(collection(db, 'meetingRooms'), {
        title: newTitle.trim(),
        subject: newSubject,
        meetUrl,
        classroomUrl: newClassroomUrl.trim() || undefined,
        password: newPassword.trim() || undefined,
        hasPassword: !!newPassword.trim(),
        isOfficialTeacherMeeting: isAdmin,
        scheduledTime: newSchedule.trim() || 'Live Now',
        createdBy: currentUser?.uid || 'admin',
        createdByName: currentUser?.name || 'Chief Admin',
        createdAt: new Date().toISOString()
      });

      toast.success("Meeting Room Created Successfully!");
      setIsCreateOpen(false);
      setNewTitle('');
      setNewMeetUrl('');
      setNewPassword('');
      setNewSchedule('');
    } catch (e: any) {
      toast.error("Failed to create room: " + e.message);
    }
  };

  const handleJoinClick = (room: MeetingRoom) => {
    if (room.hasPassword && !isAdmin) {
      setSelectedRoom(room);
      setEnteredPassword('');
      setIsPasswordModalOpen(true);
    } else {
      window.open(room.meetUrl, '_blank');
      toast.success(`Joining ${room.title}...`);
    }
  };

  const handleVerifyPassword = () => {
    if (!selectedRoom) return;
    if (enteredPassword === selectedRoom.password) {
      setIsPasswordModalOpen(false);
      window.open(selectedRoom.meetUrl, '_blank');
      toast.success("Password verified! Opening Google Meet...");
    } else {
      toast.error("Incorrect meeting password");
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      await deleteDoc(doc(db, 'meetingRooms', roomId));
      toast.success("Meeting room removed");
    } catch (e: any) {
      toast.error("Failed to delete room");
    }
  };

  const handleClearAllPreExistingMeetings = async () => {
    if (!isAdmin) return;
    try {
      const snap = await getDocs(collection(db, 'meetingRooms'));
      const deletions = snap.docs.map(d => deleteDoc(doc(db, 'meetingRooms', d.id)));
      await Promise.all(deletions);
      setRooms([]);
      toast.success("All pre-existing meetings have been deleted!");
    } catch (e: any) {
      toast.error("Failed to clear meetings: " + e.message);
    }
  };

  const displayRooms = rooms;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-800 rounded-[2.5rem] text-white flex items-center justify-between gap-4 flex-wrap shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
            <Video size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-lg sm:text-xl text-white">
                Virtual Study Rooms & Google Meet
              </h3>
              <Badge className="bg-amber-400 text-slate-950 font-black text-[10px] uppercase border-none px-2 py-0.5">
                LIVE COLLABORATION
              </Badge>
            </div>
            <p className="text-xs text-emerald-100 font-medium mt-0.5">
              শিক্ষক ও শিক্ষার্থীদের লাইভ মিটিং এবং ভার্চুয়াল স্টাডি রুম (Admin Only Meeting Creation)
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleClearAllPreExistingMeetings}
              variant="outline"
              className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 border border-rose-400/30 rounded-2xl text-xs font-black h-11 px-4 gap-1.5 cursor-pointer"
            >
              <Trash2 size={15} />
              <span>Delete Pre-Existing Meetings</span>
            </Button>

            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-white text-emerald-900 hover:bg-emerald-50 rounded-2xl text-xs font-black h-11 px-5 gap-2 shadow-lg shadow-black/10 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Create Official Meeting</span>
            </Button>
          </div>
        )}
      </div>

      {/* Meeting Rooms Grid */}
      {displayRooms.length === 0 ? (
        <Card className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center shadow-lg">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4 shadow-inner">
            <Video size={28} />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            No Live Meetings Scheduled
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
            {isAdmin 
              ? 'পূর্বের সব মিটিং মুছে ফেলা হয়েছে। শিক্ষার্থীদের জন্য নতুন মিটিং তৈরি করতে উপরের "Create Official Meeting" বাটনে ক্লিক করুন।'
              : 'বর্তমানে কোনো লাইভ ক্লাস বা মিটিং শিডিউল নেই। শুধুমাত্র অ্যাডমিনিস্ট্রেটর মিটিং তৈরি করতে পারেন। নতুন মিটিং শুরু হলে এখানে দেখতে পাবেন।'}
          </p>
          {isAdmin && (
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black h-10 px-5 gap-1.5 cursor-pointer shadow-md"
              >
                <Plus size={14} />
                <span>Create New Meeting</span>
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayRooms.map((room) => (
            <Card 
              key={room.id}
              className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between"
            >
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                        {room.subject}
                      </Badge>
                      {room.isOfficialTeacherMeeting && (
                        <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-[10px] flex items-center gap-1">
                          <GraduationCap size={12} />
                          Teacher Meeting
                        </Badge>
                      )}
                      {room.hasPassword && (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px] flex items-center gap-1">
                          <Lock size={11} />
                          Password Protected
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-black text-base sm:text-lg text-slate-900 dark:text-white pt-1">
                      {room.title}
                    </h4>
                  </div>

                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping shrink-0" title="Active Room" />
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-emerald-600 shrink-0" />
                    <span>{room.scheduledTime || 'Live Discussion'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-blue-600 shrink-0" />
                    <span>Hosted by <strong>{room.createdByName || 'Administrator'}</strong></span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <Button
                    onClick={() => handleJoinClick(room)}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold h-10 gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <Video size={15} />
                    <span>{room.hasPassword && !isAdmin ? 'Enter Password to Join' : 'Join Google Meet'}</span>
                  </Button>

                  {room.classroomUrl && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(room.classroomUrl, '_blank')}
                      className="rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold h-10 px-3 gap-1 cursor-pointer"
                      title="Open Google Classroom"
                    >
                      <GraduationCap size={15} />
                    </Button>
                  )}

                  {isAdmin && (
                    <Button
                      variant="ghost"
                      onClick={() => handleDeleteRoom(room.id)}
                      className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl h-10 px-3 text-xs font-bold cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Admin Create Meeting Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Create Google Meet Room</DialogTitle>
            <DialogDescription className="text-xs">
              শিক্ষার্থীদের জন্য অফিসিয়াল গুগল মিট এবং পাসওয়ার্ড সুরক্ষিত স্টাডি সেশন তৈরি করুন।
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold block mb-1">Meeting Title (নাম)</label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Madhyamik Physical Science Live Doubts"
                className="rounded-xl h-10"
              />
            </div>

            <div>
              <label className="font-bold block mb-1">Subject (বিষয়)</label>
              <select
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl h-10 px-3 font-bold outline-none"
              >
                <option value="Math">Math (গণিত)</option>
                <option value="Phy Sci">Physical Science (ভৌত বিজ্ঞান)</option>
                <option value="Life Sci">Life Science (জীবন বিজ্ঞান)</option>
                <option value="Bengali">Bengali (বাংলা)</option>
                <option value="English">English</option>
                <option value="History">History</option>
                <option value="Geography">Geography</option>
                <option value="General Study">General Study Room</option>
              </select>
            </div>

            <div>
              <label className="font-bold block mb-1">Google Meet URL</label>
              <Input
                value={newMeetUrl}
                onChange={(e) => setNewMeetUrl(e.target.value)}
                placeholder="https://meet.google.com/xxx-yyyy-zzz (or leave empty for new)"
                className="rounded-xl h-10"
              />
            </div>

            <div>
              <label className="font-bold block mb-1">Google Classroom URL (Optional)</label>
              <Input
                value={newClassroomUrl}
                onChange={(e) => setNewClassroomUrl(e.target.value)}
                placeholder="https://classroom.google.com/c/..."
                className="rounded-xl h-10"
              />
            </div>

            <div>
              <label className="font-bold block mb-1">Meeting Password (Optional - পাসওয়ার্ড)</label>
              <Input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Set password for private room"
                className="rounded-xl h-10"
              />
            </div>

            <div>
              <label className="font-bold block mb-1">Schedule / Time (সময়)</label>
              <Input
                value={newSchedule}
                onChange={(e) => setNewSchedule(e.target.value)}
                placeholder="e.g. Today at 7:30 PM"
                className="rounded-xl h-10"
              />
            </div>
          </div>

          <Button
            onClick={handleCreateRoom}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl gap-2 shadow-md"
          >
            <Video size={16} />
            <span>Launch Meeting Room</span>
          </Button>
        </DialogContent>
      </Dialog>

      {/* Password Prompt Modal */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="max-w-sm rounded-[2rem] p-6 space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <KeyRound size={24} />
          </div>
          <div>
            <DialogTitle className="text-lg font-black">Meeting Password Required</DialogTitle>
            <DialogDescription className="text-xs mt-1">
              {selectedRoom?.title} - এই মিটিংটি পাসওয়ার্ড দিয়ে সুরক্ষিত।
            </DialogDescription>
          </div>

          <Input
            type="password"
            value={enteredPassword}
            onChange={(e) => setEnteredPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
            placeholder="Enter Meeting Password"
            className="rounded-xl text-center tracking-widest font-mono text-base h-11"
          />

          <Button
            onClick={handleVerifyPassword}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl shadow-md"
          >
            Verify & Join Meeting
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
