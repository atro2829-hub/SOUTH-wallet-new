'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MessageSquare, Search, ChevronDown, ChevronUp, Plus,
  Send, ImagePlus, X, Clock, CheckCircle2, AlertCircle, HelpCircle,
  Headphones, Paperclip, Tag, Phone, Globe, ExternalLink,
  Sparkles, MessageCircle, FileText, Ticket
} from 'lucide-react';
import { useAppStore, type SupportTicket } from '@/lib/store';
import { timeAgo, generateReference, compressBase64Image, faqItems } from '@/lib/utils';
import { ref, set, get, update, push, onValue, remove } from 'firebase/database';
import { database } from '@/lib/firebase';

type SupportView = 'main' | 'ticket-detail' | 'create-ticket';
type MainTab = 'faq' | 'tickets' | 'chat';

interface TicketMessage {
  sender: 'user' | 'support';
  text: string;
  time: string;
  image?: string;
}

interface FirebaseTicket {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  message: string;
  category: 'technical' | 'financial' | 'general';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  messages: TicketMessage[];
  createdAt: string;
  image?: string;
}

// FAQ quick links
const faqQuickLinks = [
  { icon: '🔄', label: 'كيف أقوم بتحويل أموال؟' },
  { icon: '🔐', label: 'كيف أوثق حسابي؟' },
  { icon: '💳', label: 'كيف أشحن رصيدي؟' },
  { icon: '📊', label: 'كيف أتحقق من رصيدي؟' },
  { icon: '🛡️', label: 'هل تطبيقي آمن؟' },
  { icon: '📞', label: 'كيف أتواصل مع الدعم؟' },
];

export default function SupportScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { setActiveScreen, user, addTicket, updateTicket } = useAppStore();

  const [activeTab, setActiveTab] = useState<MainTab>('faq');
  const [view, setView] = useState<SupportView>('main');
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Social links from Firebase
  const [socialLinks, setSocialLinks] = useState<{
    whatsapp: string; contactAdmin: string; contactAdminMessage: string;
  }>({ whatsapp: '', contactAdmin: '', contactAdminMessage: '' });

  useEffect(() => {
    const linksRef = ref(database, 'adminSettings/socialLinks');
    const unsubscribe = onValue(linksRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setSocialLinks({
          whatsapp: data.whatsapp || '',
          contactAdmin: data.contactAdmin || '',
          contactAdminMessage: data.contactAdminMessage || '',
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Tickets
  const [tickets, setTickets] = useState<FirebaseTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<FirebaseTicket | null>(null);
  const [messageInput, setMessageInput] = useState('');

  // Create ticket
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<'technical' | 'financial' | 'general'>('general');
  const [newMessage, setNewMessage] = useState('');
  const [newImage, setNewImage] = useState('');

  // Live chat - real Firebase chat
  const [chatMessages, setChatMessages] = useState<{ id: string; sender: 'user' | 'admin'; text: string; time: string; adminName?: string }[]>([]);
  const [chatInput, setChatInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen to tickets from Firebase
  useEffect(() => {
    if (!user?.id) return;
    const ticketsRef = ref(database, 'supportTickets');
    const unsubscribe = onValue(ticketsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const allTickets = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key,
          userId: val.userId || '',
          userName: val.userName || '',
          subject: val.subject || '',
          message: val.message || '',
          category: val.category || 'general',
          status: val.status || 'open',
          messages: val.messages || [],
          createdAt: val.createdAt || new Date().toISOString(),
          image: val.image || undefined,
        })) as FirebaseTicket[];
        const userTickets = allTickets
          .filter(t => t.userId === user.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTickets(userTickets);
      } else {
        setTickets([]);
      }
    });
    return () => unsubscribe();
  }, [user?.id]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicket?.messages?.length]);

  // Listen to live chat messages from Firebase
  useEffect(() => {
    if (!user?.id) return;
    const chatRef = ref(database, `liveChats/${user.id}`);
    const unsubscribe = onValue(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const msgsData = data.messages || {};
        const msgs = Object.entries(msgsData).map(([id, val]: [string, any]) => ({
          id,
          sender: val.sender as 'user' | 'admin',
          text: val.text || '',
          time: val.time || '',
          adminName: val.senderName || '',
        }));
        msgs.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        setChatMessages(msgs);
      } else {
        setChatMessages([]);
      }
    });
    return () => unsubscribe();
  }, [user?.id]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const filteredFaq = faqItems.filter(item => {
    if (!faqSearch) return true;
    return item.q.includes(faqSearch) || item.a.includes(faqSearch);
  });

  const handleCreateTicket = async () => {
    if (!newSubject || !newMessage || !user) return;
    const id = generateReference();
    const ticket: FirebaseTicket = {
      id, userId: user.id, userName: user.name, subject: newSubject,
      message: newMessage, category: newCategory, status: 'open',
      messages: [{ sender: 'user', text: newMessage, time: new Date().toISOString(), image: newImage || undefined }],
      createdAt: new Date().toISOString(), image: newImage || undefined,
    };
    try {
      await set(ref(database, `supportTickets/${id}`), ticket);
    } catch {}
    addTicket({ id, userId: user.id, userName: user.name, subject: newSubject, message: newMessage, category: newCategory, status: 'open', messages: [{ sender: 'user', text: newMessage, time: new Date().toISOString() }], createdAt: new Date().toISOString() });
    setNewSubject(''); setNewMessage(''); setNewImage(''); setView('main'); setActiveTab('tickets');
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedTicket || !user) return;
    const newMsg: TicketMessage = { sender: 'user', text: messageInput, time: new Date().toISOString() };
    const updatedMessages = [...(selectedTicket.messages || []), newMsg];
    const updatedTicket = { ...selectedTicket, messages: updatedMessages };
    try {
      await update(ref(database, `supportTickets/${selectedTicket.id}`), { messages: updatedMessages });
    } catch {}
    setSelectedTicket(updatedTicket);
    setMessageInput('');
  };

  // Send live chat message to Firebase (using liveChats path to match admin panel)
  const handleSendChat = async () => {
    if (!chatInput.trim() || !user?.id) return;
    const messageText = chatInput.trim();
    try {
      const newMsg = {
        sender: 'user',
        text: messageText,
        time: new Date().toISOString(),
        senderName: user.name || 'مستخدم',
      };

      // Push message to liveChats/{userId}/messages (same path admin reads from)
      await push(ref(database, `liveChats/${user.id}/messages`), newMsg);

      // Update conversation metadata for admin panel
      await update(ref(database, `liveChats/${user.id}`), {
        userId: user.id,
        userName: user.name || 'مستخدم',
        userPhone: user.phone || '',
        userEmail: user.email || '',
        status: 'active',
        updatedAt: new Date().toISOString(),
        createdAt: (await get(ref(database, `liveChats/${user.id}/createdAt`))).exists() ? undefined : new Date().toISOString(),
      });

      // Send push notification to admin about new chat message
      try {
        const adminNotifId = `chat_notif_${Date.now()}`;
        await set(ref(database, `adminNotifications/${adminNotifId}`), {
          id: adminNotifId,
          title: 'رسالة دعم جديدة',
          body: `${user.name || 'مستخدم'}: ${messageText.substring(0, 50)}`,
          type: 'transaction',
          category: 'support',
          isRead: false,
          createdAt: new Date().toISOString(),
          data: { action: 'support_chat', userId: user.id },
        });
      } catch (notifErr) {
        console.warn('Failed to notify admin about chat:', notifErr);
      }

      setChatInput('');
    } catch (e) {
      console.error('Failed to send chat message', e);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const compressed = await compressBase64Image(base64, 400, 0.6);
      setNewImage(compressed);
    };
    reader.readAsDataURL(file);
  };

  const categoryLabels: Record<string, { label: string; color: string; bg: string }> = {
    technical: { label: 'تقني', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
    financial: { label: 'مالي', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
    general: { label: 'عام', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  };

  const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
    open: { label: 'مفتوح', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
    in_progress: { label: 'قيد المتابعة', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    resolved: { label: 'تم الحل', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
    closed: { label: 'مغلق', color: '#666', bg: 'rgba(102,102,102,0.12)' },
  };

  // ─── Full-screen Live Chat View ───
  if (activeTab === 'chat') {
    return (
      <div dir="rtl" className="flex flex-col h-screen" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
        {/* Header */}
        <div className="shrink-0 animated-gradient relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #1A1A1A 0%, #2A0A0A 50%, #0F0F0F 100%)' }}>
          <div className="absolute inset-0 glass-dark opacity-30" />
          <div className="relative px-5 pt-4 pb-5">
            <div className="flex items-center gap-3">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveTab('faq')} className="w-10 h-10 rounded-xl glass flex items-center justify-center">
                <ArrowLeft size={18} strokeWidth={1.5} color="#FFF" />
              </motion.button>
              <div className="flex-1">
                <h1 className="text-white text-xl font-bold">الدردشة المباشرة</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: '#10B981' }} />
                  <span className="text-white/40 text-xs">متصل الآن</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.2)' }}>
                <Headphones size={20} strokeWidth={1.5} color="#3B82F6" />
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 space-y-3">
          {chatMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                <Headphones size={40} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />
              </div>
              <p className="text-sm font-medium" style={{ color: isDark ? '#888' : '#999' }}>ابدأ محادثة مع فريق الدعم</p>
              <p className="text-xs mt-1" style={{ color: isDark ? '#666' : '#BBB' }}>سنرد عليك في أقرب وقت</p>
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <motion.div
              key={msg.id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}
            >
              <div className="max-w-[85%]">
                {msg.sender === 'admin' && (
                  <div className="flex items-center gap-1.5 mb-1 justify-end">
                    <span className="text-[10px] font-bold" style={{ color: '#3B82F6' }}>{msg.adminName || 'فريق الدعم'}</span>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
                      <Headphones size={12} color="#3B82F6" />
                    </div>
                  </div>
                )}
                <div
                  className="rounded-2xl p-3"
                  style={{
                    background: msg.sender === 'user' ? '#5C1A1B' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    borderBottomLeftRadius: msg.sender === 'user' ? '4px' : '16px',
                    borderBottomRightRadius: msg.sender === 'admin' ? '4px' : '16px',
                  }}
                >
                  <p className="text-xs leading-relaxed" style={{ color: msg.sender === 'user' ? '#FFF' : isDark ? '#CCC' : '#333' }}>
                    {msg.text}
                  </p>
                </div>
                <div className="flex items-center gap-1 mt-1" dir="ltr">
                  {msg.sender === 'user' && (
                    <span className="text-[9px]" style={{ color: isDark ? '#555' : '#BBB' }}>أنت</span>
                  )}
                  <p className="text-[9px]" style={{ color: isDark ? '#555' : '#BBB' }}>
                    {timeAgo(msg.time)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Chat quick actions */}
        <div className="shrink-0 px-5 pb-1">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {['تحويل أموال', 'مشكلة تقنية', 'توثيق حساب', 'استفسار عام'].map((quick, i) => (
              <button
                key={i}
                onClick={() => { setChatInput(quick); }}
                className="shrink-0 px-3 py-1.5 rounded-full text-[10px] font-medium"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  color: isDark ? '#CCC' : '#666',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                }}
              >
                {quick}
              </button>
            ))}
          </div>
        </div>

        {/* Input area - fixed at bottom */}
        <div className="shrink-0 px-5 py-3" style={{ background: isDark ? 'rgba(15,15,15,0.95)' : 'rgba(245,245,245,0.95)', backdropFilter: 'blur(20px)', borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
              <input type="text" placeholder="اكتب رسالتك..." value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
            </div>
            <motion.button whileTap={{ scale: 0.85 }} onClick={handleSendChat}
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: '#5C1A1B' }}>
              <Send size={16} color="#FFF" />
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Support Screen (FAQ + Tickets + Ticket Detail + Create Ticket) ───
  return (
    <div dir="rtl" className="flex flex-col h-screen" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
      {/* Header */}
      <div className="shrink-0 animated-gradient relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #1A1A1A 0%, #2A0A0A 50%, #0F0F0F 100%)' }}>
        <div className="absolute inset-0 glass-dark opacity-30" />
        <div className="relative px-5 pt-4 pb-5">
          <div className="flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => { if (view !== 'main') { setView('main'); setSelectedTicket(null); } else { setActiveScreen('main'); } }} className="w-10 h-10 rounded-xl glass flex items-center justify-center">
              <ArrowLeft size={18} strokeWidth={1.5} color="#FFF" />
            </motion.button>
            <div className="flex-1">
              <h1 className="text-white text-xl font-bold">
                {view === 'ticket-detail' ? selectedTicket?.subject || 'تفاصيل التذكرة' : view === 'create-ticket' ? 'تذكرة جديدة' : 'الدعم والمساعدة'}
              </h1>
              {view === 'main' && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: '#10B981' }} />
                  <span className="text-white/40 text-xs">متصل الآن</span>
                </div>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.2)' }}>
              <Headphones size={20} strokeWidth={1.5} color="#3B82F6" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Main View */}
        {view === 'main' && (
          <div className="px-5 mt-4 pb-8">
            {/* Tab Toggle - Now 3 tabs */}
            <div className="flex gap-2 mb-4">
              {([
                { id: 'faq' as MainTab, label: 'مركز المساعدة', icon: HelpCircle },
                { id: 'chat' as MainTab, label: 'دردشة مباشرة', icon: MessageCircle },
                { id: 'tickets' as MainTab, label: 'تذاكر الدعم', icon: MessageSquare },
              ]).map(tab => {
                const Icon = tab.icon;
                return (
                  <motion.button key={tab.id} whileTap={{ scale: 0.95 }} onClick={() => setActiveTab(tab.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-medium"
                    style={{
                      background: activeTab === tab.id ? 'rgba(92,26,27,0.15)' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                      border: activeTab === tab.id ? '1px solid rgba(92,26,27,0.3)' : isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                      color: activeTab === tab.id ? '#FFF' : isDark ? '#BBB' : '#666',
                      backdropFilter: 'blur(20px)',
                    }}>
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* WhatsApp Direct Contact */}
            {socialLinks.whatsapp && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4"
              >
                <a
                  href={`https://wa.me/${socialLinks.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{
                    background: 'rgba(37,211,102,0.1)',
                    border: '1px solid rgba(37,211,102,0.2)',
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#25D366' }}>
                    <Phone size={20} color="#FFF" />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-sm font-bold" style={{ color: '#25D366' }}>تواصل عبر واتساب</p>
                    <p className="text-[10px]" style={{ color: isDark ? '#888' : '#999' }}>رد سريع من فريق الدعم</p>
                  </div>
                  <ExternalLink size={16} color="#25D366" />
                </a>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {/* FAQ Tab */}
              {activeTab === 'faq' && (
                <motion.div key="faq" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                  {/* Search */}
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                    <Search size={16} color={isDark ? '#555' : '#AAA'} />
                    <input type="text" placeholder="ابحث في الأسئلة الشائعة..." value={faqSearch} onChange={e => setFaqSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
                  </div>

                  {/* FAQ Quick Links */}
                  <div className="rounded-2xl p-4" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                    <h3 className="text-xs font-bold mb-3" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>الأسئلة الأكثر شيوعاً</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {faqQuickLinks.map((link, i) => (
                        <button
                          key={i}
                          onClick={() => setFaqSearch(link.label.replace(/[؟?]/g, '').replace('كيف ', ''))}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] text-right"
                          style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                        >
                          <span>{link.icon}</span>
                          <span style={{ color: isDark ? '#CCC' : '#444' }}>{link.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* FAQ Items */}
                  {filteredFaq.map((item, index) => (
                    <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
                      className="rounded-2xl overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                      <button onClick={() => setExpandedFaq(expandedFaq === index ? null : index)} className="w-full flex items-center justify-between p-4">
                        <span className="text-sm font-medium text-right flex-1" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{item.q}</span>
                        <motion.div animate={{ rotate: expandedFaq === index ? 180 : 0 }} transition={{ duration: 0.2 }}>
                          <ChevronDown size={16} color={isDark ? '#888' : '#AAA'} />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {expandedFaq === index && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-4 pb-4" style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}>
                              <p className="text-xs leading-relaxed pt-3" style={{ color: isDark ? '#AAA' : '#666' }}>{item.a}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}

                  {/* Create ticket CTA */}
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => setView('create-ticket')}
                    className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium mt-4"
                    style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B', border: '1px solid rgba(92,26,27,0.2)', backdropFilter: 'blur(20px)' }}>
                    <MessageSquare size={16} />
                    <span>لم تجد إجابة؟ أنشئ تذكرة دعم</span>
                  </motion.button>

                  {/* Contact Admin Section */}
                  {(socialLinks.contactAdmin || socialLinks.contactAdminMessage) && (
                    <div className="rounded-2xl p-4 mt-3" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.12)' }}>
                          <Headphones size={16} color="#8B5CF6" />
                        </div>
                        <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>تواصل مع الأدمن</h3>
                      </div>
                      {socialLinks.contactAdminMessage && (
                        <p className="text-xs leading-relaxed mb-3" style={{ color: isDark ? '#AAA' : '#666' }}>
                          {socialLinks.contactAdminMessage}
                        </p>
                      )}
                      {socialLinks.contactAdmin && (
                        <a
                          href={socialLinks.contactAdmin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold w-full"
                          style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}
                        >
                          <ExternalLink size={16} />
                          <span>تواصل مباشر</span>
                        </a>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Tickets Tab */}
              {activeTab === 'tickets' && (
                <motion.div key="tickets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => setView('create-ticket')}
                    className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
                    style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B', border: '1px solid rgba(92,26,27,0.2)', backdropFilter: 'blur(20px)' }}>
                    <Plus size={18} strokeWidth={1.5} /><span>تذكرة جديدة</span>
                  </motion.button>

                  {tickets.map((ticket) => {
                    const cat = categoryLabels[ticket.category] || categoryLabels.general;
                    const stat = statusLabels[ticket.status] || statusLabels.open;
                    const lastMsg = ticket.messages?.[ticket.messages.length - 1];
                    return (
                      <motion.div key={ticket.id} whileTap={{ scale: 0.98 }} onClick={() => { setSelectedTicket(ticket); setView('ticket-detail'); }}
                        className="rounded-2xl p-4 cursor-pointer" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{ticket.subject}</p>
                          </div>
                          <div className="flex items-center gap-1.5 mr-2 flex-shrink-0">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: stat.bg, color: stat.color }}>{stat.label}</span>
                          </div>
                        </div>
                        {lastMsg && (
                          <p className="text-xs truncate mb-2" style={{ color: isDark ? '#888' : '#AAA' }}>
                            {lastMsg.sender === 'support' ? 'الدعم: ' : ''}{lastMsg.text}
                          </p>
                        )}
                        <p className="text-[10px]" style={{ color: isDark ? '#555' : '#BBB' }}>{timeAgo(ticket.createdAt)}</p>
                      </motion.div>
                    );
                  })}

                  {tickets.length === 0 && (
                    <div className="flex flex-col items-center py-12">
                      <MessageSquare size={48} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                      <p className="text-sm mt-3" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد تذاكر دعم</p>
                      <p className="text-xs mt-1" style={{ color: isDark ? '#555' : '#BBB' }}>أنشئ تذكرة جديدة وسنساعدك</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Ticket Detail View */}
        {view === 'ticket-detail' && selectedTicket && (
          <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 80px)' }}>
            {/* Ticket info bar */}
            <div className="px-5 py-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: categoryLabels[selectedTicket.category]?.bg, color: categoryLabels[selectedTicket.category]?.color }}>
                  {categoryLabels[selectedTicket.category]?.label}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: statusLabels[selectedTicket.status]?.bg, color: statusLabels[selectedTicket.status]?.color }}>
                  {statusLabels[selectedTicket.status]?.label}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {(selectedTicket.messages || []).map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className="max-w-[80%]">
                    {msg.sender === 'support' && (
                      <div className="flex items-center gap-1.5 mb-1 justify-end">
                        <span className="text-[10px] font-medium" style={{ color: '#3B82F6' }}>فريق الدعم</span>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
                          <Headphones size={10} color="#3B82F6" />
                        </div>
                      </div>
                    )}
                    <div className="rounded-2xl p-3" style={{
                      background: msg.sender === 'user' ? '#5C1A1B' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                      borderBottomLeftRadius: msg.sender === 'user' ? '4px' : '16px',
                      borderBottomRightRadius: msg.sender === 'support' ? '4px' : '16px',
                    }}>
                      {msg.image && <img src={msg.image} alt="attachment" className="w-full rounded-xl mb-2 max-h-48 object-cover" />}
                      <p className="text-xs leading-relaxed" style={{ color: msg.sender === 'user' ? '#FFF' : isDark ? '#CCC' : '#333' }}>{msg.text}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-1" dir="ltr">
                      {msg.sender === 'user' && (
                        <span className="text-[9px]" style={{ color: isDark ? '#555' : '#BBB' }}>أنت</span>
                      )}
                      <p className="text-[9px]" style={{ color: isDark ? '#555' : '#BBB' }}>{timeAgo(msg.time)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
              <div className="px-5 py-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                    <input type="text" placeholder="اكتب رسالتك..." value={messageInput} onChange={e => setMessageInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
                  </div>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={handleSendMessage}
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: '#5C1A1B' }}>
                    <Send size={16} color="#FFF" />
                  </motion.button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Ticket View */}
        {view === 'create-ticket' && (
          <div className="px-5 mt-4 pb-8">
            <div className="space-y-3">
              <div className="rounded-2xl p-4 space-y-3" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                <h3 className="text-sm font-bold mb-1" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>إنشاء تذكرة دعم</h3>
                <input type="text" placeholder="موضوع التذكرة" value={newSubject} onChange={e => setNewSubject(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', color: isDark ? '#FFF' : '#1a1a1a' }} />
                
                <div className="flex gap-2">
                  {(['technical', 'financial', 'general'] as const).map(cat => {
                    const info = categoryLabels[cat];
                    return (
                      <button key={cat} onClick={() => setNewCategory(cat)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-medium"
                        style={{ background: newCategory === cat ? info.bg : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', color: newCategory === cat ? info.color : isDark ? '#888' : '#AAA', border: newCategory === cat ? `1px solid ${info.color}30` : 'none' }}>
                        {info.label}
                      </button>
                    );
                  })}
                </div>

                <textarea placeholder="اكتب رسالتك بالتفصيل..." value={newMessage} onChange={e => setNewMessage(e.target.value)} rows={4}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', color: isDark ? '#FFF' : '#1a1a1a' }} />

                {/* Image upload */}
                <div>
                  <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <div className="flex items-center gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', color: isDark ? '#AAA' : '#888' }}>
                      <ImagePlus size={14} /><span>إرفاق صورة</span>
                    </button>
                    {newImage && (
                      <div className="relative">
                        <img src={newImage} alt="attachment" className="w-10 h-10 rounded-lg object-cover" />
                        <button onClick={() => setNewImage('')} className="absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#5C1A1B' }}>
                          <X size={8} color="#FFF" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <motion.button whileTap={{ scale: 0.95 }} onClick={handleCreateTicket} disabled={!newSubject || !newMessage}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: '#5C1A1B' }}>
                  إرسال التذكرة
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
