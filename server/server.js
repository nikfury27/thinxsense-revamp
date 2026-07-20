import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { mockGroups, mockGateways, mockSensors, mockAlerts } from './mockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Capture raw body for Meta signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Setup WebSockets
const wss = new WebSocketServer({ noServer: true });
const clients = new Map(); // session_id -> ws client
const supportClients = new Set(); // support console ws clients

// Handle WebSocket upgrades
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws, request) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const sessionId = url.searchParams.get('session_id');
  const role = url.searchParams.get('role'); // 'client' or 'support'

  if (role === 'support') {
    supportClients.add(ws);
    console.log('[WS] Support console client connected. Active support connections:', supportClients.size);

    ws.on('close', () => {
      supportClients.delete(ws);
      console.log('[WS] Support console client disconnected.');
    });
  } else if (sessionId) {
    clients.set(sessionId, ws);
    console.log(`[WS] Client connected for session: ${sessionId}. Active clients: ${clients.size}`);

    ws.on('close', () => {
      clients.delete(sessionId);
      console.log(`[WS] Client disconnected for session: ${sessionId}`);
    });
  }

  ws.on('message', (message) => {
    console.log(`[WS] Received message: ${message}`);
  });
});

// Helper to broadcast WS messages to support clients
function broadcastToSupport(data) {
  const messageStr = JSON.stringify(data);
  for (const client of supportClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  }
}

// Helper to send WS message to specific client
function sendToClient(sessionId, data) {
  const client = clients.get(sessionId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(data));
    return true;
  }
  return false;
}

// Helper to establish connection between agent and client session
function connectAgentToSession(sessionId, agentPhone) {
  // 1. Map session to agent
  db.saveEscalation({ _id: agentPhone, session_id: sessionId });

  const session = db.getSession(sessionId);
  if (session) {
    session.mode = 'HUMAN';
    db.saveSession(session);
  }

  // 2. Save and send system instructions
  const systemMsg = db.saveMessage({
    session_id: sessionId,
    sender: 'BOT',
    text: 'Please describe your concerns or queries here first, and our support executive will reach out to you on WhatsApp as soon as possible.'
  });
  sendToClient(sessionId, { type: 'message', message: systemMsg, mode: 'HUMAN', queuePosition: 0 });

  // Broadcast mapping to support consoles
  broadcastToSupport({ type: 'session_assigned', agentPhone, session_id: sessionId });
  
  // Send WS message update to support consoles
  broadcastToSupport({ type: 'message', message: systemMsg });
}

// Meta Graph API Outgoing Helper
async function sendWhatsAppMessage(to, body) {
  const token = process.env.META_ACCESS_TOKEN;
  const phoneId = process.env.META_PHONE_NUMBER_ID;

  if (!token || token.includes('mock') || !phoneId) {
    console.log(`[MOCK WHATSAPP OUTGOING] To: ${to}, Text: "${body}"`);
    return true;
  }

  try {
    const cleanTo = to.replace('whatsapp:', '').replace('+', '');
    const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanTo,
        type: 'text',
        text: { body }
      })
    });
    
    const data = await response.json();
    console.log('[META GRAPH API RESPONSE]', data);
    return data.messaging_product === 'whatsapp' || data.success;
  } catch (err) {
    console.error('[META GRAPH API ERROR]', err);
    return false;
  }
}

// Guided Bot Response Generator
function generateBotResponse(text) {
  const clean = text.toLowerCase().trim();

  // 1. Health Command
  if (clean.includes('health') || clean.includes('status') || clean === '1') {
    const onlineSensors = mockSensors.filter(s => s.status === 'online').length;
    const warningSensors = mockSensors.filter(s => s.status === 'warning').length;
    const offlineSensors = mockSensors.filter(s => s.status === 'offline').length;
    const onlineGateways = mockGateways.filter(g => g.status === 'online').length;

    return `📊 *System Health Summary*:\n\n` +
      `🌐 *Gateways*: ${onlineGateways} of ${mockGateways.length} online.\n` +
      `🌡️ *Sensors*:\n` +
      `  • Online: ${onlineSensors}\n` +
      `  • Warning: ${warningSensors}\n` +
      `  • Offline: ${offlineSensors}\n\n` +
      `All BLE Beacons are sending metrics at standard intervals. Select another option or type "Speak to a Human" if you need live assistance.`;
  }

  // 2. Active Excursions / Alerts
  if (clean.includes('alert') || clean.includes('excursion') || clean === '2') {
    const active = mockAlerts.filter(a => a.state === 'unacknowledged');
    if (active.length === 0) {
      return `✅ *Active Alerts*: There are currently no unacknowledged active excursions in any cold room.`;
    }

    let reply = `🚨 *Active Environmental Excursions*:\n\n`;
    active.forEach(a => {
      const esi = a.deviation && a.duration ? (a.deviation * a.duration).toFixed(1) : 'N/A';
      reply += `• *ID: ${a.id}* - ${a.room}\n` +
               `  📍 Location: ${a.location}\n` +
               `  🌡️ Value: ${a.val}°C (Threshold ${a.threshold})\n` +
               `  ⚡ Severity ESI: *${esi}*\n\n`;
    });
    reply += `Please acknowledge these deviations on the Alerts panel.`;
    return reply;
  }

  // 3. Locate Sensor
  if (clean.startsWith('locate') || clean.includes('find') || clean === '3') {
    // Check if a specific sensor is mentioned
    const matches = clean.match(/(h9b\d+|brr\d+)/i);
    if (matches && matches[0]) {
      const sensorId = matches[0].toUpperCase();
      const sensor = mockSensors.find(s => s.id === sensorId);
      if (sensor) {
        return `📍 *Sensor Location & Reading* [${sensorId}]:\n\n` +
          `• Group/Chamber: *${sensor.group}*\n` +
          `• Rack/Location: *${sensor.location}*\n` +
          `• Temperature: *${sensor.temp}°C*\n` +
          `• Humidity: *${sensor.hum}%*\n` +
          `• Battery: *${sensor.batt}%*\n` +
          `• Status: *${sensor.status.toUpperCase()}*`;
      }
      return `❌ Sensor *${sensorId}* was not found in the roster. Please verify the ID.`;
    }

    return `📍 *Locate Sensor*:\nTo locate a sensor, please specify its ID. For example: \`locate H9B00045\` or \`find BRR00001\`.`;
  }

  // Default greetings
  return `Hello! I'm thinxsense Bot 🤖. How can I help you today?\n\n` +
    `Choose one of these options by typing its number or description:\n` +
    `1️⃣ *Check System Health* (Sensors & Gateways overview)\n` +
    `2️⃣ *List Active Alerts* (Active cold room excursions sorted by severity)\n` +
    `3️⃣ *Locate a Sensor* (Check specific sensor location/metrics)\n\n` +
    `Or click the *Speak to a Human* button to escalate to WhatsApp Support.`;
}

// POST /chat - Main chat endpoint
app.post('/chat', async (req, res) => {
  const { session_id, message, action } = req.body;

  if (!session_id) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  let session = db.getSession(session_id);
  if (!session) {
    session = db.saveSession({ _id: session_id, mode: 'BOT', context: {} });
  }

  const agentPhone = process.env.AGENT_PHONE_NUMBER || 'whatsapp:+1234567890';

  // Return session state silently for init checks
  if (message === 'hello_init_silent_check_mode_123') {
    return res.json({
      message: null,
      mode: session.mode,
      queuePosition: db.getQueuePosition(session_id),
      session
    });
  }

  // --- ESCALATE ACTION ---
  if (action === 'ESCALATE_TO_HUMAN') {
    session.mode = 'HUMAN';
    db.saveSession(session);

    // Save user's request message
    const userMsg = db.saveMessage({ session_id, sender: 'USER', text: '[Request Live Support]' });

    // Check if agent is currently busy
    const existingEscalation = db.getEscalation(agentPhone);

    if (existingEscalation) {
      // Agent is busy: Put user in the FIFO queue
      const position = db.addToQueue(session_id);
      
      const botMsgText = `All support agents are currently busy. You are number ${position} in the queue. Please hold.`;
      const systemMessage = db.saveMessage({
        session_id,
        sender: 'BOT',
        text: botMsgText
      });

      // Notify clients
      sendToClient(session_id, { type: 'message', message: systemMessage, mode: 'HUMAN', queuePosition: position });
      broadcastToSupport({ type: 'queue_update', queue: db.getQueue() });

      return res.json({
        message: botMsgText,
        userMessage: userMsg,
        mode: 'HUMAN',
        queuePosition: position,
        session
      });
    } else {
      // Agent is free: Send notification to WhatsApp and connect
      const notificationText = `⚠️ *[NEW SUPPORT REQUEST]*\n\nUser Session ID: \`${session_id}\` has escalated the chat. Type any message to reply to the user. Type \`/end\` to close the session.`;
      await sendWhatsAppMessage(agentPhone, notificationText);

      const botMsgText = 'Connecting you to a human agent on WhatsApp... Please hold.';
      const systemMessage = db.saveMessage({
        session_id,
        sender: 'BOT',
        text: botMsgText
      });
      sendToClient(session_id, { type: 'message', message: systemMessage, mode: 'HUMAN', queuePosition: 0 });

      // Run connection logic (system notification + agent greeting)
      connectAgentToSession(session_id, agentPhone);

      return res.json({
        message: botMsgText,
        userMessage: userMsg,
        mode: 'HUMAN',
        queuePosition: 0,
        session
      });
    }
  }

  // --- REGULAR CHAT MESSAGE ---
  if (!message) {
    return res.status(400).json({ error: 'Missing message body' });
  }

  // Save user message to history
  const userMsg = db.saveMessage({ session_id, sender: 'USER', text: message });

  // Broadcast to support if they are viewing this session
  broadcastToSupport({ type: 'message', message: userMsg });

  // Check for /end command from the client
  if (message.trim() === '/end') {
    const escalation = db.getEscalationBySession(session_id);
    
    // Delete active escalation mapping
    db.deleteEscalationBySession(session_id);
    
    session.mode = 'BOT';
    db.saveSession(session);
    
    const botReply = db.saveMessage({
      session_id,
      sender: 'BOT',
      text: 'The support session has been closed. Conversational bot is back online.'
    });
    
    // Notify client and support consoles
    sendToClient(session_id, { type: 'session_ended', message: botReply });
    broadcastToSupport({ type: 'session_ended', session_id });
    
    // Notify the agent on WhatsApp
    if (escalation) {
      await sendWhatsAppMessage(escalation._id, `🛑 *[SESSION CLOSED]*\n\nThe web user has ended the support session. You are now free.`);
      
      // Pull next user from the queue if the agent is now free
      const nextSessionId = db.popFromQueue();
      if (nextSessionId) {
        await sendWhatsAppMessage(escalation._id, `⚠️ *[NEW SUPPORT REQUEST]*\n\nUser Session ID: \`${nextSessionId}\` has escalated the chat. Type any message to reply to the user. Type \`/end\` to close the session.`);
        
        const connectMsg = db.saveMessage({
          session_id: nextSessionId,
          sender: 'BOT',
          text: 'Connecting you to a human agent... Please hold.'
        });
        sendToClient(nextSessionId, { type: 'message', message: connectMsg, mode: 'HUMAN', queuePosition: 0 });

        connectAgentToSession(nextSessionId, escalation._id);
      }
    }
    
    return res.json({ message: botReply.text, userMessage: userMsg, mode: 'BOT', session });
  }

  if (session.mode === 'HUMAN') {
    const escalation = db.getEscalationBySession(session_id);

    if (escalation) {
      // Forward user message to agent on WhatsApp
      await sendWhatsAppMessage(escalation._id, `👤 *User:* ${message}`);
      return res.json({ message: null, userMessage: userMsg, mode: 'HUMAN', queuePosition: 0 });
    } else {
      // In queue
      const position = db.getQueuePosition(session_id);
      const queueMsg = `You are currently in queue (Position #${position}). Please wait for an agent to connect.`;
      return res.json({ message: queueMsg, userMessage: userMsg, mode: 'HUMAN', queuePosition: position });
    }
  }

  // BOT MODE: generate automated response
  const replyText = generateBotResponse(message);
  const botMsg = db.saveMessage({ session_id, sender: 'BOT', text: replyText });

  // Push message via WS if client is connected
  sendToClient(session_id, { type: 'message', message: botMsg, mode: 'BOT' });

  return res.json({
    message: replyText,
    userMessage: userMsg,
    mode: 'BOT',
    session
  });
});

// GET /webhooks/whatsapp - Meta webhook URL verification
app.get('/webhooks/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log(`[WEBHOOK GET] Received Token: "${token}", Expected Token: "${process.env.WEBHOOK_VERIFY_TOKEN}", Mode: "${mode}"`);

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('[WEBHOOK] Meta verification successful.');
    return res.status(200).send(challenge);
  }

  console.error('[WEBHOOK] Meta verification failed. Tokens did not match or invalid mode.');
  return res.status(403).send('Forbidden');
});

// POST /webhooks/whatsapp - Meta webhook incoming messages
app.post('/webhooks/whatsapp', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const appSecret = (process.env.META_APP_SECRET || '').trim();

  // 1. Signature Verification (Bypassed as requested)
  if (signature) {
    const elements = signature.split('=');
    const signatureHash = elements[1];
    const expectedHash = crypto
      .createHmac('sha256', appSecret)
      .update(req.rawBody || '')
      .digest('hex');

    console.log(`[SIGNATURE DEBUG] App Secret Length: ${appSecret.length}, Raw Body Length: ${req.rawBody ? req.rawBody.length : 0}`);

    if (signatureHash !== expectedHash) {
      console.warn(`[WEBHOOK WARNING] Signature validation failed. Expected: ${expectedHash}, Got: ${signatureHash}. (Bypassing validation)`);
    } else {
      console.log(`[WEBHOOK] Signature validation successful.`);
    }
  } else {
    console.warn('[WEBHOOK WARNING] X-Hub-Signature-256 header missing. (Bypassing validation)');
  }

  // 2. Extract Message Details
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messageObj = value?.messages?.[0];

    if (!messageObj) {
      // Not a message event (could be a status update, delivery report, etc.)
      return res.status(200).send('OK');
    }

    const fromNum = messageObj.from; // e.g. "1234567890"
    const agentPhone = `whatsapp:+${fromNum}`;
    const text = messageObj.text?.body;

    if (!text) {
      return res.status(200).send('OK');
    }

    console.log(`[WEBHOOK] WhatsApp message received from ${agentPhone}: "${text}"`);

    // 3. Process Escalation Mapping
    const escalation = db.getEscalation(agentPhone);

    if (!escalation) {
      // Agent has no active mapped session
      await sendWhatsAppMessage(agentPhone, "You do not have an active chat session. We will notify you when a user escalates.");
      return res.status(200).send('OK');
    }

    const sessionId = escalation.session_id;

    // 4. Handle End Command
    if (text.trim() === '/end') {
      // Resolve the session
      db.deleteEscalation(agentPhone);
      
      const session = db.getSession(sessionId);
      if (session) {
        session.mode = 'BOT';
        db.saveSession(session);
      }

      const botReply = db.saveMessage({
        session_id: sessionId,
        sender: 'BOT',
        text: 'The support agent has closed this session. Conversational bot is back online.'
      });

      // Send WS updates
      sendToClient(sessionId, { type: 'session_ended', message: botReply });
      broadcastToSupport({ type: 'session_ended', session_id: sessionId });

      await sendWhatsAppMessage(agentPhone, `🛑 Live session with user \`${sessionId}\` has been closed. You are now online for new assignments.`);

      // Check FIFO Queue for next waiting client
      const nextSessionId = db.popFromQueue();
      if (nextSessionId) {
        const assignText = `⚠️ *[NEW SUPPORT REQUEST]*\n\nUser Session ID: \`${nextSessionId}\` has escalated the chat. Type any message to reply to the user. Type \`/end\` to close the session.`;
        await sendWhatsAppMessage(agentPhone, assignText);

        const connectMsg = db.saveMessage({
          session_id: nextSessionId,
          sender: 'BOT',
          text: 'Connecting you to a human agent... Please hold.'
        });
        sendToClient(nextSessionId, { type: 'message', message: connectMsg, mode: 'HUMAN', queuePosition: 0 });

        connectAgentToSession(nextSessionId, agentPhone);
      }

      return res.status(200).send('OK');
    }

    // 5. Forward Agent Message to Web Client (Deduplicate using Meta Message ID)
    const messages = db.getMessages(sessionId);
    const alreadyExists = messages.some(m => m.id === messageObj.id);

    if (alreadyExists) {
      console.log(`[WEBHOOK] Ignored duplicate webhook message with ID: ${messageObj.id}`);
      return res.status(200).send('OK');
    }

    const agentMsg = db.saveMessage({
      id: messageObj.id,
      session_id: sessionId,
      sender: 'AGENT',
      text: text
    });

    // Send to web client via WS
    sendToClient(sessionId, { type: 'message', message: agentMsg });
    
    // Broadcast to support console users (visual mirror)
    broadcastToSupport({ type: 'message', message: agentMsg });

    return res.status(200).send('OK');
  } catch (err) {
    console.error('[WEBHOOK] Error processing webhook body:', err);
    return res.status(500).send('Internal Error');
  }
});

// GET /api/support/sessions - Active sessions for Support Console
app.get('/api/support/sessions', (req, res) => {
  const escalations = db.getAllEscalations();
  const queue = db.getQueue();
  const sessions = escalations.map(esc => {
    const lastMsgs = db.getMessages(esc.session_id);
    const lastMsg = lastMsgs[lastMsgs.length - 1];
    return {
      session_id: esc.session_id,
      agent_phone: esc._id,
      escalated_at: esc.escalated_at,
      last_message: lastMsg ? lastMsg.text : '[No Messages]',
      last_message_time: lastMsg ? lastMsg.timestamp : esc.escalated_at
    };
  });

  return res.json({ active_sessions: sessions, queue });
});

// GET /api/support/messages/:session_id - Get chat logs for session
app.get('/api/support/messages/:session_id', (req, res) => {
  const sessionId = req.params.session_id;
  const messages = db.getMessages(sessionId);
  return res.json({ messages });
});

// POST /api/support/logout-clear - Ends session, releases agent, and deletes message history on logout
app.post('/api/support/logout-clear', async (req, res) => {
  const { session_id } = req.body;
  if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

  console.log(`[LOGOUT] Clearing chat history & resolving agent for session: ${session_id}`);

  // 1. Resolve active escalation mapping (free agent)
  const escalation = db.getEscalationBySession(session_id);
  if (escalation) {
    db.deleteEscalationBySession(session_id);
    await sendWhatsAppMessage(escalation._id, `🛑 *[SESSION TERMINATED]*\n\nThe user logged out. The session is closed and you are now free.`);
    
    // Pull next queued user
    const nextSessionId = db.popFromQueue();
    if (nextSessionId) {
      await sendWhatsAppMessage(escalation._id, `⚠️ *[NEW SUPPORT REQUEST]*\n\nUser Session ID: \`${nextSessionId}\` has escalated the chat. Type any message to reply to the user. Type \`/end\` to close the session.`);
      
      const connectMsg = db.saveMessage({
        session_id: nextSessionId,
        sender: 'BOT',
        text: 'Connecting you to a human agent... Please hold.'
      });
      sendToClient(nextSessionId, { type: 'message', message: connectMsg, mode: 'HUMAN', queuePosition: 0 });

      connectAgentToSession(nextSessionId, escalation._id);
    }
  }

  // 2. Remove from queue if they were waiting
  db.removeFromQueue(session_id);

  // 3. Delete message history from database
  db.deleteMessages(session_id);

  // 4. Delete session itself
  db.deleteSession(session_id);

  // Notify support console that this session is closed/ended
  broadcastToSupport({ type: 'session_ended', session_id });

  return res.json({ success: true });
});

// POST /api/support/reply - Reply as Support Agent from web console
app.post('/api/support/reply', async (req, res) => {
  const { session_id, text } = req.body;

  if (!session_id || !text) {
    return res.status(400).json({ error: 'Missing session_id or text' });
  }

  const agentPhone = process.env.AGENT_PHONE_NUMBER || 'whatsapp:+1234567890';
  const escalation = db.getEscalation(agentPhone);

  if (!escalation || escalation.session_id !== session_id) {
    return res.status(400).json({ error: 'Agent is not currently assigned to this session.' });
  }

  // Check if text is end session
  if (text.trim() === '/end') {
    db.deleteEscalation(agentPhone);
    const session = db.getSession(session_id);
    if (session) {
      session.mode = 'BOT';
      db.saveSession(session);
    }

    const botReply = db.saveMessage({
      session_id: session_id,
      sender: 'BOT',
      text: 'The support agent has closed this session. Conversational bot is back online.'
    });

    sendToClient(session_id, { type: 'session_ended', message: botReply });
    broadcastToSupport({ type: 'session_ended', session_id });

    await sendWhatsAppMessage(agentPhone, `🛑 Live session with user \`${session_id}\` has been closed.`);

    // Pull next
    const nextSessionId = db.popFromQueue();
    if (nextSessionId) {
      await sendWhatsAppMessage(agentPhone, `⚠️ *[NEW SUPPORT REQUEST]*\n\nUser Session ID: \`${nextSessionId}\` has escalated the chat. Type any message to reply to the user. Type \`/end\` to close the session.`);
      
      const nextMsg = db.saveMessage({
        session_id: nextSessionId,
        sender: 'BOT',
        text: 'Connecting you to a human agent... Please hold.'
      });
      sendToClient(nextSessionId, { type: 'message', message: nextMsg, mode: 'HUMAN', queuePosition: 0 });

      connectAgentToSession(nextSessionId, agentPhone);
    }

    return res.json({ success: true, message: 'Session closed' });
  }

  // Save AGENT message
  const agentMsg = db.saveMessage({
    session_id,
    sender: 'AGENT',
    text
  });

  // Push to user via websocket
  sendToClient(session_id, { type: 'message', message: agentMsg });
  // Broadcast to other support consoles
  broadcastToSupport({ type: 'message', message: agentMsg });

  // Optional: Send to agent's own WhatsApp to sync their outgoing chat history
  await sendWhatsAppMessage(agentPhone, `🏢 *Support Agent:* ${text}`);

  return res.json({ success: true, message: agentMsg });
});

// POST /api/support/simulate-whatsapp-webhook - Simulator endpoint
app.post('/api/support/simulate-whatsapp-webhook', async (req, res) => {
  const { from, text } = req.body;

  if (!from || !text) {
    return res.status(400).json({ error: 'Missing from or text' });
  }

  // Format phone number
  const cleanFrom = from.replace('+', '').replace('whatsapp:', '');

  // 1. Build Meta payload body
  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '123456789',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '1234567890',
                phone_number_id: '1234567890'
              },
              contacts: [
                {
                  profile: { name: 'Support Agent' },
                  wa_id: cleanFrom
                }
              ],
              messages: [
                {
                  from: cleanFrom,
                  id: 'wamid.HBgLMTIzNDU2Nzg5MCEVAgYWBhBDM' + Math.random().toString(36).substring(7),
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  text: { body: text },
                  type: 'text'
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  };

  const payloadString = JSON.stringify(payload);

  // 2. Generate signature
  const appSecret = process.env.META_APP_SECRET || 'thinxsense_secret_12345';
  const signatureHash = crypto
    .createHmac('sha256', appSecret)
    .update(payloadString)
    .digest('hex');
  const signatureHeader = `sha256=${signatureHash}`;

  // 3. Make POST request locally (simulated call)
  try {
    const url = `http://localhost:${PORT}/webhooks/whatsapp`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signatureHeader
      },
      body: payloadString
    });

    const responseText = await response.text();
    return res.json({
      status: response.status,
      response: responseText,
      signature: signatureHeader,
      payload
    });
  } catch (err) {
    console.error('[SIMULATOR ERROR]', err);
    return res.status(500).json({ error: 'Simulation call failed', details: err.message });
  }
});

// Start Express server
server.listen(PORT, () => {
  console.log(`🚀 Thinxsense Bot Backend listening on port ${PORT}`);
});
