# Census Frontend - Progressive Web App

A React-based Progressive Web App (PWA) for collecting census data with offline capabilities and GPS integration.

## Features

- **Offline-First**: Works without internet connection, syncs when online
- **GPS Integration**: Automatic location tagging for geospatial verification
- **Responsive Design**: Mobile-optimized interface for field enumerators
- **Service Worker**: Background sync and caching for reliability
- **Authentication**: JWT-based login system
- **Data Validation**: Client-side validation with user-friendly error messages

## Tech Stack

- **React 18** - UI framework with hooks
- **Service Worker** - Offline functionality and caching
- **Web APIs** - Geolocation, localStorage, IndexedDB
- **CSS3** - Modern responsive styling
- **Webpack** - Build system and development server

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- Backend API running (see backend README)

### Installation
```bash
cd frontend
npm install
```

### Development
```bash
npm start
```
Opens http://localhost:3000 with hot reload.

### Production Build
```bash
npm run build
```
Creates optimized build in `dist/` folder.

## Project Structure

```
frontend/
├── public/
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