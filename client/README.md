# Fern Client — In-Game Client Architecture

This directory defines the modular architecture for the future in-game Fern Minecraft client.

## Architectural Boundaries

- **Phase 1**: Core interfaces and contracts defined (`core`, `modules`, `hud`, `performance`, `visuals`, `multiplayer`, `ui`).
- **Phase 2 & beyond**: Implementation of client Fabric/NeoForge loader mod, mixins, custom HUD rendering, frame pacing, and optimization hooks.

## Modules Structure

- `core/`: Client lifecycle, configuration, and event bus.
- `modules/`: In-game toggles (Sprint, Fullbright, Freelook, CPS, Keystrokes).
- `hud/`: Screen elements, dynamic coordinate layout, and anchor system.
- `performance/`: Memory trim hooks, render distance scaling, entity culling.
- `visuals/`: Cosmetic render pipeline, cape/wings abstractions, UI styling.
- `multiplayer/`: Server detection and rich presence.
- `ui/`: In-game GUI screens and settings overlays.
