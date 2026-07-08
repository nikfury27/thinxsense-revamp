import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../api/apiService';
import FloorPlanView from '../components/floorplan/FloorPlanView';

const weatherInfo = (code) => {
  if (code === 0) return { icon: '☀️', label: 'Clear' };
  if (code <= 3) return { icon: '⛅', label: 'Partly cloudy' };
  if (code <= 48) return { icon: '🌫️', label: 'Foggy' };
  if (code <= 67) return { icon: '🌧️', label: 'Rain' };
  if (code <= 77) return { icon: '❄️', label: 'Snow' };
  if (code <= 82) return { icon: '🌦️', label: 'Showers' };
  return { icon: '⛈️', label: 'Thunderstorm' };
};

const LocalTime = ({ timezone }) => {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => {
      setTime(new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }).format(new Date()));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [timezone]);
  return <span className="font-mono text-sm font-bold text-on-surface">{time}</span>;
};

const FacilityStatusChip = ({ groups, allSensors }) => {
  const groupNames = groups.map(g => g.name);
  const facilityS = allSensors.filter(s => groupNames.includes(s.group));
  const hasAlert = facilityS.some(s => s.status === 'warning');
  const hasOffline = facilityS.some(s => s.status === 'offline');
  if (hasAlert) return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-error/10 text-error">ALERT</span>
  );
  if (hasOffline) return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-outline/10 text-outline">OFFLINE</span>
  );
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-status-green/10 text-status-green">NORMAL</span>
  );
};

const WeatherBadge = ({ lat, lng }) => {
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    apiService.getFacilityWeather(lat, lng).then(setWeather);
  }, [lat, lng]);
  if (!weather || weather.temp === null) return <span className="text-xs text-outline">—</span>;
  const { icon, label } = weatherInfo(weather.code);
  return (
    <span className="flex items-center gap-1 text-sm">
      <span>{icon}</span>
      <span className="font-bold text-on-surface">{weather.temp}°C</span>
      <span className="text-on-surface-variant text-xs">{label}</span>
    </span>
  );
};

// Facility List Card
const isOpenNow = (operatingHours, timezone) => {
  const now = new Date();
  const localStr = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false
  }).format(now);
  // localStr is "HH:MM" — compare numerically
  const [h, m] = localStr.split(':').map(Number);
  const nowMins = h * 60 + m;
  const [oh, om] = operatingHours.open.split(':').map(Number);
  const [ch, cm] = operatingHours.close.split(':').map(Number);
  const openMins  = oh * 60 + om;
  const closeMins = ch * 60 + cm;
  // Handle midnight-spanning shifts (e.g. 00:00–23:59 is always open)
  return closeMins >= openMins
    ? nowMins >= openMins && nowMins <= closeMins
    : nowMins >= openMins || nowMins <= closeMins;
};

const FacilityCard = ({ facility, allSensors, onClick }) => {
  const is24h = facility.operatingHours.open === '00:00' && facility.operatingHours.close === '23:59';
  const isOpen = is24h || isOpenNow(facility.operatingHours, facility.timezone);
  const sensorCount = allSensors.filter(s => facility.groups.map(g => g.name).includes(s.group)).length;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary/30 cursor-pointer transition-all duration-200 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-bold text-base text-on-surface truncate">{facility.name}</h3>
          <p className="text-xs text-on-surface-variant mt-0.5 truncate">{facility.city}, {facility.country}</p>
        </div>
        <FacilityStatusChip groups={facility.groups} allSensors={allSensors} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <span className="text-secondary block">Local Time</span>
          <LocalTime timezone={facility.timezone} />
        </div>
        <div>
          <span className="text-secondary block">Weather</span>
          <WeatherBadge lat={facility.lat} lng={facility.lng} />
        </div>
        <div>
          <span className="text-secondary block">Operating Hours</span>
          <span className="font-semibold text-on-surface">
            {is24h ? '24 / 7' : `${facility.operatingHours.open} – ${facility.operatingHours.close}`}
            <span className={`ml-1.5 text-[10px] font-bold ${isOpen ? 'text-status-green' : 'text-error'}`}>
              {isOpen ? '● Open' : '● Closed'}
            </span>
          </span>
        </div>
        <div>
          <span className="text-secondary block">Rooms</span>
          <span className="font-semibold text-on-surface">
            {facility.groups.length} room{facility.groups.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-outline-variant/40 flex items-center justify-between text-xs text-secondary">
        <span>{sensorCount} sensor{sensorCount !== 1 ? 's' : ''} across {facility.groups.length} room{facility.groups.length !== 1 ? 's' : ''}</span>
        <span className="flex items-center gap-1 text-primary font-semibold">
          View Floor Plan <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </span>
      </div>
    </div>
  );
};

// Facility Floor Plan page
const FacilityFloorPlan = ({ facility, allSensors, onBack, onNavigate }) => {
  const [selectedGroup, setSelectedGroup] = useState(facility.groups[0] || null);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-outline-variant pb-3 shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-surface-container-low border border-outline-variant/60 rounded-full text-secondary hover:text-primary transition-all active:scale-90"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div className="flex-1 min-w-0">
          <span className="text-xs text-secondary font-bold uppercase tracking-wider block">ThinxVerse · Floor Plan</span>
          <h2 className="font-bold text-lg text-on-surface truncate">{facility.name}</h2>
        </div>
        <div className="flex items-center gap-3 text-xs shrink-0">
          <WeatherBadge lat={facility.lat} lng={facility.lng} />
          <span className="text-secondary">·</span>
          <LocalTime timezone={facility.timezone} />
        </div>
      </div>

      {/* Room tabs (if multiple groups) */}
      {facility.groups.length > 1 && (
        <div className="flex gap-2 flex-wrap shrink-0">
          {facility.groups.map(g => (
            <button
              key={g.name}
              onClick={() => setSelectedGroup(g)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                selectedGroup?.name === g.name
                  ? 'bg-primary text-white'
                  : 'bg-white border border-outline-variant text-secondary hover:bg-surface-container-low'
              }`}
            >
              {g.location || g.name}
            </button>
          ))}
        </div>
      )}

      {/* Floor plan */}
      {selectedGroup ? (
        <div className="flex-1 min-h-0">
          <FloorPlanView
            group={selectedGroup}
            allSensors={allSensors}
            onSensorClick={(sensorId) => onNavigate('sensors', sensorId)}
            onNavigate={onNavigate}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm">
          No rooms assigned to this facility.
        </div>
      )}
    </div>
  );
};

// Main ThinxVerse View
const ThinxVerseView = ({ onNavigate }) => {
  const [facilities, setFacilities] = useState([]);
  const [allSensors, setAllSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState(null);

  useEffect(() => {
    Promise.all([
      apiService.getFacilities(),
      apiService.getSensors()
    ]).then(([facs, sens]) => {
      setFacilities(facs);
      setAllSensors(sens);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse bg-white border border-outline-variant rounded-xl p-5 h-48">
            <div className="h-5 bg-outline-variant rounded w-2/3 mb-2" />
            <div className="h-3 bg-outline-variant rounded w-1/2 mb-4" />
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, j) => <div key={j} className="h-8 bg-outline-variant rounded" />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (selectedFacility) {
    return (
      <FacilityFloorPlan
        facility={selectedFacility}
        allSensors={allSensors}
        onBack={() => setSelectedFacility(null)}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">ThinxVerse</h2>
          <p className="text-sm text-on-surface-variant mt-0.5">Spatial facility explorer — {facilities.length} facilities</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {facilities.map(f => (
          <FacilityCard
            key={f.id}
            facility={f}
            allSensors={allSensors}
            onClick={() => setSelectedFacility(f)}
          />
        ))}
      </div>
    </div>
  );
};

export default ThinxVerseView;
