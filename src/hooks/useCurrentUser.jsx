import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../api/apiService';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchDefaultUser = async () => {
      try {
        const usersList = await apiService.getUsers();
        // Use shwetha as the default user
        const defaultUser = usersList.find(u => u.name === 'shwetha') || usersList[0];
        setCurrentUser(defaultUser);
      } catch (err) {
        console.error('Failed to load current user', err);
      }
    };
    fetchDefaultUser();
  }, []);

  const changeLens = (newLens) => {
    if (currentUser) {
      setCurrentUser(prev => ({
        ...prev,
        lens: newLens
      }));
    }
  };

  return (
    <UserContext.Provider value={{
      currentUser,
      setCurrentUser,
      lens: currentUser?.lens || 'ops',
      changeLens
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useCurrentUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useCurrentUser must be used within a UserProvider');
  }
  return context;
};
