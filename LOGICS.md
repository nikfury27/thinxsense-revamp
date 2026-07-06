# Thinxsense Revamped POC: Engineering Logic & Implementation Guide

This document outlines the detailed logic, mathematical models, and architectural patterns implemented in the **Thinxsense Revamped POC**. Use this guide to explain to clients and technical stakeholders how these features operate in the POC and how they can be scaled to production.

---

## 1. Excursion Severity Index (ESI)
### Problem Statement
Standard monitoring dashboards treat all alerts equally—triggering a "raw alert count" regardless of severity. Under that model, a brief **2-minute temperature spike of +1.0°C** (often a harmless door opening) carries the same visual weight as a **40-minute excursion of +8.0°C** (a critical refrigeration failure). This leads to alert fatigue and causes operators to overlook high-risk failures.

### Solution & ESI Logic
The **Excursion Severity Index (ESI)** weights the **duration** of the breach against the **magnitude of deviation** (representing the "area under the curve" of the excursion).

#### Mathematical Formula:
$$\text{ESI} = \text{Deviation Magnitude} \times \text{Duration (minutes)}$$

*   **Deviation Magnitude**: The absolute difference between the reported parameter value and the set threshold limit.
    $$\text{Deviation} = | \text{Recorded Temp} - \text{Threshold Temp} |$$
*   **Example Comparison**:
    *   *Minor Spike*: $+0.5^\circ\text{C}$ deviation for $5\text{ minutes} \rightarrow \text{ESI} = 0.5 \times 5 = \mathbf{2.5}$
    *   *Major Excursion*: $+6.2^\circ\text{C}$ deviation for $45\text{ minutes} \rightarrow \text{ESI} = 6.2 \times 45 = \mathbf{279.0}$

### Code Implementation (Frontend)
Calculated in the alert retrieval layer of [AlertsView.jsx](file:///c:/Users/NikhilM/Desktop/thinxsense%20revamp/src/views/AlertsView.jsx#L20-L24):
```javascript
const esiScore = alert.param === 'Temperature' && alert.deviation 
  ? parseFloat((alert.deviation * alert.duration).toFixed(1)) 
  : alert.param === 'Humidity' && alert.deviation
  ? parseFloat((alert.deviation * (alert.duration / 10)).toFixed(1))
  : 0;
```
The Dashboard and Alerts pages sort issues by this `esiScore` descending, ensuring that high-severity excursions are pinned at the top of the priority list regardless of chronological timestamps.

---

## 2. Dynamic Sensor-Group Location Resolution
### Problem Statement
Typically, groups in IoT platforms are flat list buckets (Group 1, Group 2) with no relation to actual physical layout. To find out where a sensor actually lives, operators have to refer to external sheets or memorize placements.

### Solution & Location Mapping
We separate and establish a parent-child database relationship between:
1.  **Facility Location** (Property of the **Group**; e.g. "Cold Room 1")
2.  **Sensor Location Note** (Property of the **Sensor**; e.g. "Rack A")

```
   [Group Profile]
  Location: "Cold Room 1"
        ▲
        │ (Parent-Child association)
        ▼
   [Sensor Profile]
  Location Note: "Rack A"
  Dynamic Output -> "Cold Room 1, Rack A"
```

### Code Implementation
We resolve this mapping dynamically in [apiService.js](file:///c:/Users/NikhilM/Desktop/thinxsense%20revamp/src/api/apiService.js#L23-L25):
```javascript
const enrichSensor = (s) => {
  const group = groups.find(g => g.name === s.group);
  const facilityLocation = group ? group.location : 'Not Specified';
  
  return {
    ...s,
    facilityLocation
  };
};
```
*   **Sensors page**: Combines them dynamically: `{sensor.facilityLocation}, {sensor.location}`.
*   **Individual Group page**: Since the parent Group's Facility location is already known and displayed in the header, the sensor list inside the group view renders only the `sensor.location` string to avoid redundancy.

---

## 3. Early Warning Trend-Toward-Breach Alerts
### Problem Statement
Most IoT systems are purely reactive—they alert operators *after* a breach has occurred. In vaccine or food cold chain environments, once the threshold is crossed, spoilage has already begun.

### Solution & Prediction Logic
The early warning system continuously calculates the temperature trajectory (slope) of a refrigerated space using historical readings. It predicts the timeline of a future breach by applying a linear extrapolation.

#### Mathematical Slope Formula:
$$\text{Slope } (m) = \frac{T_{\text{latest}} - T_{\text{historical}}}{\Delta t} \quad \left(^\circ\text{C}/\text{hour}\right)$$

In our implementation, we analyze a sliding window of the last 4 hours of readings:
```
Time (t-4)              Time (t)
[ 21.2°C ] ——————————> [ 24.6°C ]
Slope = (24.6 - 21.2) / 4 hrs = +0.85°C/hr
```

#### Linear Breach Extrapolation:
Assuming the warming rate continues linearly:
$$\text{Projected Hours to Breach} = \frac{\text{Threshold Temp } (25.0^\circ\text{C}) - T_{\text{latest}}}{m}$$
$$\text{Hours to Breach} = \frac{25.0 - 24.6}{0.85} = \mathbf{0.47\text{ hours (approx. 30 mins)}}$$

### Code Implementation
In [apiService.js](file:///c:/Users/NikhilM/Desktop/thinxsense%20revamp/src/api/apiService.js#L27-L44):
```javascript
if (s.history && s.history.length >= 2) {
  const latest = s.history[s.history.length - 1];
  const earlier = s.history[s.history.length - 5] || s.history[0];
  const tempDiff = latest.temp - earlier.temp;
  const stepsDiff = s.history.length >= 5 ? 4 : (s.history.length - 1);
  slope = parseFloat((tempDiff / (stepsDiff || 1)).toFixed(2));
  
  if (slope > 0 && s.temp > 22.5 && s.temp < 25.0) {
    const rawHours = (25.0 - s.temp) / slope;
    // Approximated to nearest half hour
    projectedHoursToBreach = parseFloat((Math.round(rawHours * 2) / 2).toFixed(1));
    if (projectedHoursToBreach <= 4) {
      isTrendBreachRisk = true; // Early Warning alert triggered
    }
  }
}
```

---

## 4. Battery Drain Forecasting
### Problem Statement
Wireless IoT sensors are battery-powered. If batteries drain unexpectedly, sensors go offline, leaving spaces unmonitored. Standard battery percentages (e.g. `12%`) don't tell the user *when* the device will go dark, leading to reactive maintenance.

### Solution & Extrapolation
By capturing a device's daily usage rate, the platform calculates a remaining runtime projection.

#### Mathematical Projection:
$$\text{Days Remaining} = \frac{\text{Current Battery Level } (\%)}{\text{Daily Usage Rate } (\%/\text{day})}$$

*   **Example**:
    *   Sensor current battery: $12\%$
    *   Daily usage rate: $3.0\%/\text{day}$
    *   $\text{Days Remaining} = \frac{12}{3.0} = \mathbf{4\text{ days}}$

### Code Implementation
In [apiService.js](file:///c:/Users/NikhilM/Desktop/thinxsense%20revamp/src/api/apiService.js#L46-L49):
```javascript
const dailyDrain = s.dailyDrainRate || 1.5;
// Rounded to the nearest integer day
const batteryDaysRemaining = Math.round(s.batt / dailyDrain);
const isBatterySwapRisk = batteryDaysRemaining <= 5; // Flag swap timeline
```

---

## 5. Scaling to Real-Time Production (Next Steps)
When deploying these features to production with high-frequency MQTT/REST streams:

1.  **Excursion Severity (ESI)**: Calculate ESI in the backend database database using time-series integration (like PostgreSQL TimescaleDB or InfluxDB). Rather than using static averages, integrate the curve mathematically:
    $$\text{ESI} = \int_{t_{\text{start}}}^{t_{\text{end}}} (T(t) - T_{\text{threshold}}) \, dt$$
2.  **Trend Predictions**: Implement Kalman Filtering or Exponential Moving Averages (EMA) on data ingest workers. This filters out short-term noise (like open doors) from genuine thermal drift, eliminating false trend warnings.
3.  **Battery Swap Forecasting**: Collect daily telemetry payloads. A simple linear regression on battery levels over a 15-day window will accurately calculate the device's real-world `dailyDrainRate`, automatically adjusting for winter temperatures or cellular transmission failures.
4.  **Shift Handover Digest (Optional Production Blueprint)**: To generate the "What changed" handover digests:
    - Capture event logs for status transitions (e.g., `ONLINE -> OFFLINE`).
    - Run an automated query at shift change intervals (every 8/12 hours) to aggregate these events:
      ```sql
      SELECT status_change, count(*) FROM event_logs 
      WHERE event_time >= NOW() - INTERVAL '8 hours' 
      GROUP BY status_change;
      ```
    - Output this aggregate as a clean handover card at login.
