import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');

// Helper to read database
function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = { web_sessions: [], active_escalations: [], escalation_queue: [], messages: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON DB, returning default structure:', error);
    return { web_sessions: [], active_escalations: [], escalation_queue: [], messages: [] };
  }
}

// Helper to write database
function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing to JSON DB:', error);
    return false;
  }
}

export const db = {
  // --- SESSIONS ---
  getSession(sessionId) {
    const data = readDB();
    return data.web_sessions.find(s => s._id === sessionId) || null;
  },

  saveSession(session) {
    const data = readDB();
    const index = data.web_sessions.findIndex(s => s._id === session._id);
    const updatedSession = {
      ...session,
      last_updated: new Date().toISOString()
    };
    if (index > -1) {
      data.web_sessions[index] = updatedSession;
    } else {
      data.web_sessions.push(updatedSession);
    }
    writeDB(data);
    return updatedSession;
  },

  deleteSession(sessionId) {
    const data = readDB();
    const filtered = data.web_sessions.filter(s => s._id !== sessionId);
    data.web_sessions = filtered;
    writeDB(data);
    return true;
  },

  // --- ESCALATIONS ---
  getEscalation(agentPhone) {
    const data = readDB();
    return data.active_escalations.find(e => e._id === agentPhone) || null;
  },

  getEscalationBySession(sessionId) {
    const data = readDB();
    return data.active_escalations.find(e => e.session_id === sessionId) || null;
  },

  saveEscalation(escalation) {
    const data = readDB();
    const index = data.active_escalations.findIndex(e => e._id === escalation._id);
    const updated = {
      ...escalation,
      escalated_at: escalation.escalated_at || new Date().toISOString()
    };
    if (index > -1) {
      data.active_escalations[index] = updated;
    } else {
      data.active_escalations.push(updated);
    }
    writeDB(data);
    return updated;
  },

  deleteEscalation(agentPhone) {
    const data = readDB();
    const filtered = data.active_escalations.filter(e => e._id !== agentPhone);
    data.active_escalations = filtered;
    writeDB(data);
    return true;
  },

  deleteEscalationBySession(sessionId) {
    const data = readDB();
    const filtered = data.active_escalations.filter(e => e.session_id !== sessionId);
    data.active_escalations = filtered;
    writeDB(data);
    return true;
  },

  getAllEscalations() {
    const data = readDB();
    return data.active_escalations;
  },

  // --- QUEUE ---
  getQueue() {
    const data = readDB();
    return data.escalation_queue || [];
  },

  addToQueue(sessionId) {
    const data = readDB();
    if (!data.escalation_queue) data.escalation_queue = [];
    if (!data.escalation_queue.includes(sessionId)) {
      data.escalation_queue.push(sessionId);
      writeDB(data);
    }
    return data.escalation_queue.indexOf(sessionId) + 1;
  },

  popFromQueue() {
    const data = readDB();
    if (!data.escalation_queue || data.escalation_queue.length === 0) return null;
    const nextSessionId = data.escalation_queue.shift();
    writeDB(data);
    return nextSessionId;
  },

  getQueuePosition(sessionId) {
    const data = readDB();
    if (!data.escalation_queue) return 0;
    const index = data.escalation_queue.indexOf(sessionId);
    return index > -1 ? index + 1 : 0;
  },

  removeFromQueue(sessionId) {
    const data = readDB();
    if (!data.escalation_queue) return false;
    const filtered = data.escalation_queue.filter(id => id !== sessionId);
    const changed = filtered.length !== data.escalation_queue.length;
    data.escalation_queue = filtered;
    writeDB(data);
    return changed;
  },

  // --- MESSAGES ---
  getMessages(sessionId) {
    const data = readDB();
    return data.messages.filter(m => m.session_id === sessionId);
  },

  saveMessage(msg) {
    const data = readDB();
    const msgId = msg.id || Math.random().toString(36).substring(2, 9);
    
    // Prevent duplicate entries by checking for existing ID
    const existing = data.messages.find(m => m.id === msgId);
    if (existing) {
      return existing;
    }

    const newMsg = {
      id: msgId,
      session_id: msg.session_id,
      sender: msg.sender, // 'USER' | 'BOT' | 'AGENT'
      text: msg.text,
      timestamp: new Date().toISOString()
    };
    data.messages.push(newMsg);
    writeDB(data);
    return newMsg;
  }
};
