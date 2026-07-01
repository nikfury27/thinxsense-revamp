import React, { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';

const UsersView = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All Users'); // 'All Users' | 'Assign Sensors'
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('USER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiService.getUsers();
      setUsers(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsSubmitting(true);
    try {
      await apiService.addUser({ name, email, role });
      setName('');
      setEmail('');
      setRole('USER');
      setShowModal(false);
      await fetchUsers(); // Refresh
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 h-full flex flex-col animate-fadeIn">
      
      {/* Context Header & Actions */}
      <div className="flex justify-between items-center mb-stack-md border-b border-outline-variant pb-2 shrink-0">
        <div className="flex gap-6">
          <button 
            onClick={() => setActiveTab('All Users')}
            className={`font-headline-md text-[16px] pb-2 font-bold transition-all duration-200 border-b-2 ${
              activeTab === 'All Users'
                ? 'text-primary border-primary'
                : 'text-on-surface-variant hover:text-primary border-transparent'
            }`}
          >
            All Users
          </button>
          <button 
            onClick={() => {
              setActiveTab('Assign Sensors');
              alert('Assign Sensors workflow is a stub in this POC.');
            }}
            className={`font-headline-md text-[16px] pb-2 font-bold transition-all duration-200 border-b-2 ${
              activeTab === 'Assign Sensors'
                ? 'text-primary border-primary'
                : 'text-on-surface-variant hover:text-primary border-transparent'
            }`}
          >
            Assign Sensors
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">
              search
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-outline-variant rounded-full text-xs focus:ring-2 focus:ring-primary focus:border-primary w-64 shadow-sm"
              placeholder="Search Users..."
              type="text"
            />
          </div>
          
          <button 
            onClick={() => setShowModal(true)}
            className="bg-primary-container hover:bg-primary text-white px-4 py-2 rounded-full flex items-center gap-2 transition-all shadow-sm font-body-md text-xs active:scale-95 duration-100"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add User
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="bg-white rounded-xl border border-outline-variant h-full flex items-center justify-center p-12 text-center shadow-sm">
            <div className="animate-pulse flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-surface-variant rounded-full" />
              <div className="h-5 bg-outline-variant rounded w-48" />
              <div className="h-4 bg-outline-variant rounded w-64" />
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          /* Empty State Canvas */
          <div className="bg-white rounded-xl border border-outline-variant h-[calc(100vh-250px)] flex flex-col items-center justify-center p-12 text-center shadow-sm relative overflow-hidden">
            {/* Subtle background graphic */}
            <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center select-none">
              <span className="material-symbols-outlined text-[280px]">group</span>
            </div>
            
            <div className="relative z-10 max-w-md mx-auto">
              <div className="w-20 h-20 bg-surface-variant rounded-full flex items-center justify-center mx-auto mb-6 text-primary shadow-inner">
                <span className="material-symbols-outlined text-3xl">person_add</span>
              </div>
              <h2 className="font-headline-lg text-lg text-on-surface mb-2 font-bold">No users available yet</h2>
              <p className="font-body-md text-xs text-on-surface-variant mb-6 leading-relaxed">
                Start by clicking "+ Add User" to create and manage team members who can access assigned sensors and perform related actions.
              </p>
              <button 
                onClick={() => setShowModal(true)}
                className="bg-primary-container text-white px-6 py-2.5 rounded-full inline-flex items-center gap-2 hover:bg-primary transition-all shadow-md font-headline-md text-sm active:scale-95 duration-100"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add First User
              </button>
            </div>
          </div>
        ) : (
          /* User Listings Table (Shown when list has users) */
          <div className="bg-white rounded-xl border border-outline-variant overflow-hidden flex flex-col h-[calc(100vh-250px)] shadow-sm">
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low border-b border-outline-variant sticky top-0 z-10">
                  <tr>
                    <th className="py-3.5 px-6 font-headline-md text-xs font-bold text-on-surface text-center w-24">S.No</th>
                    <th className="py-3.5 px-6 font-headline-md text-xs font-bold text-on-surface">Name</th>
                    <th className="py-3.5 px-6 font-headline-md text-xs font-bold text-on-surface">Email Address</th>
                    <th className="py-3.5 px-6 font-headline-md text-xs font-bold text-on-surface text-center">Role</th>
                    <th className="py-3.5 px-6 font-headline-md text-xs font-bold text-on-surface text-center">Registered On</th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-sm text-on-surface divide-y divide-outline-variant">
                  {filteredUsers.map((user) => (
                    <tr key={user.sno} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="py-3 px-6 text-center text-on-surface-variant font-mono">{user.sno}</td>
                      <td className="py-3 px-6 font-semibold text-primary">{user.name}</td>
                      <td className="py-3 px-6 text-on-surface-variant font-mono text-xs">{user.email}</td>
                      <td className="py-3 px-6 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                          user.role === 'ADMIN' ? 'bg-primary-container text-white' : 'bg-surface-container-high text-on-surface-variant'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-center text-xs">{user.registered}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Table Footer */}
            <div className="border-t border-outline-variant p-3 flex justify-between items-center bg-white shrink-0">
              <div className="text-xs text-secondary">
                Showing {filteredUsers.length} users
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center animate-fadeIn">
          <div className="bg-white rounded-xl shadow-lg border border-outline-variant max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 bg-primary text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">Add New User</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="hover:bg-white/10 p-1 rounded-full text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddUserSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
                  Full Name *
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="e.g. Shwetha"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
                  Email Address *
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="e.g. shwetha@gndsolutions.in"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-1">
                  Access Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
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
                  {isSubmitting ? 'Adding...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersView;
