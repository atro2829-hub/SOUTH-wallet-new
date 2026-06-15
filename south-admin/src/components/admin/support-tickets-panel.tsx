'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { timeAgo } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Search, Headphones, Ticket, CheckCircle, Loader2 } from 'lucide-react';

interface TicketMessage {
  sender: 'user' | 'support';
  text: string;
  time: string;
  image?: string;
}

interface SupportTicket {
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

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'مفتوح', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  in_progress: { label: 'قيد المتابعة', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  resolved: { label: 'تم الحل', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  closed: { label: 'مغلق', color: '#666', bg: 'rgba(102,102,102,0.12)' },
};

const categoryConfig: Record<string, { label: string; color: string; bg: string }> = {
  technical: { label: 'تقني', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  financial: { label: 'مالي', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  general: { label: 'عام', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
};

export default function SupportTicketsPanel() {
  const { adminUser, showToast } = useAdminStore();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ticketsRef = ref(database, 'support-tickets');
    const unsub = onValue(ticketsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const allTickets = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })) as SupportTicket[];
      allTickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTickets(allTickets);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicketId, tickets]);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || null;

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedTicketId) return;
    try {
      const ticket = tickets.find(t => t.id === selectedTicketId);
      if (!ticket) return;
      const newMsg: TicketMessage = { sender: 'support', text: messageText.trim(), time: new Date().toISOString() };
      const updatedMessages = [...(ticket.messages || []), newMsg];
      await update(ref(database, `support-tickets/${selectedTicketId}`), { messages: updatedMessages });
      try {
        const { sendNotificationToUser } = await import('@/lib/notifications');
        await sendNotificationToUser(ticket.userId, {
          title: 'رد على تذكرتك', body: messageText.trim().substring(0, 100), type: 'info',
          data: { action: 'ticket_reply', ticketId: ticket.id },
        });
      } catch (e) { console.warn('Ticket reply notification failed:', e); }
      setMessageText('');
    } catch (e) { showToast('حدث خطأ في إرسال الرسالة', 'error'); }
  };

  const changeStatus = async (newStatus: SupportTicket['status']) => {
    if (!selectedTicketId) return;
    try {
      await update(ref(database, `support-tickets/${selectedTicketId}`), { status: newStatus });
      showToast('تم تحديث حالة التذكرة', 'success');
    } catch (e) { showToast('حدث خطأ في تحديث الحالة', 'error'); }
  };

  const filtered = tickets.filter(t => {
    const matchesSearch = !search || t.userName?.includes(search) || t.subject?.includes(search) || t.id?.includes(search) || t.message?.includes(search);
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">تذاكر الدعم</h1>
        <p className="text-muted-foreground text-sm mt-1">إدارة ومتابعة تذاكر الدعم الفني</p>
      </div>
      <div className="flex gap-4 h-[calc(100vh-320px)]">
        {/* Tickets List */}
        <div className="w-96 shrink-0 border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث بالاسم أو الموضوع..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10 h-9" />
            </div>
            <div className="flex gap-1 flex-wrap">
              <Badge variant="outline" className={`cursor-pointer text-xs ${filterStatus === 'all' ? 'bg-purple-500/10' : ''}`} onClick={() => setFilterStatus('all')}>الكل ({tickets.length})</Badge>
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <Badge key={key} variant="outline" className={`cursor-pointer text-xs ${filterStatus === key ? 'bg-purple-500/10' : ''}`} onClick={() => setFilterStatus(key as any)}>
                  {cfg.label} ({statusCounts[key as keyof typeof statusCounts]})
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Ticket className="w-10 h-10 mb-2 opacity-30" /><p className="text-sm">لا توجد تذاكر</p>
              </div>
            )}
            {filtered.map((ticket) => {
              const stat = statusConfig[ticket.status] || statusConfig.open;
              const cat = categoryConfig[ticket.category] || categoryConfig.general;
              const lastMsg = ticket.messages?.[ticket.messages.length - 1];
              return (
                <div key={ticket.id} onClick={() => setSelectedTicketId(ticket.id)}
                  className={`p-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${selectedTicketId === ticket.id ? 'bg-purple-500/10' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-xs font-bold text-purple-600 shrink-0">{(ticket.userName || '?')[0]}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{ticket.userName || 'مستخدم'}</p>
                        <p className="text-xs text-muted-foreground truncate">{ticket.subject}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mr-10 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: stat.bg, color: stat.color }}>{stat.label}</span>
                    {lastMsg && <span className="text-[10px] text-muted-foreground truncate flex-1 text-left">{lastMsg.sender === 'support' ? 'الدعم: ' : ''}{lastMsg.text}</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 mr-10">{timeAgo(ticket.createdAt)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ticket Detail / Chat Area */}
        <div className="flex-1 border border-border rounded-xl flex flex-col">
          {selectedTicket ? (
            <>
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Ticket className="w-5 h-5 text-purple-500 shrink-0" />
                    <span className="font-medium text-sm truncate">{selectedTicket.subject}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: categoryConfig[selectedTicket.category]?.bg, color: categoryConfig[selectedTicket.category]?.color }}>{categoryConfig[selectedTicket.category]?.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={selectedTicket.status} onValueChange={(val) => changeStatus(val as SupportTicket['status'])}>
                      <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([key, cfg]) => (
                          <SelectItem key={key} value={key}><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />{cfg.label}</span></SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>المستخدم: {selectedTicket.userName}</span><span>•</span><span>{timeAgo(selectedTicket.createdAt)}</span><span>•</span><span>ID: {selectedTicket.id}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                <div className="flex justify-end">
                  <div className="max-w-[75%]">
                    <div className="bg-muted text-foreground rounded-2xl rounded-bl-sm p-3 text-sm">
                      {selectedTicket.image && <img src={selectedTicket.image} alt="" className="rounded-lg max-h-40 mb-2" />}
                      <p>{selectedTicket.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{timeAgo(selectedTicket.createdAt)}</p>
                    </div>
                  </div>
                </div>
                {(selectedTicket.messages || []).slice(1).map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'support' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${msg.sender === 'support' ? 'bg-purple-600/20 text-foreground rounded-bl-sm' : 'bg-muted text-foreground rounded-br-sm'}`}>
                      {msg.sender === 'support' && <div className="flex items-center gap-1.5 mb-1"><Headphones className="w-3 h-3 text-purple-500" /><span className="text-xs text-purple-500 font-medium">فريق الدعم</span></div>}
                      {msg.image && <img src={msg.image} alt="" className="rounded-lg max-h-40 mb-2" />}
                      <p>{msg.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">{msg.time ? timeAgo(msg.time) : ''}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' ? (
                <div className="p-3 border-t border-border flex gap-2">
                  <Input placeholder="اكتب ردك..." value={messageText} onChange={(e) => setMessageText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} className="flex-1" />
                  <Button onClick={sendMessage} size="icon" disabled={!messageText.trim()}><Send className="w-4 h-4" /></Button>
                </div>
              ) : (
                <div className="p-3 border-t border-border flex items-center justify-center gap-2 text-muted-foreground text-sm">
                  <CheckCircle className="w-4 h-4" /><span>هذه التذكرة {statusConfig[selectedTicket.status]?.label}. غيّر الحالة للرد.</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center"><Ticket className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>اختر تذكرة للبدء</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
