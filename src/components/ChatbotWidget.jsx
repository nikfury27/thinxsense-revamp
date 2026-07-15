import React, { useState, useEffect, useRef } from 'react';

// Simple session helper to retrieve or generate a unique session ID
const getOrCreateSessionId = () => {
  let sessionId = localStorage.getItem('thinxsense_chat_session_id');
  if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem('thinxsense_chat_session_id', sessionId);
  }
  return sessionId;
};

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [chatMode, setChatMode] = useState('BOT'); // 'BOT' | 'HUMAN'
  const [queuePosition, setQueuePosition] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  
  const sessionId = getOrCreateSessionId();
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Load chat history & establish WebSocket connection
  useEffect(() => {
    // 1. Fetch persistent history from backend
    fetch(`/api/support/messages/${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.messages && data.messages.length > 0) {
          // Sort loaded history chronologically
          const sorted = [...data.messages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          setMessages(sorted);
          
          const lastMsg = sorted[sorted.length - 1];
          if (lastMsg.sender === 'AGENT') {
            setChatMode('HUMAN');
          }
        } else {
          // Send initial greeting if history is empty
          const initialGreeting = {
            id: 'init',
            session_id: sessionId,
            sender: 'BOT',
            text: "Hello! I'm thinxsense Bot 🤖. How can I help you today?\n\nChoose one of these options by typing its number or description:\n1️⃣ *Check System Health* (Sensors & Gateways overview)\n2️⃣ *List Active Alerts* (Active cold room excursions)\n3️⃣ *Locate a Sensor* (Check specific sensor metrics)\n\nOr click the *Speak to a Human* button to escalate to WhatsApp Support.",
            timestamp: new Date().toISOString()
          };
          setMessages([initialGreeting]);
        }
      })
      .catch(err => console.error('Error fetching chat history:', err));

    // Fetch active session mode
    fetch(`/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, message: 'hello_init_silent_check_mode_123' }) // Silent trigger
    })
      .then(res => res.json())
      .then(data => {
        if (data.session) {
          setChatMode(data.session.mode);
        }
        if (data.queuePosition) {
          setQueuePosition(data.queuePosition);
        }
      })
      .catch(() => {});

    // 2. Setup WebSocket Connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?session_id=${sessionId}&role=client`;
    
    const connectWS = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected to chat backend');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('[WS Client] Message received:', data);

        if (data.type === 'message') {
          setMessages(prev => {
            // Avoid duplicate messages by checking ID
            if (prev.some(m => m.id === data.message.id)) return prev;
            return [...prev, data.message].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          });
          if (data.mode) setChatMode(data.mode);
          if (data.queuePosition !== undefined) setQueuePosition(data.queuePosition);
        } else if (data.type === 'session_assigned') {
          setChatMode('HUMAN');
          setQueuePosition(0);
          if (data.message) {
            setMessages(prev => {
              if (prev.some(m => m.id === data.message.id)) return prev;
              return [...prev, data.message].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            });
          }
        } else if (data.type === 'session_ended') {
          setChatMode('BOT');
          setQueuePosition(0);
          if (data.message) {
            setMessages(prev => {
              if (prev.some(m => m.id === data.message.id)) return prev;
              return [...prev, data.message].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            });
          }
        }
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected from chat backend, retrying in 3s...');
        setIsConnected(false);
        setTimeout(connectWS, 3000);
      };

      ws.onerror = (err) => {
        console.error('[WS] Socket error:', err);
      };
    };

    connectWS();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sessionId]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue.trim();
    if (!text) return;

    if (!textToSend) {
      setInputValue('');
    }

    // Pessimistically append message to client history to ensure UI responsiveness
    const tempUserMsg = {
      id: 'temp_' + Date.now(),
      session_id: sessionId,
      sender: 'USER',
      text: text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: text })
      });
      const data = await response.json();

      // Replace temp user message with actual server message and append bot response
      setMessages(prev => {
        const filtered = prev.filter(m => !m.id.startsWith('temp_'));
        const nextMsgs = [...filtered];

        // 1. Add server's user message
        if (data.userMessage) {
          const hasUserMsg = nextMsgs.some(m => m.id === data.userMessage.id);
          if (!hasUserMsg) {
            nextMsgs.push(data.userMessage);
          }
        } else {
          const hasUserMsg = nextMsgs.some(m => m.text === text && m.sender === 'USER');
          if (!hasUserMsg) {
            nextMsgs.push({
              id: 'fallback_user_' + Date.now(),
              session_id: sessionId,
              sender: 'USER',
              text: text,
              timestamp: new Date().toISOString()
            });
          }
        }

        // 2. Add bot reply text
        if (data.message) {
          const hasBotMsg = nextMsgs.some(m => m.text === data.message && m.sender === 'BOT');
          if (!hasBotMsg) {
            nextMsgs.push({
              id: 'fallback_bot_' + Date.now(),
              session_id: sessionId,
              sender: 'BOT',
              text: data.message,
              timestamp: new Date().toISOString()
            });
          }
        }

        // 3. Sort all messages chronologically
        return nextMsgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      });

      if (data.mode) setChatMode(data.mode);
      if (data.queuePosition !== undefined) setQueuePosition(data.queuePosition);
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleEscalateToHuman = async () => {
    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, action: 'ESCALATE_TO_HUMAN' })
      });
      const data = await response.json();
      
      setChatMode('HUMAN');
      if (data.queuePosition !== undefined) {
        setQueuePosition(data.queuePosition);
      }

      const escalationBotMsg = {
        id: 'esc_' + Date.now(),
        session_id: sessionId,
        sender: 'BOT',
        text: data.message || 'Connecting you to a human agent on WhatsApp...',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => {
        if (prev.some(m => m.text === escalationBotMsg.text)) return prev;
        return [...prev, escalationBotMsg];
      });
    } catch (err) {
      console.error('Error escalating chat:', err);
    }
  };

  // Format message text for markdown formatting (newlines, lists, and bold strings)
  const formatMessageText = (text) => {
    if (!text) return '';
    return text.split('\n').map((line, idx) => {
      let formattedLine = line;
      // Handle bold mapping e.g. *text* to <strong>text</strong>
      const boldRegex = /\*([^*]+)\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(line)) !== null) {
        // Append text before match
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        // Append bolded match
        parts.push(<strong key={match.index} className="font-extrabold">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      return (
        <span key={idx} className="block min-h-[4px]">
          {parts.length > 0 ? parts : formattedLine}
        </span>
      );
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      {/* Expanded Chat Dialog */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] bg-white border border-outline-variant/60 rounded-2xl shadow-2xl flex flex-col mb-4 overflow-hidden animate-fadeIn transition-all duration-300 transform scale-100 origin-bottom-right">
          {/* Dialog Header */}
          <div className="px-5 py-4 bg-primary text-white flex items-center justify-between shadow-md relative overflow-hidden shrink-0">
            <div className="absolute left-0 top-0 w-32 h-full opacity-30 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 0% 50%, #b7c4ff, transparent)' }} />
            
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center border border-white/10 shadow-inner">
                <span className="material-symbols-outlined text-[20px] text-white">support_agent</span>
              </div>
              <div>
                <h3 className="font-headline-md font-bold text-[15px] leading-tight">thinxsense Support</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${chatMode === 'HUMAN' ? (queuePosition > 0 ? 'bg-orange-400' : 'bg-status-green') : 'bg-status-green'} animate-pulse`} />
                  <p className="text-[10px] text-white/80 font-semibold uppercase tracking-wider">
                    {chatMode === 'HUMAN' ? (queuePosition > 0 ? `Queue Pos #${queuePosition}` : 'Live WhatsApp Agent Connected') : 'Conversational Bot'}
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all relative z-10"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-surface-container-lowest space-y-3 custom-scrollbar flex flex-col">
            {messages.map((msg, index) => {
              const isUser = msg.sender === 'USER';
              const isBot = msg.sender === 'BOT';
              const isAgent = msg.sender === 'AGENT';
              
              // Skip rendering internal dummy check messages
              if (msg.text === 'hello_init_silent_check_mode_123') return null;

              return (
                <div 
                  key={msg.id || index}
                  className={`flex flex-col max-w-[82%] ${isUser ? 'self-end items-end' : 'self-start items-start'}`}
                >
                  {/* Sender label */}
                  {!isUser && (
                    <span className="text-[9px] text-secondary font-bold mb-1 ml-1 uppercase tracking-wider">
                      {isBot ? 'Bot' : 'Support Agent'}
                    </span>
                  )}
                  {/* Bubble */}
                  <div 
                    className={`px-4 py-2.5 rounded-2xl shadow-sm text-xs font-body-md leading-relaxed ${
                      isUser 
                        ? 'bg-primary text-white rounded-br-none' 
                        : isAgent
                        ? 'bg-surface-variant text-on-surface rounded-bl-none border border-primary-fixed-dim/40'
                        : 'bg-secondary-container text-on-surface rounded-bl-none border border-outline-variant/30'
                    }`}
                  >
                    {formatMessageText(msg.text)}
                  </div>
                  {/* Timestamp */}
                  <span className="text-[9px] text-secondary/60 mt-1 mx-1 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Interactive Guided Buttons (Only shown if mode is BOT) */}
          {chatMode === 'BOT' && (
            <div className="px-4 py-2 bg-surface-container-low border-t border-outline-variant/30 flex flex-wrap gap-1.5 justify-center shrink-0">
              <button 
                onClick={() => handleSendMessage('1')}
                className="px-2.5 py-1 bg-white hover:bg-primary/5 text-primary border border-primary/20 hover:border-primary/40 rounded-full text-[10px] font-semibold transition-all active:scale-95 shadow-sm"
              >
                📊 System Health
              </button>
              <button 
                onClick={() => handleSendMessage('2')}
                className="px-2.5 py-1 bg-white hover:bg-primary/5 text-primary border border-primary/20 hover:border-primary/40 rounded-full text-[10px] font-semibold transition-all active:scale-95 shadow-sm"
              >
                🚨 Active Alerts
              </button>
              <button 
                onClick={() => handleSendMessage('3')}
                className="px-2.5 py-1 bg-white hover:bg-primary/5 text-primary border border-primary/20 hover:border-primary/40 rounded-full text-[10px] font-semibold transition-all active:scale-95 shadow-sm"
              >
                📍 Find Sensor
              </button>
              <button 
                onClick={handleEscalateToHuman}
                className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full text-[10px] font-bold transition-all active:scale-95 shadow-sm"
              >
                👤 Speak to a Human
              </button>
            </div>
          )}

          {/* Queue Status Alert Panel */}
          {chatMode === 'HUMAN' && queuePosition > 0 && (
            <div className="px-4 py-2.5 bg-orange-50 border-t border-orange-200 text-orange-800 text-[11px] font-semibold flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 animate-pulse">
                <span className="material-symbols-outlined text-[16px] text-orange-600">hourglass_empty</span>
                <span>Queued: You are #{queuePosition} in line.</span>
              </div>
              <button 
                onClick={() => handleSendMessage('/end')} 
                className="text-[9px] uppercase font-bold text-orange-700 hover:text-orange-950 underline"
              >
                Cancel Request
              </button>
            </div>
          )}

          {/* Live agent disconnect option */}
          {chatMode === 'HUMAN' && queuePosition === 0 && (
            <div className="px-4 py-1.5 bg-status-success/10 border-t border-status-success/20 text-status-success text-[10px] font-semibold flex justify-between items-center shrink-0">
              <span>Connected to support representative</span>
              <button 
                onClick={() => handleSendMessage('/end')} 
                className="text-[9px] font-bold text-error hover:underline uppercase"
                title="End WhatsApp live chat session and return to automated bot"
              >
                End Chat
              </button>
            </div>
          )}

          {/* Message Input Form */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-outline-variant/60 flex items-center gap-2 shrink-0"
          >
            <input 
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={chatMode === 'HUMAN' && queuePosition > 0 ? "You are queued. Messages will send when connected..." : "Type your message..."}
              disabled={chatMode === 'HUMAN' && queuePosition > 0}
              className="flex-1 bg-surface-container-low px-4 py-2.5 rounded-full text-xs font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/40 transition-all placeholder:text-secondary/50"
            />
            <button 
              type="submit"
              disabled={!inputValue.trim() || (chatMode === 'HUMAN' && queuePosition > 0)}
              className="w-9 h-9 rounded-full bg-primary hover:bg-primary/95 text-white flex items-center justify-center transition-all disabled:opacity-40 active:scale-90 shrink-0 shadow-md"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>
      )}

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-primary hover:bg-primary/95 text-white flex items-center justify-center shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none relative group border border-white/10"
      >
        <span className={`material-symbols-outlined text-[26px] transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}>
          {isOpen ? 'close' : 'chat_bubble'}
        </span>
        {/* Unread Alert Indicator (Blink animation) */}
        {!isOpen && chatMode === 'HUMAN' && queuePosition === 0 && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-status-success rounded-full border-2 border-white animate-pulse" />
        )}
      </button>
    </div>
  );
};

export default ChatbotWidget;
