import React, { useEffect, useState, useRef } from 'react';
import { apiRequest } from '../api';
import {
  Smartphone,
  X,
  Send,
  RotateCcw,
  Bot,
  User,
  Coins,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
  keyboard?: {
    inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
  };
}

interface BotEmulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BotEmulatorModal({ isOpen, onClose }: BotEmulatorModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      handleSendText('/start');
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!isOpen) return null;

  const handleSendText = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setSending(true);

    try {
      const res = await apiRequest<{ success: boolean; result: any; mainMenu: any }>('/admin/emulator/send', {
        method: 'POST',
        body: JSON.stringify({ text, user_id: 99887766 })
      });

      const replyText = res.result?.replyText || 'Command processed.';
      const botMsg: ChatMessage = {
        id: `b_${Date.now()}`,
        sender: 'bot',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        keyboard: res.mainMenu
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'bot',
          text: `⚠️ Error: ${err.message}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleCallbackClick = async (callbackData?: string, url?: string) => {
    if (url) {
      window.open(url, '_blank');
      return;
    }
    if (!callbackData) return;

    setSending(true);
    try {
      const res = await apiRequest<{ success: boolean; result: any; mainMenu: any }>('/admin/emulator/send', {
        method: 'POST',
        body: JSON.stringify({ callback_data: callbackData, user_id: 99887766 })
      });

      const replyText = res.result?.replyText || 'Action executed';
      const botMsg: ChatMessage = {
        id: `b_${Date.now()}`,
        sender: 'bot',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'bot',
          text: `⚠️ Callback Error: ${err.message}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    handleSendText('/start');
  };

  // Main menu keyboard buttons
  const mainKeyboard = [
    [{ text: '🎬 Bᴜʏ Vɪᴅᴇᴏs', callback_data: 'menu_buy_videos' }],
    [
      { text: '🆓 Fʀᴇᴇ Vɪᴅᴇᴏs', callback_data: 'menu_free_videos' },
      { text: '💰 Mʏ Bᴀʟᴀɴᴄᴇ', callback_data: 'menu_my_balance' }
    ],
    [
      { text: '⭐ Bᴜʏ Sᴛᴀʀs', callback_data: 'menu_buy_stars' },
      { text: '📺 Cʜᴀɴɴᴇʟs', callback_data: 'menu_channels' }
    ],
    [
      { text: '📁 Fɪʟᴇs', callback_data: 'menu_files' },
      { text: '🏪 Eɴᴛᴇʀ Sᴛᴏʀᴇ', url: 'https://etebox.com/store' }
    ],
    [
      { text: '🤖 Bᴀᴄᴋᴜᴘ Bᴏᴛ', url: 'https://t.me/EteboxBackupBot' },
      { text: '👥 Rᴇғᴇʀʀᴀʟ', callback_data: 'menu_refer_earn' }
    ],
    [{ text: '🎮 Gᴀᴍᴇs', callback_data: 'menu_games' }]
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      {/* Mobile Device Frame */}
      <div className="bg-slate-900 border-4 border-slate-800 rounded-[36px] max-w-sm w-full h-[680px] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Phone Notch & Header */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
              E
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">ETEBOX Bot</p>
              <p className="text-[10px] text-emerald-400 font-medium leading-none">bot emulator</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleReset}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title="Restart /start"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title="Close Emulator"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat History Body */}
        <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-950/70 text-xs">
          {messages.map(m => {
            const isBot = m.sender === 'bot';
            return (
              <div key={m.id} className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl p-3 leading-relaxed shadow-sm ${
                    isBot
                      ? 'bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-sm'
                      : 'bg-indigo-600 text-white rounded-tr-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <span className="block text-[9px] text-right mt-1 opacity-50">{m.time}</span>
                </div>
              </div>
            );
          })}
          {sending && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span>ETEBOX Bot is typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* PERSISTENT TELEGRAM INLINE KEYBOARD (EXACT REQUIRED LAYOUT) */}
        <div className="bg-slate-900 border-t border-slate-800 p-2.5 space-y-1.5">
          <div className="text-[10px] font-semibold text-slate-400 text-center tracking-wider uppercase mb-1">
            Telegram Inline Menu
          </div>

          {mainKeyboard.map((row, rIdx) => (
            <div
              key={rIdx}
              className={`grid gap-1.5 ${row.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}
            >
              {row.map((btn, bIdx) => (
                <button
                  key={bIdx}
                  onClick={() => handleCallbackClick(btn.callback_data, btn.url)}
                  disabled={sending}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition cursor-pointer text-center truncate shadow-sm ${
                    btn.text.includes('Bᴜʏ Vɪᴅᴇᴏs')
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-indigo-600/20'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60'
                  }`}
                >
                  {btn.text}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendText();
          }}
          className="bg-slate-950 p-2 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Type message or /redeem CODE..."
            className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={sending || !inputText.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
