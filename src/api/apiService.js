// API Service Layer for thinxsense revamped platform
// Mimics asynchronous backend calls with simulation latency.
// Optimized for production patterns by utilizing narrow query filters on the server/mock layer.

import {
  initialGroups,
  initialUsers,
  initialGateways,
  initialSensors,
  initialAlerts
} from './mockData';

// Simulated latency helper
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Keep state local to memory during current session
let groups = [...initialGroups];
let users = [...initialUsers];
let gateways = [...initialGateways];
let sensors = [...initialSensors];
let alerts = [...initialAlerts];

const enrichSensor = (s) => {
  const group = groups.find(g => g.name === s.group);
  const facilityLocation = group ? group.location : 'Not Specified';
  
  let slope = 0;
  let projectedHoursToBreach = null;
  let isTrendBreachRisk = false;
  
  if (s.history && s.history.length >= 2) {
    const latest = s.history[s.history.length - 1];
    const earlier = s.history[s.history.length - 5] || s.history[0];
    const tempDiff = latest.temp - earlier.temp;
    const stepsDiff = s.history.length >= 5 ? 4 : (s.history.length - 1);
    slope = parseFloat((tempDiff / (stepsDiff || 1)).toFixed(2));
    
    if (slope > 0 && s.temp > 22.5 && s.temp < 25.0) {
      const rawHours = (25.0 - s.temp) / slope;
      // Round to nearest 0.5 hours for realistic approximation
      projectedHoursToBreach = parseFloat((Math.round(rawHours * 2) / 2).toFixed(1));
      if (projectedHoursToBreach <= 4) {
        isTrendBreachRisk = true;
      }
    }
  }
  
  const dailyDrain = s.dailyDrainRate || 1.5;
  // Round to nearest day for realistic battery swap forecast
  const batteryDaysRemaining = Math.round(s.batt / dailyDrain);
  const isBatterySwapRisk = batteryDaysRemaining <= 5;
  
  return {
    ...s,
    facilityLocation,
    slope,
    projectedHoursToBreach,
    isTrendBreachRisk,
    batteryDaysRemaining,
    isBatterySwapRisk
  };
};

const enrichGateway = (gw) => {
  const batt = parseFloat(gw.properties.Battery) || 100;
  const dailyDrain = parseFloat(gw.properties.dailyDrainRate) || 1.5;
  // Round to nearest day for realistic battery swap forecast
  const batteryDaysRemaining = Math.round(batt / dailyDrain);
  const isBatterySwapRisk = batteryDaysRemaining <= 5;
  
  return {
    ...gw,
    batteryDaysRemaining,
    isBatterySwapRisk
  };
};

export const apiService = {
  // --- GROUPS API ---
  async getGroups(searchQuery = '') {
    await delay(300);
    let result = [...groups];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(g => 
        g.name.toLowerCase().includes(q) || 
        g.desc.toLowerCase().includes(q) ||
        (g.location && g.location.toLowerCase().includes(q))
      );
    }
    return result;
  },

  async addGroup(group) {
    await delay(200);
    const newGroup = {
      sno: groups.length + 1,
      name: group.name,
      desc: group.desc || 'No description provided',
      location: group.location || 'Not Specified',
      registered: new Date().toLocaleString('en-GB', { hour12: false }).replace(',', '')
    };
    groups.push(newGroup);
    return newGroup;
  },

  async deleteGroup(groupName) {
    await delay(200);
    groups = groups.filter(g => g.name !== groupName);
    // Unassign sensors from this deleted group on the server
    sensors = sensors.map(s => 
      s.group === groupName ? { ...s, group: 'unassigned' } : s
    );
    return true;
  },

  // --- USERS API ---
  async getUsers() {
    await delay(300);
    return [...users];
  },

  async addUser(user) {
    await delay(200);
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
    await delay(300);
    return gateways.map(enrichGateway);
  },

  async getGatewayById(id) {
    await delay(200);
    const gw = gateways.find(gw => gw.id === id);
    return gw ? enrichGateway(gw) : null;
  },

  // --- SENSORS API ---
  // Optimized: filter sensors on the server side instead of fetching the entire array
  async getSensors(filters = {}) {
    await delay(400);
    let result = [...sensors];
    
    if (filters.group) {
      result = result.filter(s => s.group === filters.group);
    }
    if (filters.status) {
      result = result.filter(s => s.status === filters.status);
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(s => s.id.toLowerCase().includes(q));
    }

    return result.map(enrichSensor);
  },

  async getSensorById(id) {
    await delay(200);
    const s = sensors.find(s => s.id === id);
    return s ? enrichSensor(s) : null;
  },

  // Optimized: dedicated endpoint to fetch only neighboring online sensors in a group
  async getNeighbours(sensorId, groupName) {
    await delay(200);
    if (!groupName || groupName === 'unassigned') return [];
    return sensors.filter(s => s.group === groupName && s.id !== sensorId && s.status !== 'offline').map(enrichSensor);
  },

  async addSensor(sensor) {
    await delay(200);
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
  },

  async deleteSensor(sensorId) {
    await delay(200);
    sensors = sensors.filter(s => s.id !== sensorId);
    alerts = alerts.filter(a => a.sensor !== sensorId);
    return true;
  },

  // --- ALERTS API ---
  // Optimized: filter alerts on server by state or search query
  async getAlerts(options = {}) {
    await delay(300);
    let filtered = [...alerts];
    
    if (options.searchQuery) {
      const q = options.searchQuery.toLowerCase();
      filtered = filtered.filter(alert => 
        alert.sensor.toLowerCase().includes(q) || 
        alert.id.toLowerCase().includes(q)
      );
    }
    
    if (options.state) {
      filtered = filtered.filter(alert => alert.state === options.state);
    }
    
    return filtered;
  },

  async acknowledgeAlert(alertId) {
    await delay(200);
    alerts = alerts.map(alert => 
      alert.id === alertId ? { ...alert, state: 'acknowledged' } : alert
    );
    return true;
  }
};
