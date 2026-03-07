# 🌲 Wildfire AI Guard | 3D System Simulation

This repository contains a **highly interactive 3D simulation** designed to demonstrate the end-to-end narrative of the Wildfire AI Guard detection and response architecture.

> [!IMPORTANT]
> **Demo Purpose**: This is a **demonstration tool** and not the production system or the operational dashboard itself. It is designed for presentations to show how the various components (5G Networks, AI Hubs, Drones, and Response HQ) communicate during a wildfire event.

## 🚀 Key Features

- **Interactive 3D Narrative**: A programmed storytelling sequence that guides the user through the lifecycle of fire detection.
- **Predictive Intelligence Focus**: The simulation starts with the **AI Hub's analysis** of a risk before the physical fire even appears, highlighting the system's "proactive" capability.
- **Dynamic 3D Environment**: 
  - **Forest Zone**: High-fidelity animated fire visuals with clearing algorithms (ensuring the presentation is never blocked by trees).
  - **AI Processing Hub**: Visualizing the "brain" of the operation.
  - **Drones**: Autonomous patrol and reconnaissance animations with simulated data pulses.
  - **HQ & Village**: Visualizing the impact of response alerts.
- **Presentation Controls**: 
  - **Orbit & Pan**: Smooth 3D navigation (Right-click/Ctrl-drag to pan).
  - **Multi-Modal Flow**: Real-world dashboard and model prediction screenshots integrated directly into the presentation.
  - **One-Click Reset**: Instant reset of the environment for back-to-back presentation runs.

## 🛠️ Technology Stack

- **Three.js**: Core 3D engine for rendering the world.
- **GSAP**: For complex camera choreography and UI animations.
- **CSS2DRenderer**: Overlaying high-contrast HTML labels in 3D space.
- **Vite**: Modern building and development tooling.

## 🏃 Getting Started

### Local Development
```bash
# Install dependencies
npm install

# Run the simulation locally
npm run dev
```

### Deployment
This project is configured to deploy automatically to **GitHub Pages** via the included workflow in `.github/workflows/deploy.yml`. 
The build produces a static `dist` folder ready for fast hosting.

## 📖 Presentation Flow
1. **Initial Monitoring**: HUD shows "MONITORING" while drones patrol.
2. **AI Risk Assessment**: Clicking "Simulate Fire" zooms to the AI Hub. A dashboard screenshot shows the prediction scores. 
3. **Dispatch**: Operator authorizes drone dispatch.
4. **Physical Ignition**: Camera zooms to the forest. Fire ignites in a cleared area.
5. **Detection Confirmation**: Drone navigates to the fire, scans it, and confirms it with a model prediction image.
6. **Propagation & Alert**: The system displays a propagation heat-map and sends high-speed 5G alerts to the Village and HQ.

---
*Created for the Tech4Connect Wildfire Prevention Initiative.*
