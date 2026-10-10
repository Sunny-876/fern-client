# Fern Client — Development Guide

## Environment Setup

### Required Tools
- **Node.js**: v20+ (Node v24 recommended)
- **npm**: v10+
- **Git**
- Optional: A local Java runtime (Java 17 or Java 21) if testing live Minecraft launching.

### Install Dependencies

```bash
npm install
```

---

## Development Workflow

### 1. Running Unit Tests

Run the full suite of unit tests with Vitest:

```bash
npm run test
```

### 2. Building Assets

Compile both the Electron main bundle and the Vite frontend:

```bash
npm run build
```

This generates:
- `dist-electron/main.cjs`
- `dist-electron/preload.cjs`
- `dist/index.html` and bundled assets

### 3. Running the Desktop Launcher

Start the Electron application:

```bash
npm start
```

Or run the build-and-start shortcut:

```bash
npm run dev
```

### 4. Running the UI in Browser Mode (Fast UI Iteration)

You can run the Vite development server independently to test UI styles and layout in a standard browser:

```bash
npm run dev:ui
```

In browser mode, the UI automatically detects the absence of `window.fern` and falls back to mock demo data so you can test styling without launching Electron.

---

## Directory Conventions

- `%APPDATA%\Fern Client` (Windows default user data directory)
- Override by setting environment variable `FERN_HOME=<path>` before launching.

---

## Adding New Features

1. **Shared Types**: Add any new cross-process data models to `shared/models/`.
2. **Main Services**: Implement backend business logic in `launcher/src/<domain>/`.
3. **IPC Bridge**: Add method declarations to `launcher/src/preload.ts` and handle them in `launcher/src/main.ts`.
4. **UI Components**: Implement corresponding React views in `launcher/src/ui/`.
5. **Unit Tests**: Always add a test file under `tests/` and verify with `npm run test`.
