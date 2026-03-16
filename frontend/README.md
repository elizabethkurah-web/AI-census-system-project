# Census Frontend - Progressive Web App

A React-based Progressive Web App (PWA) for collecting census data with offline capabilities, GPS integration, and AI-powered validation.

## Features

- **Offline-First**: Works without internet connection, syncs when online
- **GPS Integration**: Automatic location tagging with reverse geocoding for address names
- **Responsive Design**: Mobile-optimized interface for field enumerators
- **Service Worker**: Background sync and caching for reliability
- **Authentication**: JWT-based login system
- **Data Validation**: Client-side and server-side validation
- **Error Boundaries**: Graceful error handling
- **TypeScript**: Type-safe development

## Tech Stack

- **React 18** with TypeScript - UI framework with hooks
- **Vite** - Build tool and development server
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Framer Motion** - Animations
- **Lucide React** - Icons
- **Service Worker** - Offline functionality and caching
- **Web APIs** - Geolocation, localStorage, IndexedDB
- **Tailwind CSS** - Utility-first CSS framework

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Backend API running (see backend README)

### Installation
```bash
cd frontend
npm install
```

### Development
```bash
npm run dev
```
Opens http://localhost:8080 with hot reload.

### Production Build
```bash
npm run build
```
Creates optimized build in `dist/` folder.

### PWA Setup
Create PWA icons in `public/` directory:
- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)
- `favicon.ico` (32x32 pixels)

Use tools like RealFaviconGenerator or online converters to generate these from a source image.

## Project Structure

```
frontend/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── serviceWorker.js       # Service worker for offline
│   └── icons/                 # PWA icons
├── src/
│   ├── components/            # Reusable UI components
│   ├── pages/                 # Page components
│   ├── lib/                   # Utilities and API functions
│   ├── hooks/                 # Custom React hooks
│   └── test/                  # Test utilities
├── package.json
├── vite.config.ts             # Vite configuration
└── README.md
```

## API Integration

The frontend communicates with the backend API for:
- User authentication (login/register)
- Census data submission
- Offline sync when back online

API base URL is configured via `VITE_API_URL` environment variable.

## Offline Functionality

- Data is stored locally when offline
- Automatically syncs when connection is restored
- Service worker caches assets for offline access
- GPS coordinates are captured and reverse geocoded to addresses

## Contributing

1. Follow TypeScript strict mode
2. Add tests for new features
3. Ensure accessibility compliance
4. Update documentation as needed
│   ├── index.html          # Main HTML template
│   ├── manifest.json       # PWA manifest
│   └── icon-*.png          # App icons (to be created)
├── src/
│   ├── App.js              # Main app component
│   ├── App.css             # Global styles
│   ├── LoginForm.js        # Authentication component
│   ├── CensusForm.js       # Main data collection form
│   ├── serviceWorker.js    # PWA service worker
│   └── index.js            # App entry point
├── webpack.config.js       # Build configuration
├── .babelrc               # Babel configuration
└── package.json           # Dependencies and scripts
```

## Key Components

### App.js
- Main application container
- Authentication state management
- Online/offline status monitoring
- Service worker integration

### CensusForm.js
- Household data collection form
- GPS location capture
- Offline submission queuing
- Automatic sync when online

### LoginForm.js
- User authentication interface
- Registration for new enumerators
- JWT token management

### serviceWorker.js
- Offline caching strategy
- Background sync for pending submissions
- App update notifications

## PWA Features

### Offline Functionality
- Form submissions stored locally when offline
- Automatic sync when connection restored
- Service worker handles background sync

### Installation
- Add to home screen on mobile devices
- Works as standalone app
- Offline icon and splash screen

### GPS Integration
- Automatic location capture for each record
- Fallback to manual address entry
- Geospatial data for coverage verification

## API Integration

Connects to backend API endpoints:
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - New user registration
- `POST /api/census/submit` - Single record submission
- `POST /api/census/batch` - Bulk offline sync

## Browser Support

- Chrome 70+
- Firefox 65+
- Safari 12.1+
- Edge 79+

Requires HTTPS for geolocation and service workers in production.

## Development Notes

- Uses modern React patterns (hooks, functional components)
- CSS custom properties for theming
- Responsive design with mobile-first approach
- Error boundaries and graceful degradation
- Accessibility considerations (ARIA labels, keyboard navigation)

## Next Steps

1. **Add AI Integration**: Connect to backend ML endpoints for anomaly detection
2. **Geospatial Mapping**: Integrate with mapping libraries for coverage visualization
3. **Advanced Offline**: Implement IndexedDB for larger datasets
4. **Testing**: Add unit and integration tests
5. **Performance**: Code splitting and lazy loading for larger forms