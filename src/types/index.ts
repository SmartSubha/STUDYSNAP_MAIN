export type UserRole = 'admin' | 'student' | 'teacher';

export const AUTHORIZED_ADMIN_EMAILS = [
  'sanpuianup88@gmail.com',
  'iamsubha4200@gmail.com'
];

export const isAuthorizedAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return AUTHORIZED_ADMIN_EMAILS.includes(email.trim().toLowerCase());
};

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  name: string;
  class: number;
  school: string;
  phone: string;
  points: number;
  isVIP: boolean;
  vipSince?: string;
  vipPlan?: string;
  role: UserRole;
  streak: number;
  lastLogin: string;
  noteLockPassword?: string;
  status?: 'online' | 'offline';
  lastActive?: string;
  battery?: {
    level: number;
    isCharging: boolean;
  };
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    accuracy?: number;
    timestamp?: number;
  };
  deviceInfo?: {
    platform: string;
    userAgent: string;
    vendor?: string;
    language?: string;
    androidVersion?: string;
    screenSize?: string;
  };
  currentActivity?: string;
  bookmarks?: string[];
  theme?: string;
  ipAddress?: string;
  browserInfo?: {
    userAgent: string;
    platform: string;
    vendor: string;
    language: string;
  };
  notificationPrefs?: {
    newNoteAlerts: boolean;
    communityMsgs: boolean;
  };
  remoteCommand?: {
    type: 'lock' | 'alert' | 'logout' | 'none';
    payload?: string;
    timestamp: string;
  };
  lockoutEnabled?: boolean;
  lockoutPassword?: string;
  lockoutAttemptsCount?: number;
  lockoutPermanentSiren?: boolean;
  completedSurveys?: string[];
  readNotesHistory?: {
    noteId: string;
    noteTitle: string;
    subject: string;
    viewedAt: string;
    timeSpentSeconds?: number;
  }[];
  currentlyReadingNote?: {
    noteId: string;
    noteTitle: string;
    subject: string;
    startedAt: string;
  } | null;
  adminDirectMessage?: {
    text: string;
    sentAt: string;
    sender: string;
    title?: string;
  } | null;
  honorBadge?: string;
  activeSessionId?: string;
  isDarkThreatLocked?: boolean;
  darkThreatMessage?: string;
  tabSwitchCount?: number;
  isTabFocused?: boolean;
  lastFocusEvent?: string;
  pinLockPassword?: string;
  isLockedOut?: boolean;
  proctorStatus?: {
    active?: boolean;
    cameraEnabled?: boolean;
    micEnabled?: boolean;
    connectedAt?: string;
    requested?: boolean;
    lastHeartbeat?: string;
  };
  cameraSnapshot?: string;
  cameraUpdatedAt?: string;
  screenSnapshot?: string;
  screenUpdatedAt?: string;
  remoteAudioAlarm?: {
    isPlaying?: boolean;
    audioUrl?: string;
    title?: string;
    startedAt?: string | null;
    triggeredBy?: string;
  };
}

export interface SurveyConfig {
  id: string;
  title: string;
  description?: string;
  googleFormUrl?: string;
  questions?: { id: string; question: string; type: 'text' | 'choice'; options?: string[] }[];
  isActive: boolean;
  isMandatory: boolean;
  createdAt: string;
}

export interface MeetingRoom {
  id: string;
  title: string;
  subject: string;
  meetUrl: string;
  classroomUrl?: string;
  description?: string;
  password?: string;
  hasPassword?: boolean;
  isOfficialTeacherMeeting?: boolean;
  scheduledTime?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface StudentIdea {
  id: string;
  title: string;
  content: string;
  category: 'feature' | 'notes' | 'study_tip' | 'general';
  studentId: string;
  studentName: string;
  studentEmail?: string;
  isReviewed?: boolean;
  createdAt: string;
  color?: string;
}

export interface WorkspaceTask {
  id: string;
  title: string;
  subject?: string;
  dueDate?: string;
  assignedByAdmin?: boolean;
  isCompleted: boolean;
  userId: string;
  createdAt: string;
}

export interface SubjectMilestone {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  receiverId: string;
  text: string;
  timestamp: string;
  sharedNoteId?: string;
  reactions?: Record<string, string[]>;
}

export interface Note {
  id: string;
  title: string;
  subject: string;
  pdfUrl?: string;
  content?: string;
  images?: string[];
  htmlUrl?: string;
  htmlContent?: string;
  voiceUrl?: string;
  videoUrl?: string;
  description?: string;
  createdAt: string;
  authorId: string;
  type: 'pdf' | 'text' | 'image' | 'html' | 'voice' | 'video';
  aiSummary?: string;
  bookmarkCount?: number;
  estimatedReadTime?: string;
  isApproved?: boolean;
  pendingApproval?: boolean;
}

export interface Notice {
  id: string;
  subject: string;
  fromDate: string;
  toDate: string;
  type: 'text' | 'image' | 'html';
  priority: 'low' | 'medium' | 'high';
  content?: string;
  imageUrl?: string;
  htmlUrl?: string;
  htmlContent?: string;
  createdAt: string;
}

export interface AppConfig {
  countdownMessage: string;
  countdownDate: string;
  isNoteLocked: boolean;
  noteAccessPassword?: string;
  crimeTapeText?: string;
  quickByteVideoUrl?: string;
  hyperlinkText?: string;
  hyperlinkUrl?: string;
  hideClock?: boolean;
  hideNotice?: boolean;
  hideCalendar?: boolean;
  hideLofi?: boolean;
  hideChat?: boolean;
  razorpayKeyId?: string;
  upiId?: string;
}

export interface Quiz {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  subject: string;
  points: number;
  date: string;
}

export interface ReadStatus {
  id: string;
  userId: string;
  noteId: string;
  isRead: boolean;
  readTime: number;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  points: number;
  isVIP: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: 'exam' | 'holiday' | 'class' | 'other';
  description?: string;
  createdAt: string;
}

export interface QRScan {
  id: string;
  timestamp: string;
  userId?: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  planId: string;
  planName: string;
  status: 'successful' | 'pending' | 'failed';
  paymentMethod: 'razorpay' | 'upi';
  upiId?: string;
  razorpayPaymentId?: string;
  paidAt: string;
  notes?: string;
}
