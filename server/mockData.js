// Server-side Mock Data to drive the Guided Chatbot
export const mockGroups = [
  { sno: 1, name: 'Cold Room 1', desc: 'Primary cold storage for vaccines and high-value inventory', location: 'Mumbai Cold Hub' },
  { sno: 2, name: 'Cold Room 2', desc: 'Critical storage with elevated monitoring for sensitive goods', location: 'Mumbai Cold Hub' },
  { sno: 3, name: 'Cold Room 3', desc: 'Secondary backup storage chamber for frozen stock', location: 'Berlin Cold Room' },
  { sno: 4, name: 'Loading Dock', desc: 'Cross-dock temperature monitoring for incoming pallets', location: 'New York Warehouse' },
  { sno: 5, name: 'Lab Storage', desc: 'Research sample storage with controlled environmental thresholds', location: 'Singapore Mega Hub' }
];

export const mockGateways = [
  { id: 'GGWCL00060', status: 'offline', signal: -85, ip: 'Unknown', uptime: '0h', battery: 94 },
  { id: 'GGWCL00061', status: 'online', signal: -72, ip: '192.168.1.105', uptime: '14d 1h', battery: 88 },
  { id: 'GGWCL00062', status: 'online', signal: -68, ip: '192.168.1.109', uptime: '3d 2h', battery: 16 }
];

export const mockSensors = [
  { id: 'H9B00008', temp: 29.2, hum: 37.0, batt: 94, status: 'warning', group: 'Cold Room 1', location: 'Rack A' },
  { id: 'H9B00009', temp: 28.8, hum: 38.2, batt: 90, status: 'warning', group: 'Cold Room 1', location: 'Rack B' },
  { id: 'H9B00012', temp: 24.1, hum: 42.5, batt: 88, status: 'online', group: 'Lab Storage', location: 'Table 2' },
  { id: 'H9B00021', temp: 24.6, hum: 45.0, batt: 82, status: 'online', group: 'Cold Room 3', location: 'Shelf C' },
  { id: 'H9B00045', temp: 31.2, hum: 88.0, batt: 12, status: 'warning', group: 'Cold Room 2', location: 'Rack 3' },
  { id: 'H9B00046', temp: 24.1, hum: 41.2, batt: 91, status: 'online', group: 'Cold Room 2', location: 'Rack 4' },
  { id: 'H9B00047', temp: 23.8, hum: 39.8, batt: 95, status: 'online', group: 'Cold Room 2', location: 'Rack 2' },
  { id: 'H9B00022', temp: 22.0, hum: 30.1, batt: 100, status: 'offline', group: 'Cold Room 3', location: 'Shelf B' },
  { id: 'H9B00067', temp: 26.5, hum: 40.2, batt: 76, status: 'warning', group: 'Loading Dock', location: 'Door' },
  { id: 'H9B00089', temp: 27.8, hum: 39.5, batt: 82, status: 'warning', group: 'Loading Dock', location: 'Freezer' },
  { id: 'BRR00001', temp: 28.5, hum: 35.0, batt: 92, status: 'warning', group: 'Cold Room 1', location: 'Rack C' },
  { id: 'BRR00002', temp: 21.3, hum: 36.2, batt: 75, status: 'offline', group: 'Lab Storage', location: 'Table 3' },
  { id: 'BRR00003', temp: 29.6, hum: 39.0, batt: 84, status: 'offline', group: 'Cold Room 3', location: 'Shelf A' },
  { id: 'BRR00004', temp: 22.5, hum: 41.0, batt: 63, status: 'offline', group: 'Cold Room 2', location: 'Rack 1' },
  { id: 'BRR00005', temp: 29.9, hum: 37.0, batt: 50, status: 'offline', group: 'Loading Dock', location: 'Desk' }
];

export const mockAlerts = [
  { id: 'ALT-9921', sensor: 'H9B00045', val: '31.2', threshold: '> 25°C', state: 'unacknowledged', deviation: 6.2, duration: 45, location: 'Cold Room 2, Rack 3', room: 'Room B (Severe Excursion)' },
  { id: 'ALT-9001', sensor: 'H9B00008', val: '25.5', threshold: '> 25°C', state: 'unacknowledged', deviation: 0.5, duration: 5, location: 'Cold Room 1, Rack A', room: 'Room A (Minor Spikes)' },
  { id: 'ALT-9002', sensor: 'H9B00008', val: '25.4', threshold: '> 25°C', state: 'unacknowledged', deviation: 0.4, duration: 6, location: 'Cold Room 1, Rack A', room: 'Room A (Minor Spikes)' },
  { id: 'ALT-9003', sensor: 'H9B00008', val: '25.6', threshold: '> 25°C', state: 'unacknowledged', deviation: 0.6, duration: 4, location: 'Cold Room 1, Rack A', room: 'Room A (Minor Spikes)' },
  { id: 'ALT-9920', sensor: 'H9B00045', val: '88.0', threshold: '> 80%', state: 'acknowledged', deviation: 8.0, duration: 20, location: 'Cold Room 2, Rack 3', room: 'Room B (Severe Excursion)' },
  { id: 'ALT-9850', sensor: 'H9B00022', val: 'Timeout', threshold: 'N/A', state: 'unacknowledged', deviation: 0, duration: 120, location: 'Cold Room 3, Shelf B', room: 'Cold Room 3' }
];
