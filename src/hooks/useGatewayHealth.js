import { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';

export const useGatewayHealth = () => {
  const [gateways, setGateways] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiService.getGateways();
        setGateways(res);
      } catch (err) {
        console.error('Failed to load gateways', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { gateways, loading };
};
