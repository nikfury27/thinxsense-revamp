// API Service Layer for thinxsense revamped platform
// Mimics asynchronous backend calls with simulation latency.
// Optimized for production patterns by utilizing narrow query filters on the server/mock layer.

import {
  initialGroups,
  initialUsers,
  initialGateways,
  initialSensors,
  initialAlerts,
  initialFacilities,
  initialSensorPositions,
  initialGroupDimensions,
  initialShiftHandover,
  initialLoginSession,
  generateHistory
} from './mockData';

// Simulated latency helper
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Keep state local to memory during current session
let groups = [...initialGroups];
let users = [...initialUsers];
let gateways = [...initialGateways];
let sensors = [...initialSensors];
let alerts = [...initialAlerts];
let facilities = [...initialFacilities];
let sensorPositions = { ...initialSensorPositions };
let groupDimensions = { ...initialGroupDimensions };
let shiftHandover = { ...initialShiftHandover };
let loginSession = { ...initialLoginSession };

// Weather cache: { `${lat},${lng}` -> { data, fetchedAt } }
const weatherCache = {};
const WEATHER_TTL_MS = 20 * 60 * 1000; // 20 minutes

const fetchWeather = async (lat, lng) => {
  const key = `${lat},${lng}`;
  const cached = weatherCache[key];
  if (cached && Date.now() - cached.fetchedAt < WEATHER_TTL_MS) {
    return cached.data;
  }
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode&timezone=auto`;
    const res = await fetch(url);
    const json = await res.json();
    const data = {
      temp: json.current?.temperature_2m ?? null,
      code: json.current?.weathercode ?? 0
    };
    weatherCache[key] = { data, fetchedAt: Date.now() };
    return data;
  } catch {
    return { temp: null, code: 0 };
  }
};

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
      minTemp: parseFloat(group.minTemp) || 2.0,
      maxTemp: parseFloat(group.maxTemp) || 8.0,
      minHum: parseFloat(group.minHum) || 35.0,
      maxHum: parseFloat(group.maxHum) || 75.0,
      email: group.email || 'Not Specified',
      mobile: group.mobile || 'Not Specified',
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
    const existingIndex = sensors.findIndex(s => s.id === sensor.id);
    if (existingIndex > -1) {
      sensors[existingIndex] = {
        ...sensors[existingIndex],
        group: sensor.group || 'unassigned',
        location: sensor.location || 'Not Specified',
        lastSeen: 'Just now'
      };
      return sensors[existingIndex];
    } else {
      const randomTemp = parseFloat((Math.random() * (26 - 18) + 18).toFixed(1));
      const randomHum = parseFloat((Math.random() * (60 - 30) + 30).toFixed(1));
      const newSensor = {
        id: sensor.id,
        name: sensor.id,
        temp: randomTemp,
        hum: randomHum,
        batt: Math.floor(Math.random() * (100 - 45 + 1)) + 45, // random battery between 45% and 100%
        status: sensor.status || 'online',
        group: sensor.group || 'unassigned',
        location: sensor.location || 'Not Specified',
        dailyDrainRate: parseFloat((Math.random() * (3.0 - 0.8) + 0.8).toFixed(1)), // random drain rate between 0.8% and 3.0%
        lastSeen: 'Just now',
        history: generateHistory(randomTemp, randomHum),
        complianceScore: 100.0
      };
      sensors.push(newSensor);
      return newSensor;
    }
  },

  async deleteSensor(sensorId) {
    await delay(200);
    sensors = sensors.filter(s => s.id !== sensorId);
    alerts = alerts.filter(a => a.sensor !== sensorId);
    return true;
  },

  // --- FACILITIES API ---
  async getFacilities() {
    await delay(200);
    return facilities.map(f => ({
      ...f,
      groups: groups.filter(g => f.groupIds.includes(g.name))
    }));
  },

  async getFacilityWeather(lat, lng) {
    return fetchWeather(lat, lng);
  },

  async getSensorPositions(groupName) {
    await delay(100);
    const groupSensors = sensors.filter(s => s.group === groupName);
    return groupSensors.reduce((acc, s) => {
      if (sensorPositions[s.id]) acc[s.id] = sensorPositions[s.id];
      return acc;
    }, {});
  },

  async saveSensorPosition(sensorId, pos) {
    await delay(50);
    sensorPositions[sensorId] = pos;
    return true;
  },

  async getGroupDimensions(groupName) {
    await delay(50);
    return groupDimensions[groupName] || { width: 20, length: 15, unit: 'm' };
  },

  async saveGroupDimensions(groupName, dims) {
    await delay(50);
    groupDimensions[groupName] = dims;
    return true;
  },

  // --- SHIFT HANDOVER API ---
  async getShiftHandover() {
    await delay(100);
    return { ...shiftHandover };
  },

  async markHandoverViewed() {
    await delay(50);
    shiftHandover = { ...shiftHandover, viewed: true };
    return true;
  },

  async submitHandoverNote(note, noteType) {
    await delay(100);
    shiftHandover = {
      ...shiftHandover,
      note,
      noteType,          // 'note' | 'nothing'
      noteTimestamp: new Date().toISOString(),
      viewed: false,     // reset so next operator sees the badge
      previousOperator: loginSession.username,
    };
    return { ...shiftHandover };
  },

  // --- LOGIN SESSION API ---
  async getLoginSession() {
    await delay(50);
    return { ...loginSession };
  },

  async dismissLoginSummary() {
    await delay(50);
    loginSession = {
      ...loginSession,
      summaryDismissed: true,
      lastLogoutAt: loginSession.currentLoginAt,
    };
    return true;
  },

  // Returns alerts raised between lastLogoutAt and currentLoginAt
  async getLoginActivitySummary() {
    await delay(200);
    const from = new Date(loginSession.lastLogoutAt);
    const to = new Date(loginSession.currentLoginAt);
    const allSensors = sensors.map(enrichSensor);

    const raisedAlerts = alerts.filter(a => {
      const t = new Date(a.time);
      return t >= from && t <= to;
    });

    const resolvedAlerts = alerts.filter(a => {
      const t = new Date(a.time);
      return a.state === 'acknowledged' && t >= from && t <= to;
    });

    const offlineSensors = allSensors.filter(s => s.status === 'offline');
    const activeExcursions = allSensors.filter(s => s.status === 'warning');
    const batteryWarnings = allSensors.filter(s => s.isBatterySwapRisk);
    const commFailures = allSensors.filter(s => s.status === 'offline' && s.lastSeen && s.lastSeen.includes('hr'));

    const highestEsi = raisedAlerts.reduce((max, a) => {
      const esi = a.param === 'Temperature' && a.deviation
        ? parseFloat((a.deviation * (a.duration || 0)).toFixed(1))
        : 0;
      return esi > max ? esi : max;
    }, 0);

    return {
      lastLogoutAt: loginSession.lastLogoutAt,
      currentLoginAt: loginSession.currentLoginAt,
      raisedAlerts,
      resolvedAlerts,
      offlineSensors,
      activeExcursions,
      batteryWarnings,
      commFailures,
      stats: {
        newAlerts: raisedAlerts.length,
        resolved: resolvedAlerts.length,
        offlineSensors: offlineSensors.length,
        activeExcursions: activeExcursions.length,
        highestEsi,
      },
    };
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
