import React, { useState, useEffect, useRef } from 'react';

const SupportConsoleView = () => {
  const [activeSessions, setActiveSessions] = useState([]);
  const [queue, setQueue] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // Simulator State
  const [simulatorFrom, setSimulatorFrom] = useState('1234567890'); // without + or whatsapp:
  const [simulatorText, setSimulatorText] = useState('');
  const [simulatorLogs, setSimulatorLogs] = useState([]);

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Fetch session list
  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/support/sessions');
      const data = await res.json();
      setActiveSessions(data.active_sessions || []);
      setQueue(data.queue || []);
      
      // Auto-select first session if none is selected
      if (data.active_sessions?.length > 0 && !selectedSessionId) {
        setSelectedSessionId(data.active_sessions[0].session_id);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  // Fetch messages for selected session
  const fetchMessages = async (sessId) => {
    if (!sessId) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/support/messages/${sessId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Setup WebSockets connection
  useEffect(() => {
    fetchSessions();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?role=support`;
    
    const connectWS = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS Support] Connected to chat backend');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('[WS Support] Received message:', data);

        // Update list on session status changes
        if (data.type === 'session_assigned' || data.type === 'session_ended' || data.type === 'queue_update') {
          fetchSessions();
        }

        // Real-time message streaming
        if (data.type === 'message') {
          // If message is for the currently selected session, append it
          if (data.message.session_id === selectedSessionId) {
            setMessages(prev => {
              if (prev.some(m => m.id === data.message.id)) return prev;
              return [...prev, data.message];
            });
          }
          // Refresh lists to update the "last message" preview text
          fetchSessions();
        }
      };

      ws.onclose = () => {
        console.log('[WS Support] Disconnected, retrying in 3s...');
        setTimeout(connectWS, 3000);
      };
    };

    connectWS();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [selectedSessionId]);

  // Load chat messages when selected session changes
  useEffect(() => {
    fetchMessages(selectedSessionId);
  }, [selectedSessionId]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send reply from agent console
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedSessionId) return;

    const text = replyText;
    setReplyText('');

    try {
      const res = await fetch('/api/support/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: selectedSessionId, text })
      });
      const data = await res.json();
      
      if (data.error) {
        alert(data.error);
        return;
      }

      if (text.trim() === '/end') {
        setSelectedSessionId('');
        setMessages([]);
        fetchSessions();
      } else {
        // Append agent message locally if it hasn't streamed via WS
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        fetchSessions();
      }
    } catch (err) {
      console.error('Error sending reply:', err);
    }
  };

  // Simulate Meta WhatsApp Webhook
  const handleSimulateWebhook = async (textToSend) => {
    const text = textToSend || simulatorText.trim();
    if (!text || !simulatorFrom) return;

    if (!textToSend) {
      setSimulatorText('');
    }

    setLoading(true);
    addLog(`[SIMULATOR] Preparing WhatsApp payload for agent +${simulatorFrom}...`);

    try {
      const response = await fetch('/api/support/simulate-whatsapp-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: simulatorFrom, text })
      });
      const data = await response.json();

      addLog(`[SIMULATOR] POST /webhooks/whatsapp -> HTTP ${response.status}`);
      addLog(`[SIGNATURE] Generated Signature Header: ${data.signature}`);
      addLog(`[RESPONSE BODY] ${data.response}`);

      // Refresh data
      fetchSessions();
      if (selectedSessionId) {
        fetchMessages(selectedSessionId);
      }
    } catch (err) {
      addLog(`[SIMULATOR ERROR] ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addLog = (msg) => {
    setSimulatorLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const clearLogs = () => setSimulatorLogs([]);

  return (
    <div className="space-y-6 animate-fadeIn pb-8 h-[calc(100vh-140px)] flex flex-col overflow-hidden">
      {/* Title block */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary font-bold">support_agent</span>
            Customer Support Console
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">Manage live chat escalations, reply as agents, and simulate WhatsApp webhooks.</p>
        </div>
        <button 
          onClick={() => { fetchSessions(); if (selectedSessionId) fetchMessages(selectedSessionId); }}
          className="bg-surface hover:bg-surface-variant text-on-surface border border-outline-variant px-3 py-1.5 rounded-lg flex items-center gap-2 font-body-md text-xs transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">sync</span>
          Sync Console
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6 flex-1 overflow-hidden min-h-0">
        
        {/* Left Side: Active Sessions & Waiting Queue (Col span 3) */}
        <div className="col-span-3 bg-white border border-outline-variant rounded-xl flex flex-col overflow-hidden shadow-sm h-full">
          {/* Section: Active Bridges */}
          <div className="p-4 border-b border-outline-variant bg-surface shrink-0">
            <h3 className="font-bold text-xs text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px] text-status-success font-bold">sensors</span>
              Active Agent Bridges
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/60">
            {activeSessions.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic p-4 text-center">No active escalated bridges.</p>
            ) : (
              activeSessions.map((sess) => {
                const isActive = sess.session_id === selectedSessionId;
                return (
                  <button
                    key={sess.session_id}
                    onClick={() => setSelectedSessionId(sess.session_id)}
                    className={`w-full text-left p-3.5 flex flex-col gap-1 transition-all ${
                      isActive ? 'bg-primary/5 border-l-4 border-primary' : 'hover:bg-surface-variant/20'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-mono text-[11px] font-bold text-on-surface truncate max-w-[130px]">
                        {sess.session_id}
                      </span>
                      <span className="text-[9px] font-mono text-secondary">
                        {new Date(sess.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="text-[10px] text-primary font-bold flex items-center gap-0.5" title={sess.agent_phone}>
                      <span className="material-symbols-outlined text-[12px]">call</span>
                      {sess.agent_phone.replace('whatsapp:', '')}
                    </span>
                    <p className="text-xs text-on-surface-variant truncate w-full mt-0.5">
                      {sess.last_message}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          {/* Section: Queue list */}
          <div className="border-t border-outline-variant shrink-0 bg-orange-50/20">
            <div className="p-3 bg-orange-50/50 border-b border-outline-variant flex items-center justify-between">
              <span className="font-bold text-[10px] text-orange-800 uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
                Escalation Queue ({queue.length})
              </span>
            </div>
            <div className="max-h-[140px] overflow-y-auto p-2.5 space-y-1.5">
              {queue.length === 0 ? (
                <p className="text-[10px] text-on-surface-variant italic py-1 text-center">Queue is empty.</p>
              ) : (
                queue.map((sessId, idx) => (
                  <div key={sessId} className="flex items-center justify-between bg-white border border-orange-200 p-2 rounded-lg text-[10px] shadow-sm">
                    <span className="font-mono font-bold truncate max-w-[150px]">{sessId}</span>
                    <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-700 rounded font-bold">#{idx + 1}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Middle Pane: Chat Messenger (Col span 5) */}
        <div className="col-span-5 bg-white border border-outline-variant rounded-xl flex flex-col overflow-hidden shadow-sm h-full relative">
          {selectedSessionId ? (
            <>
              {/* Chat Header */}
              <div className="px-5 py-3.5 border-b border-outline-variant bg-surface flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-bold text-[13px] font-mono text-on-surface leading-tight">{selectedSessionId}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
                    <span className="text-[10px] text-secondary font-semibold">Active human support bridge</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Resolve this live support session? Both user and agent will be unmapped.')) {
                      setReplyText('/end');
                      // Trigger submit
                      setTimeout(() => {
                        document.getElementById('reply-form')?.requestSubmit();
                      }, 50);
                    }
                  }}
                  className="px-2.5 py-1 text-[10px] font-bold text-error border border-error/20 hover:bg-error/5 rounded-full transition-all active:scale-95 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Resolve Session
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-surface-container-lowest custom-scrollbar">
                {loadingMessages ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic text-center py-8">Conversation is starting...</p>
                ) : (
                  messages.map((msg, index) => {
                    const isAgent = msg.sender === 'AGENT';
                    const isUser = msg.sender === 'USER';
                    const isSystem = msg.sender === 'BOT';

                    if (isSystem) {
                      return (
                        <div key={msg.id || index} className="flex justify-center my-2">
                          <span className="px-3 py-1 bg-primary/5 border border-primary/10 rounded-full text-[10px] text-primary/80 font-semibold font-body-md text-center max-w-[85%]">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id || index}
                        className={`flex flex-col max-w-[80%] ${isAgent ? 'self-end items-end' : 'self-start items-start'}`}
                      >
                        <span className="text-[9px] text-secondary font-bold mb-0.5 mx-1 uppercase tracking-wider">
                          {isAgent ? 'Support Representative' : 'User'}
                        </span>
                        <div
                          className={`px-3.5 py-2 rounded-2xl shadow-sm text-xs font-body-md leading-relaxed ${
                            isAgent
                              ? 'bg-primary text-white rounded-br-none'
                              : 'bg-secondary-container text-on-surface rounded-bl-none border border-outline-variant/30'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-secondary/60 mt-1 mx-1 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <form
                id="reply-form"
                onSubmit={handleSendReply}
                className="p-3.5 border-t border-outline-variant bg-white flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a response to send to web client..."
                  className="flex-1 bg-surface-container-low px-4 py-2.5 rounded-full text-xs font-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary/40 transition-all"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="w-9 h-9 rounded-full bg-primary hover:bg-primary/95 text-white flex items-center justify-center shadow-md active:scale-95 disabled:opacity-40 transition-all shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <span className="material-symbols-outlined text-[48px] text-secondary/40 animate-pulse">forum</span>
              <h3 className="font-bold text-sm text-on-surface mt-4">No Session Selected</h3>
              <p className="text-xs text-on-surface-variant max-w-xs mt-1">Select an active agent bridge from the left panel to read history and send replies.</p>
            </div>
          )}
        </div>

        {/* Right Pane: WhatsApp Webhook & Payload Simulator (Col span 4) */}
        <div className="col-span-4 bg-white border border-outline-variant rounded-xl flex flex-col overflow-hidden shadow-sm h-full">
          <div className="p-4 border-b border-outline-variant bg-surface flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-bold text-xs text-primary uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary font-bold">cell_tower</span>
                WhatsApp Webhook Simulator
              </h3>
              <p className="text-[10px] text-secondary">Tests signature verification & webhook routing.</p>
            </div>
            <button
              onClick={clearLogs}
              className="text-[10px] text-secondary hover:text-primary font-semibold hover:underline"
            >
              Clear Logs
            </button>
          </div>

          <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto">
            {/* Input From Agent Phone */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase">Agent Phone (Sender)</label>
              <div className="flex items-center bg-surface-container-low border border-outline-variant rounded-lg overflow-hidden px-3">
                <span className="text-xs text-secondary font-mono mr-1">whatsapp:+</span>
                <input
                  type="text"
                  value={simulatorFrom}
                  onChange={(e) => setSimulatorFrom(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-transparent border-0 outline-none py-2 text-xs font-mono"
                  placeholder="1234567890"
                />
              </div>
            </div>

            {/* Input Message Text */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase">WhatsApp Message Content</label>
              <textarea
                value={simulatorText}
                onChange={(e) => setSimulatorText(e.target.value)}
                placeholder="Type a message or /end command..."
                rows={3}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 placeholder:text-secondary/50"
              />
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSimulateWebhook()}
                disabled={loading || !simulatorText.trim()}
                className="bg-primary hover:bg-primary/95 text-white py-2 rounded-lg font-bold text-xs transition-colors active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">cell_wifi</span>
                Send Text
              </button>
              <button
                onClick={() => handleSimulateWebhook('/end')}
                disabled={loading}
                className="bg-error/10 hover:bg-error/15 text-error border border-error/20 py-2 rounded-lg font-bold text-xs transition-colors active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">cancel</span>
                Send /end
              </button>
            </div>

            {/* Simulation Logger */}
            <div className="flex-1 flex flex-col min-h-[160px] border border-outline-variant/60 rounded-lg overflow-hidden bg-surface-container-low">
              <div className="px-3 py-1.5 bg-secondary-container/40 border-b border-outline-variant/60 flex items-center justify-between">
                <span className="text-[9px] font-bold text-secondary uppercase tracking-wider font-mono">Webhook Verification Logs</span>
                <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
              </div>
              <div className="flex-1 p-3 overflow-y-auto font-mono text-[10px] text-on-surface space-y-1.5 custom-scrollbar bg-slate-900 text-slate-100">
                {simulatorLogs.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-8">Simulator actions will log here...</p>
                ) : (
                  simulatorLogs.map((log, index) => (
                    <div key={index} className="leading-relaxed border-b border-slate-800 pb-1 break-all">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default SupportConsoleView;
