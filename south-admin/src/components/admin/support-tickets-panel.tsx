'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { ref, onValue, update, push } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { timeAgo, cn, generateId } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Headphones, Ticket, CheckCircle, Loader2, Clock, AlertTriangle, User, MessageSquare, Send, XCircle, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt?: string;
}

const statusMap: Record<string, { label: string; color: string }> = {
  open: { label: 'مفتوح', color: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' },
  in_progress: { label: 'قيد المعالجة', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  resolved: { label: 'تم الحل', color: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  closed: { label: 'مغلق', color: 'bg-gray-500/15 text-gray-600 dark:text-gray-400' },
};

const priorityMap: Record<string, { label: string; color: string }> = {
  low: { label: 'منخفض', color: 'bg-gray-500/15 text-gray-500' },
  medium: { label: 'متوسط', color: 'bg-yellow-500/15 text-yellow-600' },
  high: { label: 'عالي', color: 'bg-orange-500/15 text-orange-600' },
  urgent: { label: 'عاجل', color: 'bg-red-500/15 text-red-600' },
};

export default function SupportTicketsPanel() {
  const { adminUser, showToast } = useAdminStore();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ticketsRef = ref(database, 'supportTickets');
    const unsub = onValue(ticketsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: SupportTicket[] = Object.entries(data).map(([key, val]: [string, any]) => ({
        id: key,
        userId: val.userId || '',
        userName: val.userName || 'مستخدم',
        subject: val.subject || '',
        message: val.message || '',
        category: val.category || 'general',
        status: val.status || 'open',
        priority: val.priority || 'medium',
        assignedTo: val.assignedTo || '',
        messages: val.messages || [],
        createdAt: val.createdAt || new Date().toISOString(),
        updatedAt: val.updatedAt || '',
      }));
      list.sort((a, b) => {
        const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        const sOrder = { open: 0, in_progress: 1, resolved: 2, closed: 3 };
        if (sOrder[a.status] !== sOrder[b.status]) return sOrder[a.status] - sOrder[b.status];
        if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setTickets(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      const ms = !search || t.userName.includes(search) || t.subject.includes(search) || t.id.includes(search);
      const mf = statusFilter === 'all' || t.status === statusFilter;
      const mp = priorityFilter === 'all' || t.priority === priorityFilter;
      return ms && mf && mp;
    });
  }, [tickets, search, statusFilter, priorityFilter]);

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    urgent: tickets.filter(t => t.priority === 'urgent').length,
  }), [tickets]);

  const openDetail = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setDetailOpen(true);
    setReplyText('');
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setSending(true);
    try {
      const newMessage: TicketMessage = {
        sender: 'support', text: replyText.trim(), time: new Date().toISOString(),
      };
      const messages = [...(selectedTicket.messages || []), newMessage];
      await update(ref(database, `supportTickets/${selectedTicket.id}`), {
        messages,
        status: 'in_progress',
        updatedAt: new Date().toISOString(),
        assignedTo: adminUser?.uid,
      });
      setReplyText('');
      showToast('تم إرسال الرد', 'success');
    } catch { showToast('حدث خطأ', 'error'); }
    finally { setSending(false); }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return;
    try {
      await update(ref(database, `supportTickets/${selectedTicket.id}`), {
        status: newStatus, updatedAt: new Date().toISOString(),
      });
      showToast('تم تحديث الحالة', 'success');
    } catch { showToast('حدث خطأ', 'error'); }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (!selectedTicket) return;
    try {
      await update(ref(database, `supportTickets/${selectedTicket.id}`), {
        priority: newPriority, updatedAt: new Date().toISOString(),
      });
      showToast('تم تحديث الأولوية', 'success');
    } catch { showToast('حدث خطأ', 'error'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Headphones className="w-7 h-7 text-[#5C1A1B]" />تذاكر الدعم</h1>
        <p className="text-muted-foreground text-sm mt-1">إدارة تذاكر الدعم الفني</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'الإجمالي', value: stats.total, icon: Ticket, color: 'from-[#5C1A1B] to-[#3D0F10]' },
          { label: 'مفتوح', value: stats.open, icon: Clock, color: 'from-yellow-600 to-yellow-800' },
          { label: 'قيد المعالجة', value: stats.inProgress, icon: Loader2, color: 'from-blue-600 to-blue-800' },
          { label: 'تم الحل', value: stats.resolved, icon: CheckCircle, color: 'from-green-600 to-green-800' },
          { label: 'عاجل', value: stats.urgent, icon: AlertTriangle, color: 'from-red-600 to-red-800' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-white', s.color)}><s.icon className="w-4 h-4" /></div>
                  <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-lg font-bold">{s.value}</p></div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]"><div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" /></div></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">كل الحالات</SelectItem><SelectItem value="open">مفتوح</SelectItem><SelectItem value="in_progress">قيد المعالجة</SelectItem><SelectItem value="resolved">تم الحل</SelectItem><SelectItem value="closed">مغلق</SelectItem></SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">كل الأولويات</SelectItem><SelectItem value="urgent">عاجل</SelectItem><SelectItem value="high">عالي</SelectItem><SelectItem value="medium">متوسط</SelectItem><SelectItem value="low">منخفض</SelectItem></SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto scrollbar-thin">
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center"><Headphones className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" /><p className="text-muted-foreground">لا توجد تذاكر</p></CardContent></Card>
          </motion.div>
        ) : (
          filtered.map((ticket, i) => {
            const st = statusMap[ticket.status] || statusMap.open;
            const pr = priorityMap[ticket.priority] || priorityMap.medium;
            return (
              <motion.div key={ticket.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                <Card className={cn('border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer card-press', ticket.priority === 'urgent' && 'ring-1 ring-red-500/30')} onClick={() => openDetail(ticket)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', ticket.priority === 'urgent' ? 'bg-red-500/10' : 'bg-[#5C1A1B]/10')}>
                          <Ticket className={cn('w-5 h-5', ticket.priority === 'urgent' ? 'text-red-500' : 'text-[#5C1A1B]')} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{ticket.subject || 'بدون موضوع'}</p>
                          <p className="text-xs text-muted-foreground">{ticket.userName} • {timeAgo(ticket.createdAt)}</p>
                          {ticket.messages?.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">{ticket.messages.length} رسالة</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge className={cn('text-[9px]', st.color)}>{st.label}</Badge>
                        <Badge className={cn('text-[9px]', pr.color)}>{pr.label}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Ticket className="w-5 h-5 text-[#5C1A1B]" />تفاصيل التذكرة</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              {/* Ticket Info */}
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{selectedTicket.subject}</p>
                  <p className="text-xs text-muted-foreground">{selectedTicket.userName} • {timeAgo(selectedTicket.createdAt)}</p>
                </div>
                <Select value={selectedTicket.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">مفتوح</SelectItem>
                    <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                    <SelectItem value="resolved">تم الحل</SelectItem>
                    <SelectItem value="closed">مغلق</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedTicket.priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفض</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="high">عالي</SelectItem>
                    <SelectItem value="urgent">عاجل</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Messages */}
              <div className="border border-border/30 rounded-xl overflow-hidden">
                <ScrollArea className="max-h-[300px] p-4">
                  <div className="space-y-3">
                    {/* Initial message */}
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0"><User className="w-4 h-4 text-muted-foreground" /></div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">{selectedTicket.userName}</p>
                        <div className="p-3 bg-muted/30 rounded-lg mt-1"><p className="text-sm">{selectedTicket.message}</p></div>
                      </div>
                    </div>
                    {/* Replies */}
                    {(selectedTicket.messages || []).map((msg, i) => (
                      <div key={i} className={cn('flex gap-2', msg.sender === 'support' && 'flex-row-reverse')}>
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', msg.sender === 'support' ? 'bg-[#5C1A1B]/10' : 'bg-muted')}>
                          {msg.sender === 'support' ? <Headphones className="w-4 h-4 text-[#5C1A1B]" /> : <User className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <div className={cn('max-w-[80%]', msg.sender === 'support' && 'text-left')}>
                          <p className={cn('text-xs text-muted-foreground', msg.sender === 'support' && 'text-left')}>{msg.sender === 'support' ? 'الدعم الفني' : selectedTicket.userName}</p>
                          <div className={cn('p-3 rounded-lg mt-1', msg.sender === 'support' ? 'bg-[#5C1A1B]/10' : 'bg-muted/30')}>
                            <p className="text-sm">{msg.text}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(msg.time)}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </div>

              {/* Reply */}
              {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                <div className="flex gap-2">
                  <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="اكتب ردك..." rows={2} className="flex-1" />
                  <Button onClick={handleReply} disabled={sending || !replyText.trim()} className="bg-[#5C1A1B] hover:bg-[#3D0F10] self-end">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              )}

              {/* Quick resolve */}
              {selectedTicket.status === 'in_progress' && (
                <Button variant="outline" onClick={() => handleStatusChange('resolved')} className="w-full text-green-500 border-green-500/30">
                  <CheckCircle className="w-4 h-4 ml-2" />تحويل إلى تم الحل
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
