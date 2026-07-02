import React, { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';

const GroupsView = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  // Group details view state
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupSensors, setGroupSensors] = useState([]);
  const [loadingSensors, setLoadingSensors] = useState(false);
  const [showSensorModal, setShowSensorModal] = useState(false);

  // Group Form states
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sensor Form states (for adding to a group)
  const [sensorId, setSensorId] = useState('');
  const [sensorTemp, setSensorTemp] = useState('24.0');
  const [sensorHum, setSensorHum] = useState('40.0');
  const [sensorBatt, setSensorBatt] = useState('98');
  const [sensorLoc, setSensorLoc] = useState('');
  const [isSubmittingSensor, setIsSubmittingSensor] = useState(false);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await apiService.getGroups();
      setGroups(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // Fetch sensors belonging to the selected group
  const fetchGroupSensors = async (groupName) => {
    setLoadingSensors(true);
    try {
      const allSensors = await apiService.getSensors();
      const filtered = allSensors.filter(s => s.group === groupName);
      setGroupSensors(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSensors(false);
    }
  };

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupSensors(selectedGroup.name);
    }
  }, [selectedGroup]);

  const handleAddGroupSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await apiService.addGroup({ name, desc, location: location || 'Not Specified' });
      setName('');
      setDesc('');
      setLocation('');
      setShowModal(false);
      await fetchGroups(); // Refresh data
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async (groupName, e) => {
    e.stopPropagation(); // Stop row click event
    if (confirm(`Are you sure you want to delete group "${groupName}"? All its sensors will become unassigned.`)) {
      setLoading(true);
      try {
        await apiService.deleteGroup(groupName);
        if (selectedGroup && selectedGroup.name === groupName) {
          setSelectedGroup(null);
        }
        await fetchGroups();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddSensorSubmit = async (e) => {
    e.preventDefault();
    if (!sensorId.trim() || !selectedGroup) return;

    setIsSubmittingSensor(true);
    try {
      await apiService.addSensor({
        id: sensorId,
        temp: sensorTemp,
        hum: sensorHum,
        batt: sensorBatt,
        location: sensorLoc || 'Not Specified',
        group: selectedGroup.name,
        status: 'online'
      });
      setSensorId('');
      setSensorTemp('24.0');
      setSensorHum('40.0');
      setSensorBatt('98');
      setSensorLoc('');
      setShowSensorModal(false);
      await fetchGroupSensors(selectedGroup.name); // Refresh list
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingSensor(false);
    }
  };

  // Filter groups locally based on search query
  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.location && g.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fadeIn h-full">
      {/* 1. Details view layout */}
      {selectedGroup ? (
        <div className="space-y-6">
          {/* Header row */}
          <div className="flex justify-between items-center border-b border-outline-variant pb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedGroup(null)}
                className="p-1.5 hover:bg-surface-container-low border border-outline-variant/60 rounded-full text-secondary hover:text-primary transition-all duration-200 active:scale-90"
                title="Back to Groups List"
              >
                <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
              </button>
              <div>
                <span className="text-xs text-secondary font-bold uppercase tracking-wider block">Group Profile Details</span>
                <h2 className="font-headline-lg text-lg text-on-surface font-bold">
                  {selectedGroup.name}
                </h2>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={(e) => handleDeleteGroup(selectedGroup.name, e)}
                className="px-4 py-2 border border-error/20 bg-error/5 hover:bg-error/15 text-error rounded font-body-md text-xs font-semibold transition-colors flex items-center gap-1.5 active:scale-95 duration-100"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Delete Group</span>
              </button>
              <button
                onClick={() => setShowSensorModal(true)}
                className="bg-primary hover:bg-primary/95 text-white px-4 py-2 rounded font-body-md text-xs font-semibold transition-colors flex items-center gap-1.5 active:scale-95 duration-100 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>Add Sensor to Group</span>
              </button>
            </div>
          </div>

          {/* Group Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 border border-outline-variant rounded-xl shadow-sm space-y-2.5">
              <span className="text-[10px] text-secondary font-bold uppercase tracking-wider block">Group Name</span>
              <strong className="text-primary text-base font-semibold block">{selectedGroup.name}</strong>
            </div>

            <div className="bg-white p-5 border border-outline-variant rounded-xl shadow-sm space-y-2.5">
              <span className="text-[10px] text-secondary font-bold uppercase tracking-wider block">Physical Location</span>
              <strong className="text-on-surface text-base font-semibold block flex items-center gap-1">
                <span className="material-symbols-outlined text-primary text-[18px]">location_on</span>
                {selectedGroup.location || 'Not Specified'}
              </strong>
            </div>

            <div className="bg-white p-5 border border-outline-variant rounded-xl shadow-sm space-y-2.5">
              <span className="text-[10px] text-secondary font-bold uppercase tracking-wider block">Description</span>
              <p className="text-on-surface-variant text-sm block">{selectedGroup.desc || 'No description provided.'}</p>
            </div>
          </div>

          {/* Associated Sensors Table */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-secondary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">sensors</span>
              Sensors in this Group ({groupSensors.length})
            </h3>

            <div className="bg-white border border-outline-variant rounded-lg overflow-hidden flex flex-col shadow-sm">
              <div className="overflow-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 430px)' }}>
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container-low border-b border-outline-variant sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-6 font-headline-md text-xs font-bold text-on-surface uppercase tracking-wider">Sensor ID</th>
                      <th className="py-3 px-6 font-headline-md text-xs font-bold text-on-surface uppercase tracking-wider text-center">Status</th>
                      <th className="py-3 px-6 font-headline-md text-xs font-bold text-on-surface uppercase tracking-wider text-center">Current Temp</th>
                      <th className="py-3 px-6 font-headline-md text-xs font-bold text-on-surface uppercase tracking-wider text-center">Current Humidity</th>
                      <th className="py-3 px-6 font-headline-md text-xs font-bold text-on-surface uppercase tracking-wider text-center">Battery</th>
                      <th className="py-3 px-6 font-headline-md text-xs font-bold text-on-surface uppercase tracking-wider">Sensor Location Note</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-md text-xs text-on-surface divide-y divide-outline-variant">
                    {loadingSensors ? (
                      [...Array(2)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          {[...Array(6)].map((_, j) => (
                            <td key={j} className="py-3 px-6">
                              <div className="h-4 bg-outline-variant rounded w-3/4"></div>
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : groupSensors.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-on-surface-variant italic text-sm">
                          No sensors assigned to this group yet. Click "+ Add Sensor to Group" to add one.
                        </td>
                      </tr>
                    ) : (
                      groupSensors.map((sensor) => (
                        <tr key={sensor.id} className="hover:bg-surface-container-lowest transition-colors">
                          <td className="py-3 px-6 font-semibold text-primary">{sensor.id}</td>
                          <td className="py-3 px-6 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              sensor.status === 'online' ? 'text-status-green bg-status-green/10' : 'text-error bg-error/10'
                            }`}>
                              {sensor.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-center font-mono font-medium">{sensor.temp}°C</td>
                          <td className="py-3 px-6 text-center font-mono font-medium">{sensor.hum}%</td>
                          <td className="py-3 px-6 text-center font-mono font-medium">{sensor.batt}%</td>
                          
                          {/* Physical Location Note (New Feature requirement) */}
                          <td className="py-3 px-6 font-medium text-on-surface-variant flex items-center gap-1 mt-1">
                            <span className="material-symbols-outlined text-[14px] text-secondary">location_on</span>
                            {sensor.location || 'Not Specified'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 2. Groups list table view layout */
        <>
          {/* Context Title & Statistics */}
          <div className="flex justify-between items-end">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">Groups</h2>
            </div>
            <div className="font-body-md text-sm text-secondary">
              Groups - <span className="font-bold text-on-surface">Total: {filteredGroups.length}</span>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex justify-between items-center mb-stack-md">
            <div className="relative w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                search
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-body-md text-sm text-on-surface placeholder:text-outline transition-shadow"
                placeholder="Search by Group/Location..."
                type="text"
              />
            </div>
            
            <button
              onClick={() => setShowModal(true)}
              className="bg-white border border-primary text-primary hover:bg-surface-container-low px-4 py-2 rounded font-body-md text-sm font-semibold transition-colors flex items-center space-x-2 active:scale-95 duration-100"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add Group</span>
            </button>
          </div>

          {/* Data Table Container */}
          <div className="bg-white border border-outline-variant rounded-lg overflow-hidden flex flex-col shadow-sm" style={{ height: 'calc(100vh - 240px)' }}>
            <div className="overflow-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low border-b border-outline-variant sticky top-0 z-10">
                  <tr>
                    <th className="py-3.5 px-6 font-headline-md text-sm font-bold text-on-surface text-center w-20">S.No</th>
                    <th className="py-3.5 px-6 font-headline-md text-sm font-bold text-on-surface">Group Name (Access Details)</th>
                    <th className="py-3.5 px-6 font-headline-md text-sm font-bold text-on-surface text-center">Facility Location</th>
                    <th className="py-3.5 px-6 font-headline-md text-sm font-bold text-on-surface">Description</th>
                    <th className="py-3.5 px-6 font-headline-md text-sm font-bold text-on-surface text-center">Registered On</th>
                    <th className="py-3.5 px-6 font-headline-md text-sm font-bold text-on-surface text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-sm text-on-surface divide-y divide-outline-variant">
                  {loading ? (
                    [...Array(4)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-4 px-6 text-center"><div className="h-4 bg-outline-variant rounded mx-auto w-8"></div></td>
                        <td className="py-4 px-6"><div className="h-4 bg-outline-variant rounded w-32"></div></td>
                        <td className="py-4 px-6 text-center"><div className="h-4 bg-outline-variant rounded mx-auto w-24"></div></td>
                        <td className="py-4 px-6"><div className="h-4 bg-outline-variant rounded w-48"></div></td>
                        <td className="py-4 px-6 text-center"><div className="h-4 bg-outline-variant rounded mx-auto w-24"></div></td>
                        <td className="py-4 px-6 text-center"><div className="h-4 bg-outline-variant rounded mx-auto w-8"></div></td>
                      </tr>
                    ))
                  ) : filteredGroups.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-on-surface-variant italic">
                        No groups matching search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredGroups.map((row) => (
                      <tr 
                        key={row.sno} 
                        onClick={() => setSelectedGroup(row)}
                        className="hover:bg-surface-container-lowest transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-6 text-center text-on-surface-variant border-r border-outline-variant/30">{row.sno}</td>
                        <td className="py-3.5 px-6 font-semibold text-primary group-hover:underline border-r border-outline-variant/30">
                          {row.name}
                        </td>
                        
                        {/* Facility Location Badge */}
                        <td className="py-3.5 px-6 text-center border-r border-outline-variant/30 text-xs">
                          <span className="px-2.5 py-1 bg-primary-container/10 text-primary border border-primary/25 rounded-full font-medium">
                            📍 {row.location || 'Not Specified'}
                          </span>
                        </td>
                        
                        <td className="py-3.5 px-6 text-on-surface-variant border-r border-outline-variant/30">{row.desc}</td>
                        <td className="py-3.5 px-6 text-center border-r border-outline-variant/30 text-xs">{row.registered}</td>
                        
                        {/* Remove Action Button */}
                        <td className="py-3.5 px-6 text-center">
                          <button
                            onClick={(e) => handleDeleteGroup(row.name, e)}
                            className="p-1 hover:bg-error-container/20 rounded-full text-secondary hover:text-error transition-all duration-200 active:scale-90"
                            title={`Delete group ${row.name}`}
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="border-t border-outline-variant py-3 px-6 flex justify-center items-center bg-white shrink-0 space-x-2">
              <button className="w-8 h-8 flex items-center justify-center rounded-full text-outline hover:bg-surface-container-low disabled:opacity-30" disabled>
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-bold text-sm">
                1
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-full text-outline hover:bg-surface-container-low disabled:opacity-30" disabled>
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add Group Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center animate-fadeIn">
          <div className="bg-white rounded-xl shadow-lg border border-outline-variant max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 bg-primary text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Add New Group</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="hover:bg-white/10 p-1 rounded-full text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddGroupSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
                  Group Name *
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="e.g. alert1"
                />
              </div>

              {/* Physical Location Input Field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
                  Facility Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="e.g. Cold Room 2, Rack 3"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
                  Description
                </label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm h-24"
                  placeholder="Describe this group's sensors..."
                />
              </div>

              <div className="pt-4 flex justify-end space-x-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-outline-variant text-secondary rounded text-sm hover:bg-surface-container-low transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded text-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Sensor to Group Modal */}
      {showSensorModal && selectedGroup && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center animate-fadeIn">
          <div className="bg-white rounded-xl shadow-lg border border-outline-variant max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 bg-primary text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Add Sensor to Group: {selectedGroup.name}</h3>
              <button 
                onClick={() => setShowSensorModal(false)}
                className="hover:bg-white/10 p-1 rounded-full text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddSensorSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
                  Sensor ID *
                </label>
                <input
                  required
                  type="text"
                  value={sensorId}
                  onChange={(e) => setSensorId(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="e.g. H9B00100"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
                    Temp (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={sensorTemp}
                    onChange={(e) => setSensorTemp(e.target.value)}
                    className="w-full px-3 py-2 border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
                    Humidity (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={sensorHum}
                    onChange={(e) => setSensorHum(e.target.value)}
                    className="w-full px-3 py-2 border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
                    Battery (%)
                  </label>
                  <input
                    type="number"
                    value={sensorBatt}
                    onChange={(e) => setSensorBatt(e.target.value)}
                    className="w-full px-3 py-2 border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Physical Location Note (New Feature Requirement) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
                  Sensor Location Note
                </label>
                <input
                  type="text"
                  value={sensorLoc}
                  onChange={(e) => setSensorLoc(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="e.g. Cold Room 2, Rack 5"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowSensorModal(false)}
                  className="px-4 py-2 border border-outline-variant text-secondary rounded text-sm hover:bg-surface-container-low transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSensor}
                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded text-sm transition-colors disabled:opacity-50"
                >
                  {isSubmittingSensor ? 'Adding...' : 'Add Sensor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupsView;
