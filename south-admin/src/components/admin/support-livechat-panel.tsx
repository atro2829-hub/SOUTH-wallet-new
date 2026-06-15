'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, push, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { timeAgo } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Search, MessageCircle, CheckCircle, XCircle, Headphones, Loader2 } from 'lucide-react';

interface LiveChatMessage {
  id: string;
  sender: 'user' | 'admin';
  text: string;
  type?: string;
  time: string;
  isRead?: boolean;
  adminName?: string;
  imageUrl?: string;
}

interface LiveConversation {
  userId: string;
  userName?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadAdmin?: number;
  unreadUser?: number;
  status?: string;
}

export default function SupportLiveChatPanel() {
  const { adminUser, showToast } = useAdminStore();
  const [conversations, setConversations] = useState<(LiveConversation & { userId: string })[]>([]);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('all');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chatRef = ref(database, 'supportChat');
    const unsub = onValue(chatRef, (snapshot) => {
      const data = snapshot.val() || {};
      const convs = Object.entries(data).map(([userId, val]: [string, any]) => ({
        userId,
        userName: val.userName || 'مستخدم',
        lastMessage: val.lastMessage || '',
        lastMessageTime: val.lastMessageTime || '',
        unreadAdmin: val.unreadAdmin || 0,
        unreadUser: val.unreadUser || 0,
        status: val.status || 'open',
      }));
      convs.sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());
      setConversations(convs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    const msgRef = ref(database, `supportChat/${selectedUserId}/messages`);
    const unsub = onValue(msgRef, (snapshot) => {
      const data = snapshot.val() || {};
      const msgs = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })) as LiveChatMessage[];
      msgs.sort((a, b) => new Date(a.time || 0).getTime() - new Date(b.time || 0).getTime());
      setMessages(msgs);
      update(ref(database, `supportChat/${selectedUserId}`), { unreadAdmin: 0 }).catch(() => {});
    });
    return () => unsub();
  }, [selectedUserId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedUserId) return;
    const replyText = messageText.trim();
    try {
      await push(ref(database, `supportChat/${selectedUserId}/messages`), {
        sender: 'admin', text: replyText, type: 'text', time: new Date().toISOString(),
        isRead: false, adminName: adminUser?.displayName || 'المدير',
      });
      const currentUnreadUser = conversations.find(c => c.userId === selectedUserId)?.unreadUser || 0;
      await update(ref(database, `supportChat/${selectedUserId}`), {
        lastMessage: replyText, lastMessageTime: new Date().toISOString(), unreadUser: currentUnreadUser + 1,
      });
      try {
        const { sendNotificationToUser } = await import('@/lib/notifications');
        await sendNotificationToUser(selectedUserId, {
          title: 'رسالة جديدة من الدعم الفني', body: replyText.substring(0, 50), type: 'info',
          data: { action: 'support_chat', userId: selectedUserId },
        });
      } catch (e) { console.warn('Chat notification failed:', e); }
      setMessageText('');
    } catch (e) { showToast('حدث خطأ في إرسال الرسالة', 'error'); }
  };

  const resolveConversation = async () => {
    if (!selectedUserId) return;
    try {
      await update(ref(database, `supportChat/${selectedUserId}`), {
        status: 'resolved', resolvedAt: new Date().toISOString(), resolvedBy: adminUser?.displayName || 'المدير',
      });
      try {
        const { sendNotificationToUser } = await import('@/lib/notifications');
        await sendNotificationToUser(selectedUserId, {
          title: 'تم إغلاق المحادثة', body: 'تم حل مشكلتك. شكراً لتواصلك معنا!', type: 'info',
          data: { action: 'chat_status', status: 'resolved', userId: selectedUserId },
        });
      } catch (e) { console.warn('Chat status notification failed:', e); }
      showToast('تم إغلاق المحادثة', 'success');
    } catch (e) { showToast('حدث خطأ', 'error'); }
  };

  const reopenConversation = async () => {
    if (!selectedUserId) return;
    try {
      await update(ref(database, `supportChat/${selectedUserId}`), { status: 'open', resolvedAt: null, resolvedBy: null });
      try {
        const { sendNotificationToUser } = await import('@/lib/notifications');
        await sendNotificationToUser(selectedUserId, {
          title: 'تم إعادة فتح المحادثة', body: 'تم إعادة فتح محادثتك مع الدعم الفني', type: 'info',
          data: { action: 'chat_status', status: 'reopened', userId: selectedUserId },
        });
      } catch (e) { console.warn('Chat status notification failed:', e); }
      showToast('تم إعادة فتح المحادثة', 'success');
    } catch (e) { showToast('حدث خطأ', 'error'); }
  };

  const selectedConv = conversations.find(c => c.userId === selectedUserId);
  const filtered = conversations.filter(c => {
    const matchesSearch = !search || c.userName?.includes(search) || c.lastMessage?.includes(search) || c.userId?.includes(search);
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });
  const openChats = conversations.filter(c => c.status === 'open').length;
  const resolvedChats = conversations.filter(c => c.status === 'resolved').length;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">المحادثات المباشرة</h1>
        <p className="text-muted-foreground text-sm mt-1">الدردشة المباشرة مع المستخدمين في الوقت الفعلي</p>
      </div>
      <div className="flex gap-4 h-[calc(100vh-320px)]">
        {/* Conversations List */}
        <div className="w-80 shrink-0 border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10 h-9" />
            </div>
            <div className="flex gap-1">
              <Badge variant="outline" className={`cursor-pointer ${filterStatus === 'all' ? 'bg-purple-500/10' : ''}`} onClick={() => setFilterStatus('all')}>الكل ({conversations.length})</Badge>
              <Badge variant="outline" className={`cursor-pointer ${filterStatus === 'open' ? 'bg-green-500/10' : ''}`} onClick={() => setFilterStatus('open')}>نشطة ({openChats})</Badge>
              <Badge variant="outline" className={`cursor-pointer ${filterStatus === 'resolved' ? 'bg-gray-500/10' : ''}`} onClick={() => setFilterStatus('resolved')}>مغلقة ({resolvedChats})</Badge>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageCircle className="w-10 h-10 mb-2 opacity-30" /><p className="text-sm">لا توجد محادثات</p>
              </div>
            )}
            {filtered.map((conv) => (
              <div key={conv.userId} onClick={() => setSelectedUserId(conv.userId)}
                className={`p-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${selectedUserId === conv.userId ? 'bg-purple-500/10' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-xs font-bold text-purple-600">{(conv.userName || '?')[0]}</div>
                    <div>
                      <p className="text-sm font-medium">{conv.userName || 'مستخدم'}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-40">{conv.lastMessage || ''}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {conv.unreadAdmin > 0 && <Badge className="bg-red-500 text-white text-xs h-5 min-w-5">{conv.unreadAdmin}</Badge>}
                    <Badge className={conv.status === 'open' ? 'bg-green-500/20 text-green-600 text-xs' : 'bg-gray-500/20 text-gray-500 text-xs'}>
                      {conv.status === 'open' ? 'نشط' : 'مغلق'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area - Full width centered chat */}
        <div className="flex-1 border border-border rounded-xl flex flex-col">
          {selectedUserId ? (
            <>
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-purple-500" />
                  <span className="font-medium text-sm">{selectedConv?.userName || 'مستخدم'}</span>
                  <Badge className={selectedConv?.status === 'open' ? 'bg-green-500/20 text-green-600 text-xs' : 'bg-gray-500/20 text-gray-500 text-xs'}>
                    {selectedConv?.status === 'open' ? 'نشطة' : 'مغلقة'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {selectedConv?.status === 'open' ? (
                    <Button variant="outline" size="sm" onClick={resolveConversation}><CheckCircle className="w-4 h-4 ml-1" /> إغلاق المحادثة</Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={reopenConversation}><XCircle className="w-4 h-4 ml-1" /> إعادة فتح</Button>
                  )}
                </div>
              </div>
              {/* Messages area - centered and properly displayed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin flex flex-col">
                <div className="max-w-2xl mx-auto w-full space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                        msg.sender === 'admin' ? 'bg-purple-600/20 text-foreground rounded-bl-sm' : 'bg-muted text-foreground rounded-br-sm'
                      }`}>
                        {msg.sender === 'admin' && msg.adminName && (
                          <div className="flex items-center gap-1.5 mb-1"><Headphones className="w-3 h-3 text-purple-500" /><span className="text-xs text-purple-500 font-medium">{msg.adminName}</span></div>
                        )}
                        {msg.type === 'image' && msg.imageUrl ? <img src={msg.imageUrl} alt="" className="rounded-lg max-h-40 mb-1" /> : null}
                        <p>{msg.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">{msg.time ? timeAgo(msg.time) : ''}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </div>
              {selectedConv?.status === 'open' ? (
                <div className="p-3 border-t border-border flex gap-2 max-w-2xl mx-auto w-full">
                  <Input placeholder="اكتب رسالة..." value={messageText} onChange={(e) => setMessageText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} className="flex-1" />
                  <Button onClick={sendMessage} size="icon" disabled={!messageText.trim()}><Send className="w-4 h-4" /></Button>
                </div>
              ) : (
                <div className="p-3 border-t border-border flex items-center justify-center gap-2 text-muted-foreground text-sm">
                  <CheckCircle className="w-4 h-4" /><span>هذه المحادثة مغلقة. اضغط إعادة فتح للرد.</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center"><MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>اختر محادثة للبدء</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
