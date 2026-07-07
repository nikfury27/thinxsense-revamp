import { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';

export const useUnacknowledgedAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [alertsRes, sensorsRes] = await Promise.all([
          apiService.getAlerts({ state: 'unacknowledged' }),
          apiService.getSensors()
        ]);
        
        const enriched = alertsRes.map(alert => {
          const esiScore = alert.param === 'Temperature' && alert.deviation 
            ? parseFloat((alert.deviation * alert.duration).toFixed(1)) 
            : alert.param === 'Humidity' && alert.deviation
            ? parseFloat((alert.deviation * (alert.duration / 10)).toFixed(1))
            : 0;

          let validationVerdict = 'Isolated';
          const alertSensor = sensorsRes.find(s => s.id === alert.sensor);
          if (alertSensor) {
            const group = alertSensor.group;
            const neighbors = sensorsRes.filter(s => s.group === group && s.id !== alert.sensor && s.status !== 'offline');
            
            if (neighbors.length > 0) {
              if (alert.param === 'Temperature') {
                const neighborAverage = neighbors.reduce((acc, curr) => acc + curr.temp, 0) / neighbors.length;
                const deviation = Math.abs(parseFloat(alert.val) - neighborAverage);
                const DEVIATION_THRESHOLD = 3.0; // 3.0°C deviation limit
                
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
        const sorted = enriched.sort((a, b) => b.esiScore - a.esiScore);
        setAlerts(sorted);
      } catch (err) {
        console.error('Failed to load unacknowledged alerts', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { alerts, loading };
};
