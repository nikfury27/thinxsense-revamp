// Custom React Hook to fetch and cache static floor plan layout details once per session by facilityId
import { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';

const cachedLayouts = {};

export function useFloorPlan(facilityId = 'facility-1') {
  const [layout, setLayout] = useState(cachedLayouts[facilityId] || null);
  const [loading, setLoading] = useState(!cachedLayouts[facilityId]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cachedLayouts[facilityId]) {
      setLayout(cachedLayouts[facilityId]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchLayout = async () => {
      try {
        const data = await apiService.getFloorPlanLayout(facilityId);
        if (isMounted) {
          cachedLayouts[facilityId] = data;
          setLayout(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchLayout();

    return () => {
      isMounted = false;
    };
  }, [facilityId]);

  const updateCachedLayout = (newRoomsLayout) => {
    if (cachedLayouts[facilityId]) {
      cachedLayouts[facilityId].rooms = newRoomsLayout;
      setLayout({ ...cachedLayouts[facilityId] });
    }
  };

  return { layout, loading, error, updateCachedLayout };
}
