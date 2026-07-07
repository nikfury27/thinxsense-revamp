import { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';
import { calculateAlertESI } from '../utils/esiCalculator';

export const useTopExcursions = () => {
  const [excursions, setExcursions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [alertsRes, sensorsRes] = await Promise.all([
          apiService.getAlerts(),
          apiService.getSensors()
        ]);
        
        const withEsi = alertsRes.map(alert => {
          const esiScore = calculateAlertESI(alert);

          let validationVerdict = 'Isolated';
          const alertSensor = sensorsRes.find(s => s.id === alert.sensor);
          if (alertSensor) {
            const group = alertSensor.group;
            const neighbors = sensorsRes.filter(s => s.group === group && s.id !== alert.sensor && s.status !== 'offline');
            
            if (neighbors.length > 0) {
              if (alert.param === 'Temperature') {
                const neighborAverage = neighbors.reduce((acc, curr) => acc + curr.temp, 0) / neighbors.length;
                const deviation = Math.abs(parseFloat(alert.val) - neighborAverage);
                const DEVIATION_THRESHOLD = 3.0;
                
                if (deviation > DEVIATION_THRESHOLD) {
                  validationVerdict = 'Sensor Fault (Mismatched)';
                } else {
                  validationVerdict = 'Excursion (Verified)';
                }
              } else {
                validationVerdict = 'Excursion (Verified)';
              }
            } else {
              validationVerdict = 'Isolated Monitoring';
            }
          }

          return { ...alert, esiScore, validationVerdict };
        });

        // Sort by severity index descending
        const sorted = withEsi.sort((a, b) => b.esiScore - a.esiScore);
        setExcursions(sorted);
      } catch (err) {
        console.error('Failed to load excursions', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { excursions, loading };
};
