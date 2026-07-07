import { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';

export const useOfflineSensors = () => {
  const [offlineSensors, setOfflineSensors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiService.getSensors();
        setOfflineSensors(res.filter(s => s.status === 'offline'));
      } catch (err) {
        console.error('Failed to load offline sensors', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { offlineSensors, loading };
};
