import { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../api';
import {
  Smartphone,
  X,
  Send,
  Bot,
  User,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface BotEmulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  botUsername?: string;
  botFirstName?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  replyMarkup?: any;
  timestamp: string;
}

export default function BotEmulatorModal({
  isOpen,
  onClose,
  botUsername = 'EteboxBot',
  botFirstName = 'ETEBOX Bot'
}: BotEmulatorModalProps) {
  const [testUserId, setTestUserId] = useState('88991122');
  const [testFirstName, setTestFirstName] = useState('Test User');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeReplyKeyboard, setActiveReplyKeyboard] = useState<string[][]>([
    ['🎬 Bᴜʏ Vɪᴅᴇᴏs'],
    ['🆓 Fʀᴇᴇ 1 Vɪᴅᴇᴏs', '💰 Mʏ Bᴀʟᴀɴᴄᴇ'],
    ['⭐ Bᴜʏ Sᴛᴀʀs', '📺 Cʜᴀɴɴᴇʟs'],
    ['📁 Fɪʟᴇs', '🛒 Eɴᴛᴇʀ Sᴛᴏʀᴇ'],
    ['🔄 Bᴀᴄᴋᴜᴘ Bᴏᴛ', '👥 Rᴇғᴇʀ & Eᴀʀɴ'],
    ['🎮 Gᴀᴍᴇs']
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial /start on modal open if messages empty
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      handleSendMessage('/start');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await apiRequest('/bot-emulator/message', {
        method: 'POST',
        body: JSON.stringify({
          userId: testUserId,
          text,
          firstName: testFirstName,
          username: testFirstName.toLowerCase().replace(/\s+/g, '')
        })
      });

      const botMsg: ChatMessage = {
        id: 'bot_msg_' + Date.now(),
        sender: 'bot',
        text: res.text,
        replyMarkup: res.replyMarkup,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);

      // If reply markup contains persistent reply keyboard, update activeReplyKeyboard
      if (res.replyMarkup?.keyboard) {
        const rows = res.replyMarkup.keyboard.map((row: any[]) => row.map((btn) => btn.text));
        setActiveReplyKeyboard(rows);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          sender: 'bot',
          text: '❌ Something went wrong. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCallbackClick = async (data: string) => {
    setLoading(true);
    try {
      const res = await apiRequest('/bot-emulator/callback', {
        method: 'POST',
        body: JSON.stringify({
          userId: testUserId,
          data
        })
      });

      const botMsg: ChatMessage = {
        id: 'bot_cb_' + Date.now(),
        sender: 'bot',
        text: res.text,
        replyMarkup: res.replyMarkup,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    handleSendMessage('/start');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md h-[95vh] sm:h-[820px] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Phone Frame Header */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                <span>{botFirstName}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className="text-[11px] text-slate-400">@{botUsername} • bot</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleResetChat}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Reset conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Close emulator"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Test User Switcher bar */}
        <div className="bg-slate-900/90 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1">
            <span>Simulating User ID:</span>
            <input
              type="text"
              value={testUserId}
              onChange={(e) => setTestUserId(e.target.value)}
              className="w-24 px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-indigo-300 font-mono"
            />
          </div>
          <span className="text-emerald-400 font-medium">Real Backend Connected</span>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/70">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs sm:text-sm whitespace-pre-wrap ${
                  m.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20'
                    : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/60'
                }`}
              >
                {m.text}

                {/* Inline Keyboard Buttons */}
                {m.replyMarkup?.inline_keyboard && (
                  <div className="mt-2.5 pt-2 border-t border-slate-700/60 space-y-1.5">
                    {m.replyMarkup.inline_keyboard.map((row: any[], rIdx: number) => (
                      <div key={rIdx} className="flex flex-wrap gap-1.5">
                        {row.map((btn, bIdx) => (
                          btn.url ? (
                            <a
                              key={bIdx}
                              href={btn.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 text-center py-1.5 px-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                            >
                              <span>{btn.text}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <button
                              key={bIdx}
                              onClick={() => handleCallbackClick(btn.callback_data)}
                              className="flex-1 text-center py-1.5 px-2 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white rounded-lg text-xs font-medium transition cursor-pointer"
                            >
                              {btn.text}
                            </button>
                          )
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 italic p-1">
              <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
              <span>Bot is typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Telegram Reply Keyboard Area (The 9 Main Buttons in Exact Order) */}
        <div className="bg-slate-900 border-t border-slate-800 p-2.5 space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-1 flex items-center justify-between">
            <span>Main Menu Keyboard</span>
            <span className="text-[10px] text-indigo-400">Official Order</span>
          </div>

          <div className="space-y-1">
            {activeReplyKeyboard.map((row, rIdx) => (
              <div key={rIdx} className="grid grid-cols-2 gap-1.5">
                {row.map((btnText, bIdx) => (
                  <button
                    key={bIdx}
                    onClick={() => handleSendMessage(btnText)}
                    className={`py-2 px-2 text-xs font-medium rounded-xl border transition active:scale-95 cursor-pointer truncate ${
                      row.length === 1 ? 'col-span-2' : ''
                    } ${
                      btnText.includes('FREE 1 VIDEOS')
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
                        : btnText.includes('Buy Stars')
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                        : 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {btnText}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Text Input Row */}
        <div className="bg-slate-950 p-3 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage(inputText);
            }}
            placeholder="Type a message or /redeem CODE..."
            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => handleSendMessage(inputText)}
            disabled={!inputText.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
