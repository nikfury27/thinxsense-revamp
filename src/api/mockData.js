// Mock Database for Thinxsense IoT Platform with Feature Enhancements

// --- FACILITIES ---
export const initialFacilities = [
  {
    // Large warehouse — 6 sensors spread across 120m × 60m, shows small radar bubbles
    id: 'FAC-001',
    name: 'Mumbai Cold Chain Hub',
    address: 'Andheri East, Mumbai, Maharashtra 400069, India',
    lat: 19.1136,
    lng: 72.8697,
    timezone: 'Asia/Kolkata',
    operatingHours: { open: '06:00', close: '22:00' },
    dimensions: { width: 120, length: 60, unit: 'm' },
    groupIds: ['werrrsdsddf', 'co2sdasdf']
  },
  {
    // Small cold room — single sensor, 8m × 6m, radar bubble nearly fills the room
    id: 'FAC-002',
    name: 'Berlin Pharma Cold Room',
    address: 'Tempelhof, Berlin 12101, Germany',
    lat: 52.4831,
    lng: 13.3836,
    timezone: 'Europe/Berlin',
    operatingHours: '24/7',
    dimensions: { width: 8, length: 6, unit: 'm' },
    groupIds: ['alert1']
  },
  {
    // Medium room — 2 sensors, 35m × 20m, partial overlap of bubbles
    id: 'FAC-003',
    name: 'New York Distribution Center',
    address: '45 Industrial Blvd, Queens, NY 11101, USA',
    lat: 40.7282,
    lng: -73.9442,
    timezone: 'America/New_York',
    operatingHours: { open: '07:00', close: '23:00' },
    dimensions: { width: 35, length: 20, unit: 'm' },
    groupIds: ['wewe']
  },
  {
    // Very large open floor — 4 sensors, 200m × 80m, tiny bubbles relative to space
    id: 'FAC-004',
    name: 'Singapore Mega Logistics Park',
    address: '10 Tuas South Ave 6, Singapore 637021',
    lat: 1.2966,
    lng: 103.6378,
    timezone: 'Asia/Singapore',
    operatingHours: '24/7',
    dimensions: { width: 200, length: 80, unit: 'm' },
    groupIds: ['Group']
  }
];

// Sensor floor-plan positions: { sensorId -> { x: 0-1, y: 0-1 } } (normalized coords)
export const initialSensorPositions = {
  // werrrsdsddf — large warehouse, 3 sensors spread wide
  'H9B00008': { x: 0.15, y: 0.35 },
  'H9B00009': { x: 0.50, y: 0.35 },
  'BRR00001': { x: 0.82, y: 0.35 },
  // co2sdasdf — large warehouse, 3 sensors on lower half
  'H9B00012': { x: 0.25, y: 0.72 },
  'BRR00002': { x: 0.55, y: 0.72 },
  // alert1 — single sensor, small cold room, centred
  'H9B00045': { x: 0.50, y: 0.50 },
  // wewe — 2 sensors, medium room
  'H9B00021': { x: 0.28, y: 0.50 },
  'H9B00022': { x: 0.72, y: 0.50 },
  // Group — 4 sensors, very large floor
  'H9B00067': { x: 0.15, y: 0.30 },
  'H9B00089': { x: 0.45, y: 0.30 },
  'BRR00005': { x: 0.72, y: 0.65 },
  'BRR00004': { x: 0.88, y: 0.65 },
};

// Group layout dimensions — deliberately varied to demo scaling
export const initialGroupDimensions = {
  'werrrsdsddf': { width: 120, length: 60, unit: 'm' }, // huge warehouse
  'co2sdasdf':   { width: 120, length: 60, unit: 'm' }, // same building, different zone
  'alert1':      { width: 8,   length: 6,  unit: 'm' }, // tiny cold room — single sensor fills it
  'wewe':        { width: 35,  length: 20, unit: 'm' }, // medium room — 2 sensors, partial overlap
  'Group':       { width: 200, length: 80, unit: 'm' }, // mega floor — 4 sensors look tiny
};

export const initialGroups = [
  { sno: 1, name: 'werrrsdsddf', desc: 'Main storage cooling', registered: '16-06-2026, 15:49', location: 'Cold Room 1' },
  { sno: 2, name: 'co2sdasdf', desc: 'Carbon dioxide & temp sensors', registered: '24-04-2026, 11:28', location: 'Lab Area A' },
  { sno: 3, name: 'wewe', desc: 'Raw material storage', registered: '02-03-2026, 10:51', location: 'Cold Room 3' },
  { sno: 4, name: 'alert1', desc: 'Vaccine storage facility', registered: '27-01-2026, 15:08', location: 'Cold Room 2' },
  { sno: 5, name: 'Group', desc: 'General facility monitors', registered: '21-01-2026, 16:49', location: 'Loading Dock' }
];

export const initialUsers = [
  { sno: 1, name: 'shwetha', role: 'ADMIN', email: 'shwetha@thinxsense.com', registered: '12-01-2026' }
];

export const initialGateways = [
  {
    id: 'GGWCL00060',
    status: 'offline',
    signal: -85,
    ip: 'Unknown',
    uptime: '0h',
    properties: {
      "Gateway": "GGWCL00060",
      "Internal temp sensor enable": "1",
      "Powered by": "mains",
      "Ble1 enable": "1",
      "Battery": "94",
      "dailyDrainRate": "1.2",
      "Ble2 enable": "1",
      "Last updated": "29 Jun 2026, 16:26:17",
      "LR enable": "1",
      "Firmware version": "1.0.13",
      "IMEI": "No Data",
      "Hardware version": "1.1",
      "SIM CCID": "No Data",
      "GPS enabled": "1",
      "Packet number": "42248",
      "Mod bus enabled": "0",
      "Communication mode": "MQTTS",
      "Charging status": "Not_Charging",
      "Wifi enable": "1",
      "Cellular enable": "0",
      "Ethernet enable": "0"
    }
  },
  {
    id: 'GGWCL00061',
    status: 'online',
    signal: -72,
    ip: '192.168.1.105',
    uptime: '14d 1h',
    properties: {
      "Gateway": "GGWCL00061",
      "Internal temp sensor enable": "1",
      "Powered by": "mains",
      "Ble1 enable": "1",
      "Battery": "88",
      "dailyDrainRate": "1.5",
      "Ble2 enable": "1",
      "Last updated": "29 Jun 2026, 16:30:00",
      "LR enable": "1",
      "Firmware version": "1.0.13",
      "IMEI": "860432123456789",
      "Hardware version": "1.1",
      "SIM CCID": "8901234567890123456",
      "GPS enabled": "1",
      "Packet number": "45981",
      "Mod bus enabled": "0",
      "Communication mode": "MQTTS",
      "Charging status": "Charging",
      "Wifi enable": "1",
      "Cellular enable": "1",
      "Ethernet enable": "0"
    }
  },
  {
    id: 'GGWCL00062',
    status: 'online',
    signal: -68,
    ip: '192.168.1.109',
    uptime: '3d 2h',
    properties: {
      "Gateway": "GGWCL00062",
      "Internal temp sensor enable": "1",
      "Powered by": "battery",
      "Ble1 enable": "1",
      "Battery": "16",
      "dailyDrainRate": "4.0",
      "Ble2 enable": "1",
      "Last updated": "29 Jun 2026, 16:32:00",
      "LR enable": "1",
      "Firmware version": "1.0.13",
      "IMEI": "860432123456790",
      "Hardware version": "1.1",
      "SIM CCID": "8901234567890123457",
      "GPS enabled": "1",
      "Packet number": "23101",
      "Mod bus enabled": "0",
      "Communication mode": "MQTTS",
      "Charging status": "Not_Charging",
      "Wifi enable": "1",
      "Cellular enable": "1",
      "Ethernet enable": "0"
    }
  }
];

// Generate mock temperature/humidity history for time-series charts
export const generateHistory = (baseTemp, baseHum) => {
  const history = [];
  const now = new Date();
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    history.push({
      time: timeString,
      temp: parseFloat((baseTemp + (Math.random() - 0.5) * 1.5).toFixed(1)),
      hum: parseFloat((baseHum + (Math.random() - 0.5) * 3).toFixed(1))
    });
  }
  return history;
};

// Generate steadily rising temperature history for early trend warnings
const generateRisingHistory = (startTemp, endTemp, baseHum) => {
  const history = [];
  const now = new Date();
  const steps = 24;
  const tempStep = (endTemp - startTemp) / steps;
  for (let i = steps; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    history.push({
      time: timeString,
      temp: parseFloat((startTemp + tempStep * (steps - i) + (Math.random() - 0.5) * 0.1).toFixed(1)),
      hum: parseFloat((baseHum + (Math.random() - 0.5) * 2).toFixed(1))
    });
  }
  return history;
};

export const initialSensors = [
  // werrrsdsddf — large warehouse (120m×60m), 3 sensors, all in breach (red)
  { id: 'H9B00008', name: 'H9B00008', temp: 29.2, hum: 37.0, batt: 94, lastSeen: '2 mins ago', status: 'warning', group: 'werrrsdsddf', location: 'Rack A', history: generateHistory(29, 37), complianceScore: 92.1, dailyDrainRate: 1.1 },
  { id: 'H9B00009', name: 'H9B00009', temp: 28.8, hum: 38.2, batt: 90, lastSeen: '3 mins ago', status: 'warning', group: 'werrrsdsddf', location: 'Rack B', history: generateHistory(28, 38), complianceScore: 93.0, dailyDrainRate: 1.3 },
  { id: 'BRR00001', name: 'BRR00001', temp: 28.5, hum: 35.0, batt: 92, lastSeen: '12 mins ago', status: 'warning', group: 'werrrsdsddf', location: 'Rack C', history: generateHistory(28, 35), complianceScore: 94.0, dailyDrainRate: 1.8 },

  // co2sdasdf — same large building, lower zone: 1 normal, 1 trend-risk (yellow), 1 offline
  { id: 'H9B00012', name: 'H9B00012', temp: 22.4, hum: 42.5, batt: 88, lastSeen: '5 mins ago', status: 'online', group: 'co2sdasdf', location: 'Table 2', history: generateHistory(22, 42), complianceScore: 98.0, dailyDrainRate: 1.5 },
  { id: 'BRR00002', name: 'BRR00002', temp: 23.9, hum: 36.2, batt: 75, lastSeen: '8 mins ago', status: 'online', group: 'co2sdasdf', location: 'Table 3', history: generateRisingHistory(20.5, 23.9, 36), complianceScore: 90.0, dailyDrainRate: 2.0 },

  // alert1 — tiny cold room (8m×6m), SINGLE sensor, breach (red bubble fills the room)
  { id: 'H9B00045', name: 'H9B00045', temp: 31.2, hum: 88.0, batt: 12, lastSeen: '1 min ago', status: 'warning', group: 'alert1', location: 'Centre', history: generateHistory(30, 85), complianceScore: 68.4, dailyDrainRate: 3.0 },

  // wewe — medium room (35m×20m), 2 sensors: 1 normal, 1 trend-risk (yellow)
  { id: 'H9B00021', name: 'H9B00021', temp: 24.6, hum: 45.0, batt: 82, lastSeen: '3 mins ago', status: 'online', group: 'wewe', location: 'Shelf C', history: generateRisingHistory(21.2, 24.6, 45.0), complianceScore: 100.0, dailyDrainRate: 1.2 },
  { id: 'H9B00022', name: 'H9B00022', temp: 21.0, hum: 30.1, batt: 100, lastSeen: '2 mins ago', status: 'online', group: 'wewe', location: 'Shelf B', history: generateHistory(21, 30), complianceScore: 99.5, dailyDrainRate: 1.2 },

  // Group — mega floor (200m×80m), 4 sensors: mix of normal, offline, trend-risk
  { id: 'H9B00067', name: 'H9B00067', temp: 22.5, hum: 40.2, batt: 76, lastSeen: 'Just now', status: 'online', group: 'Group', location: 'Zone A', history: generateHistory(22, 40), complianceScore: 98.7, dailyDrainRate: 1.6 },
  { id: 'H9B00089', name: 'H9B00089', temp: 23.8, hum: 39.5, batt: 82, lastSeen: '10 mins ago', status: 'online', group: 'Group', location: 'Zone B', history: generateRisingHistory(20.0, 23.8, 39), complianceScore: 99.2, dailyDrainRate: 1.4 },
  { id: 'BRR00005', name: 'BRR00005', temp: 29.9, hum: 37.0, batt: 50, lastSeen: '1 day ago', status: 'offline', group: 'Group', location: 'Zone C', history: [], complianceScore: 95.0, dailyDrainRate: 2.8 },
  { id: 'BRR00004', name: 'BRR00004', temp: 22.5, hum: 41.0, batt: 63, lastSeen: '2 hrs ago', status: 'offline', group: 'Group', location: 'Zone D', history: [], complianceScore: 94.0, dailyDrainRate: 2.4 },

  // Unassigned / legacy sensors kept for alert history references
  { id: 'H9B00046', name: 'H9B00046', temp: 24.1, hum: 41.2, batt: 91, lastSeen: '3 mins ago', status: 'online', group: 'alert1', location: 'Rack 4', history: generateHistory(24, 40), complianceScore: 99.8, dailyDrainRate: 1.0 },
  { id: 'H9B00047', name: 'H9B00047', temp: 23.8, hum: 39.8, batt: 95, lastSeen: '4 mins ago', status: 'online', group: 'alert1', location: 'Rack 2', history: generateHistory(23, 40), complianceScore: 100.0, dailyDrainRate: 0.9 },
  { id: 'BRR00003', name: 'BRR00003', temp: 29.6, hum: 39.0, batt: 84, lastSeen: 'Just now', status: 'offline', group: 'wewe', location: 'Shelf A', history: [], complianceScore: 0.0, dailyDrainRate: 2.2 },
];

export const initialAlerts = [
  // Severe deviation in Room B (Cold Room 2) - high ESI (Duration: 45m, Max Deviation: 6.2°C -> ESI: 279)
  { 
    id: 'ALT-9921', 
    sensor: 'H9B00045', 
    sensorName: 'H9B00045', 
    time: '5/26/2026, 3:10:00 PM', 
    param: 'Temperature', 
    val: '31.2', 
    threshold: '> 25°C', 
    state: 'unacknowledged', 
    arrow: 'upward', 
    humVal: '88',
    deviation: 6.2, 
    duration: 45, 
    location: 'Cold Room 2, Rack 3',
    room: 'Room B (Severe Excursion)'
  },
  
  // Room A (Cold Room 1) spikes - low ESI (Duration: 5m, Max Deviation: 0.5°C -> ESI: 2.5)
  { 
    id: 'ALT-9001', 
    sensor: 'H9B00008', 
    sensorName: 'H9B00008', 
    time: '5/26/2026, 3:10:00 PM', 
    param: 'Temperature', 
    val: '25.5', 
    threshold: '> 25°C', 
    state: 'unacknowledged', 
    arrow: 'upward', 
    humVal: '40',
    deviation: 0.5, 
    duration: 5, 
    location: 'Cold Room 1, Rack A',
    room: 'Room A (Minor Spikes)'
  },
  { 
    id: 'ALT-9002', 
    sensor: 'H9B00008', 
    sensorName: 'H9B00008', 
    time: '5/26/2026, 2:55:00 PM', 
    param: 'Temperature', 
    val: '25.4', 
    threshold: '> 25°C', 
    state: 'unacknowledged', 
    arrow: 'upward', 
    humVal: '39',
    deviation: 0.4, 
    duration: 6, 
    location: 'Cold Room 1, Rack A',
    room: 'Room A (Minor Spikes)'
  },
  { 
    id: 'ALT-9003', 
    sensor: 'H9B00008', 
    sensorName: 'H9B00008', 
    time: '5/26/2026, 2:40:00 PM', 
    param: 'Temperature', 
    val: '25.6', 
    threshold: '> 25°C', 
    state: 'unacknowledged', 
    arrow: 'upward', 
    humVal: '39',
    deviation: 0.6, 
    duration: 4, 
    location: 'Cold Room 1, Rack A',
    room: 'Room A (Minor Spikes)'
  },

  // Other historical / mock alerts
  { 
    id: 'ALT-9920', 
    sensor: 'H9B00045', 
    sensorName: 'H9B00045', 
    time: '5/26/2026, 3:05:00 PM', 
    param: 'Humidity', 
    val: '88.0', 
    threshold: '> 80%', 
    state: 'acknowledged', 
    arrow: 'upward', 
    humVal: '88',
    deviation: 8.0,
    duration: 20,
    location: 'Cold Room 2, Rack 3',
    room: 'Room B (Severe Excursion)'
  },
  { 
    id: 'ALT-9850', 
    sensor: 'H9B00022', 
    sensorName: 'H9B00022', 
    time: '5/26/2026, 2:40:00 PM', 
    param: 'Connection', 
    val: 'Timeout', 
    threshold: 'N/A', 
    state: 'unacknowledged', 
    arrow: 'none', 
    humVal: '-',
    deviation: 0,
    duration: 120,
    location: 'Cold Room 3, Shelf B',
    room: 'Cold Room 3'
  }
];
