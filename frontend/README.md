# PositioningAI Frontend

React + TypeScript frontend for the LLM Visibility Diagnostic tool.

## Quick Start

### Setup

1. Copy `.env.example` to `.env.local` and fill in the API endpoints:
   ```bash
   cp .env.example .env.local
   ```

2. Install dependencies (npm, pnpm, or yarn):
   ```bash
   npm install
   # or
   pnpm install
   # or
   yarn install
   ```

### Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173` and will proxy API requests to `http://localhost:8000`.

### Build

Build for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Styling (via CDN)
- **react-plotly.js** - Interactive charts for PCA visualization
- **Native Fetch API** - HTTP client

## Project Structure

```
src/
├── api/              # API client and types
│   ├── client.ts     # Typed fetch wrapper
│   └── types.ts      # TypeScript interfaces
├── contexts/         # React Context
│   └── AnalysisContext.tsx
├── hooks/            # Custom React hooks
│   └── useWebSocket.ts
├── pages/            # Page components
│   ├── HomePage.tsx
│   └── ResultsPage.tsx
├── components/       # Reusable components
│   ├── ProgressBar.tsx
│   └── results/
│       ├── BusinessCard.tsx
│       ├── EvaluationTable.tsx
│       ├── PCAViz.tsx
│       └── RecommendationsList.tsx
├── App.tsx           # Router setup
└── main.tsx          # React root
```

## Features

- **Submission Form**: Collect website URL and API keys with advanced options
- **Live Progress Tracking**: WebSocket-based real-time analysis updates
- **Results Dashboard**: Tabbed interface showing:
  - Business profile and competitors
  - AI visibility test results with expandable details
  - Interactive PCA positioning map (2D/3D toggle)
  - AI-generated recommendations with priority fixes and content suggestions
- **Dark Theme**: GitHub-inspired dark UI design

## Environment Variables

- `VITE_API_URL` - Backend API base URL (default: `http://localhost:8000`)
- `VITE_WS_URL` - WebSocket base URL (default: `ws://localhost:8000`)

## API Integration

The frontend connects to a FastAPI backend at the configured API URL:
- `POST /api/analyze` - Start a new analysis
- `GET /api/status/{session_id}` - Get analysis status
- `WS /ws/analysis/{session_id}` - WebSocket for real-time progress updates
