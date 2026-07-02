// API Service Layer for thinxsense revamped platform
// Mimics asynchronous backend calls with simulation latency.
// Swapping this file with actual fetch/axios requests in the future is easy.

import {
  initialGroups,
  initialUsers,
  initialGateways,
  initialSensors,
  initialAlerts
} from './mockData';

// Simulated latency helper
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Keep state local to memory during current session
let groups = [...initialGroups];
let users = [...initialUsers];
let gateways = [...initialGateways];
let sensors = [...initialSensors];
let alerts = [...initialAlerts];

export const apiService = {
  // --- GROUPS API ---
  async getGroups() {
    await delay(400);
    return [...groups];
  },

  async addGroup(group) {
    await delay(300);
    const newGroup = {
      sno: groups.length + 1,
      name: group.name,
      desc: group.desc || 'No description provided',
      registered: new Date().toLocaleString('en-GB', { hour12: false }).replace(',', '')
    };
    groups.push(newGroup);
    return newGroup;
  },

  // --- USERS API ---
  async getUsers() {
    await delay(500);
    return [...users];
  },

  async addUser(user) {
    await delay(400);
    const newUser = {
      sno: users.length + 1,
      name: user.name,
      role: user.role || 'USER',
      email: user.email,
      registered: new Date().toLocaleDateString('en-GB')
    };
    users.push(newUser);
    return newUser;
  },

  // --- GATEWAYS API ---
  async getGateways() {
    await delay(400);
    return [...gateways];
  },

  async getGatewayById(id) {
    await delay(300);
    return gateways.find(gw => gw.id === id) || null;
  },

  // --- SENSORS API ---
  async getSensors() {
    await delay(600);
    return [...sensors];
  },

  async getSensorById(id) {
    await delay(300);
    return sensors.find(s => s.id === id) || null;
  },

  // --- ALERTS API ---
  async getAlerts(searchQuery = '') {
    await delay(500);
    let filtered = [...alerts];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(alert => 
        alert.sensor.toLowerCase().includes(q) || 
        alert.id.toLowerCase().includes(q)
      );
    }
    return filtered;
  },

  async acknowledgeAlert(alertId) {
    await delay(300);
    alerts = alerts.map(alert => 
      alert.id === alertId ? { ...alert, state: 'acknowledged' } : alert
    );
    return true;
  },

  async deleteGroup(groupName) {
    await delay(300);
    groups = groups.filter(g => g.name !== groupName);
    // Unassign sensors from this deleted group
    sensors = sensors.map(s => 
      s.group === groupName ? { ...s, group: 'unassigned' } : s
    );
    return true;
  },

  async addSensor(sensor) {
    await delay(300);
    const newSensor = {
      id: sensor.id,
      name: sensor.id,
      temp: parseFloat(sensor.temp) || 24.0,
      hum: parseFloat(sensor.hum) || 40.0,
      batt: parseInt(sensor.batt) || 100,
      status: sensor.status || 'online',
      group: sensor.group || 'unassigned',
      location: sensor.location || 'Not Specified',
      lastSeen: 'Just now',
      history: [],
      complianceScore: 100.0
    };
    sensors.push(newSensor);
    return newSensor;
  }
};
