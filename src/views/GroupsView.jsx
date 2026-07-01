import React, { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';

const GroupsView = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  // Modal form states
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Filter groups locally based on search query
  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.location && g.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fadeIn h-full">
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
                <th className="py-3.5 px-6 font-headline-md text-sm font-bold text-on-surface text-center w-24">S.No</th>
                <th className="py-3.5 px-6 font-headline-md text-sm font-bold text-on-surface text-center">Group Name</th>
                <th className="py-3.5 px-6 font-headline-md text-sm font-bold text-on-surface text-center">Facility Location</th>
                <th className="py-3.5 px-6 font-headline-md text-sm font-bold text-on-surface text-center">Description</th>
                <th className="py-3.5 px-6 font-headline-md text-sm font-bold text-on-surface text-center">Registered On</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-sm text-on-surface divide-y divide-outline-variant">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6 text-center border-r border-outline-variant/35"><div className="h-4 bg-outline-variant rounded mx-auto w-8"></div></td>
                    <td className="py-4 px-6 text-center border-r border-outline-variant/35"><div className="h-4 bg-outline-variant rounded mx-auto w-32"></div></td>
                    <td className="py-4 px-6 text-center border-r border-outline-variant/35"><div className="h-4 bg-outline-variant rounded mx-auto w-32"></div></td>
                    <td className="py-4 px-6 text-center border-r border-outline-variant/35"><div className="h-4 bg-outline-variant rounded mx-auto w-48"></div></td>
                    <td className="py-4 px-6 text-center"><div className="h-4 bg-outline-variant rounded mx-auto w-32"></div></td>
                  </tr>
                ))
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-on-surface-variant italic">
                    No groups matching search filter.
                  </td>
                </tr>
              ) : (
                filteredGroups.map((row) => (
                  <tr key={row.sno} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="py-3 px-6 text-center border-r border-outline-variant/30">{row.sno}</td>
                    <td className="py-3 px-6 text-center font-semibold text-primary border-r border-outline-variant/30">{row.name}</td>
                    
                    {/* Facility Location Badge (New Feature) */}
                    <td className="py-3 px-6 text-center border-r border-outline-variant/30 text-xs">
                      <span className="px-2.5 py-1 bg-primary-container/10 text-primary border border-primary/25 rounded-full font-medium">
                        📍 {row.location || 'Not Specified'}
                      </span>
                    </td>
                    
                    <td className="py-3 px-6 text-center text-on-surface-variant border-r border-outline-variant/30">{row.desc}</td>
                    <td className="py-3 px-6 text-center">{row.registered}</td>
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
                  placeholder="e.g. werrrsdsddf"
                />
              </div>

              {/* Physical Location Input Field (New Feature) */}
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
    </div>
  );
};

export default GroupsView;
