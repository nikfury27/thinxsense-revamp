# Thinxsense Revamped POC: Heatmap Interpolation Engine Mathematics

This document outlines the detailed mathematical formulations, boundary conditions, and compositing equations used in the **Inverse Distance Weighting (IDW)** heatmap engine implemented in the **Thinxsense Revamped POC**.

---

## 1. Core Inverse Distance Weighting (IDW)

For every grid cell point $P(x, y)$ on the heatmap canvas, the value of the parameter is interpolated using the values of all active sensors within their influence range.

$$\text{Interpolated Value } (V_P) = \frac{\sum_{i=1}^{N} \left( w_i \cdot V_i \right)}{\sum_{i=1}^{N} w_i}$$

where:
* $N$ is the number of placed, active (online) sensors.
* $V_i$ is the status value of sensor $i$ ($1.0$ for excursion/alert, $0.0$ for stable/normal).
* $w_i$ is the interpolation weight of sensor $i$ at point $P$.

---

## 2. Sensor Interpolation Weights

The weight $w_i$ of a sensor at any grid point $P$ is determined by the distance $d_i$ from $P$ to the sensor, scaled by the sensor's individual confidence and a boundary suppression factor:

$$w_i = \frac{C_{\text{sensor}, i} \cdot C_{\text{neighbour}, i} \cdot S_{\text{boundary}, i}}{d_i^2}$$

### Distance Calculation
To ensure that the heatmap gradient renders as a perfect isotropic circle on screen (matching the circular range indicator) even when the room layout coordinates are stretched to fill the viewport, distance is calculated using directional canvas scale ratios:

$$Scale_X = \frac{Canvas_W}{Room_W}$$
$$Scale_Y = \frac{Canvas_H}{Room_H}$$
$$Scale_{\text{min}} = \min(Scale_X, Scale_Y)$$

The adjusted isotropic distance $d_i$ is then:

$$d_i = \sqrt{\left((P_x - S_{x, i}) \cdot \frac{Scale_X}{Scale_{\text{min}}}\right)^2 + \left((P_y - S_{y, i}) \cdot \frac{Scale_Y}{Scale_{\text{min}}}\right)^2}$$

* If $d_i > \text{Influence Radius } (100\text{m})$, the weight is truncated: $w_i = 0$.
* If $d_i < 0.1\text{m}$, the grid cell is treated as a direct sensor overlap, bypassing the sum to prevent division-by-zero or numerical instability: $V_P = V_i$.

### Sensor Confidence values ($C_{\text{sensor}}$)
Determined purely by the sensor's own operational state:
* **Offline Sensor**: $C_{\text{sensor}} = 0.0$
* **Warning (Approaching breach)**: $C_{\text{sensor}} = 0.75$
* **Alert (Breach)**: $C_{\text{sensor}} = 1.0$
* **Healthy Sensor**: $C_{\text{sensor}} = 1.0$

### Neighbour Confidence ($C_{\text{neighbour}}$)
Determined using spatial validation against surrounding sensors in the group:
* **Isolated Anomaly** (alert sensor deviating $> 3.0^\circ\text{C}$ from neighbors): $C_{\text{neighbour}} = 0.25$
* **Room-Wide Alert / Normal Sensor**: $C_{\text{neighbour}} = 1.0$

---

## 3. Boundary Suppression Factor ($S_{\text{boundary}}$)

To prevent distant healthy sensors from washing out alerts at the room boundaries (walls) where no healthy sensors exist, we calculate:
* $d_{\text{RedMin}}$: Distance from $P$ to the closest active excursion/red sensor.
* $d_{\text{GreenMin}}$: Distance from $P$ to the closest active stable/green sensor.

The suppression factor $S_{\text{boundary}}$ is applied symmetrically using a cubic ratio:

### For Excursion (Red) Sensors
$$S_{\text{boundary}, i} = \begin{cases} 
      \left(\frac{d_{\text{GreenMin}}}{d_{\text{RedMin}}}\right)^{3.0} & \text{if } d_{\text{GreenMin}} < d_{\text{RedMin}} \\
      1.0 & \text{otherwise}
   \end{cases}$$

### For Stable (Green) Sensors
$$S_{\text{boundary}, i} = \begin{cases} 
      \left(\frac{d_{\text{RedMin}}}{d_{\text{GreenMin}}}\right)^{3.0} & \text{if } d_{\text{RedMin}} < d_{\text{GreenMin}} \\
      1.0 & \text{otherwise}
   \end{cases}$$

#### Logic of suppression:
At the left wall of a room containing an alert sensor on the left and healthy sensors on the right:
* $d_{\text{RedMin}} = 7.5\text{m}$, $d_{\text{GreenMin}} = 15.0\text{m}$ (so $d_{\text{RedMin}} < d_{\text{GreenMin}}$).
* The green sensors' influence is scaled down by $\left(\frac{7.5}{15.0}\right)^{3.0} = 0.125$ ($87.5\%$ suppression).
* The red sensor's influence remains fully active ($S_{\text{boundary}} = 1.0$).
* This allows the red alert gradient to propagate smoothly and with high saturation all the way to the left edges.

---

## 4. Red-Over-Green Alpha Compositing

To prevent desaturation and muddy blending (which occurs when mixing opponent colors like red and green in linear RGB spaces), we blend the pure Red `[239, 68, 68]` gradient over the pure Green `[16, 185, 129]` gradient using standard alpha compositing:

1. **Red opacity contribution ($op_{\text{Red}}$)**:
   $$op_{\text{Red}} = \max_{j \in \text{Red}} \left( \text{OpacityStop}(d_j) \cdot C_j \cdot S_{\text{boundary}, j} \right)$$
2. **Green opacity contribution ($op_{\text{Green}}$)**:
   $$op_{\text{Green}} = \max_{k \in \text{Green}} \left( \text{OpacityStop}(d_k) \cdot C_k \cdot S_{\text{boundary}, k} \right)$$

### OpacityStop Decay
Calculated using multi-stage linear interpolation matching the original gradient design:
$$\text{OpacityStop}(d) = \begin{cases} 
      0.38 - \left(\frac{d}{\text{radius}}\right) \cdot \frac{0.16}{0.30} & \text{if } \frac{d}{\text{radius}} \le 0.30 \\
      0.22 - \left(\frac{d}{\text{radius}} - 0.30\right) \cdot \frac{0.12}{0.30} & \text{if } 0.30 < \frac{d}{\text{radius}} \le 0.60 \\
      0.10 - \left(\frac{d}{\text{radius}} - 0.60\right) \cdot \frac{0.06}{0.25} & \text{if } 0.60 < \frac{d}{\text{radius}} \le 0.85 \\
      0.04 - \left(\frac{d}{\text{radius}} - 0.85\right) \cdot \frac{0.04}{0.15} & \text{if } 0.85 < \frac{d}{\text{radius}} \le 1.00 \\
      0 & \text{if } \frac{d}{\text{radius}} > 1.00
   \end{cases}$$

### Compositing Equations
* **Output Opacity ($A_{\text{out}}$)**:
  $$A_{\text{out}} = op_{\text{Red}} + op_{\text{Green}} \cdot (1 - op_{\text{Red}})$$
* **Output Color vector ($C_{\text{out}}$)**:
  $$C_{\text{out}} = \frac{C_{\text{Red}} \cdot op_{\text{Red}} + C_{\text{Green}} \cdot op_{\text{Green}} \cdot (1 - op_{\text{Red}})}{A_{\text{out}}}$$

This compositing maintains a rich, highly saturated red alert zone that drops smoothly back to green.

---

## 5. Real-Time Coordinate Mapping

When editing or dragging a sensor marker, its normalized coordinates $(pos_x, pos_y) \in [0, 1]^2$ are mapped to physical coordinates $(X_{\text{physical}}, Y_{\text{physical}})$ relative to room dimensions ($Room_W, Room_L$):

$$X_{\text{physical}} = pos_x \cdot Room_W$$
$$Y_{\text{physical}} = pos_y \cdot Room_L$$

These physical coordinates are displayed dynamically in the format `Width x Length` underneath the sensor marker: e.g., `H9B00045 (10.5x7.0m)`.

---

## 6. Bounding-Box Index Optimization

During sensor dragging, recalculating all grid points on a large grid is inefficient. To restrict calculations to the affected subset, we clone the previous grid buffer and calculate the index boundaries for the modified sensor (from its previous position to its current position plus the influence radius):

$$X_{\text{min}} = \min(S_{x, \text{old}}, S_{x, \text{new}}) - R_{\text{influence}}$$
$$X_{\text{max}} = \max(S_{x, \text{old}}, S_{x, \text{new}}) + R_{\text{influence}}$$
$$Y_{\text{min}} = \min(S_{y, \text{old}}, S_{y, \text{new}}) - R_{\text{influence}}$$
$$Y_{\text{max}} = \max(S_{y, \text{old}}, S_{y, \text{new}}) + R_{\text{influence}}$$

These coordinate boundaries are converted into grid column/row index limits:

$$col_{\text{start}} = \max\left(0, \left\lfloor \frac{X_{\text{min}}}{Room_W} \cdot Cols \right\rfloor\right)$$
$$col_{\text{end}} = \min\left(Cols - 1, \left\lceil \frac{X_{\text{max}}}{Room_W} \cdot Cols \right\rceil\right)$$
$$row_{\text{start}} = \max\left(0, \left\lfloor \frac{Y_{\text{min}}}{Room_L} \cdot Rows \right\rfloor\right)$$
$$row_{\text{end}} = \min\left(Rows - 1, \left\lceil \frac{Y_{\text{max}}}{Room_L} \cdot Rows \right\rceil\right)$$

The grid generator then only iterates:

$$\text{for } r \in [row_{\text{start}}, row_{\text{end}}], \quad \text{for } c \in [col_{\text{start}}, col_{\text{end}}]$$

This reduces complexity for active frames from $O(Cols \cdot Rows)$ to a local $O(\Delta \text{ Area})$, boosting performance by $90\text{--}99\%$.

