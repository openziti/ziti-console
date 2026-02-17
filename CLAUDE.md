# Ziti Console - Development Guide

> A comprehensive reference for developers working on the Ziti Administration Console (ZAC)

## Overview

**Ziti Console** is the administrative web interface for OpenZiti networks. It's built as an Angular monorepo with two main projects:

- `ziti-console-lib`: Shared Angular library with reusable components and services
- `app-ziti-console`: Main application that consumes the library

The project uses Angular 16, RxJS for reactive programming, and Leaflet for interactive mapping visualization.

## Project Type & Tech Stack

### Core Framework
- **Framework**: Angular 16.2.12
- **Language**: TypeScript 5.1.5
- **Build Tool**: Angular CLI 16.2.10
- **Package Manager**: npm 9.4.0 (Node.js 18.13.0+)
- **Module System**: ES Modules (ESM)

### Key Dependencies
- **UI Components**: PrimeNG 16.9.0, Angular Material 16.2.12
- **Mapping**: Leaflet 1.9.4, leaflet.markercluster 1.5.3
- **State Management**: RxJS 7.8.0 (Observable patterns)
- **Tables/Grid**: ag-grid 31.3.4
- **Data Visualization**: D3 7.8.5, D3-Hierarchy 2.0.0
- **Icons**: Material Icons, PrimeIcons 6.0.1
- **Styling**: SCSS
- **Authentication**: angular-oauth2-oidc 16.0.0
- **Backend**: Express 4.18.2 (Node server mode, deprecated)

### API Integration
- **Ziti Edge API**: Primary REST API for network administration
- **Fabric API**: For accessing router and link information
- **SDK**: Optional @openziti/ziti-sdk-nodejs for advanced features

## Project Structure

```
ziti-console/
├── projects/
│   ├── ziti-console-lib/              # Shared library (published as @openziti/ziti-console-lib)
│   │   └── src/lib/
│   │       ├── pages/                 # Page components (identities, routers, services, geolocate, etc.)
│   │       ├── features/              # Reusable feature components (data tables, forms, modals, etc.)
│   │       ├── services/              # Shared services (ziti-data, auth, validation, etc.)
│   │       ├── shared/                # Shared utilities and models
│   │       ├── shared-assets/         # Global styles, fonts, animations
│   │       ├── assets/                # SVGs, icons, images, mock data
│   │       └── ziti-console-lib.module.ts
│   │
│   └── app-ziti-console/              # Main application
│       └── src/
│           ├── app/
│           │   ├── app.module.ts
│           │   ├── app-routing.module.ts
│           │   ├── login/             # Login/authentication flows
│           │   ├── services/          # App-specific services
│           │   └── interceptors/      # HTTP interceptors
│           └── main.ts
│
├── angular.json                       # Angular CLI configuration
├── package.json                       # Dependencies and build scripts
├── tsconfig.json                      # TypeScript configuration
├── server.js                          # Deprecated Node.js server (legacy)
└── dist/
    ├── ziti-console-lib/              # Built library (as npm package)
    └── app-ziti-console/              # Built SPA application
```

## Build, Development & Test Commands

### Package.json Scripts

```bash
# Development
npm start                              # Serve ziti-console with hot reload (http://localhost:4200)
npm run build                          # Build all projects (lib + app)
npm run build-lib                      # Build library and copy assets
npm run watch:lib                      # Continuously rebuild library during development
npm run watch                          # Watch build with development configuration

# Testing
npm test                               # Run Karma tests with Jasmine

# Docker (CI/CD)
npm run docker:build                   # Build Docker image
npm run docker:run                     # Run Docker container locally
npm run docker:publish                 # Push image to registry
npm run docker:debug                   # Build, run, and tail logs

# Utility
npm run clean                          # Remove node_modules
npm run zitified                       # Run with Ziti identity (advanced)
```

### Development Workflow

#### 1. Initial Setup
```bash
npm install                            # Installs dependencies and runs postinstall
# postinstall hook automatically: npm run build-lib (builds ziti-console-lib)
```

#### 2. Continuous Development (Recommended)
```bash
# Terminal 1: Watch library changes
npm run watch:lib

# Terminal 2: Serve application with hot reload
npm start
```

#### 3. Production Build
```bash
ng build ziti-console                  # Build SPA to dist/app-ziti-console
# For deprecated Node server:
ng build ziti-console-node             # Builds to dist/app-ziti-console-node
node server.js                         # Run (http://localhost:1408)
```

#### 4. Library Development
- Library code: `projects/ziti-console-lib/src/lib/`
- After changes, build library: `npm run build-lib`
- Public API exports: `projects/ziti-console-lib/src/public-api.ts`

## High-Level Architecture

### Monorepo Structure (Angular CLI Monorepo)

The project is configured as an Angular monorepo with:
- **ziti-console-lib**: Publishable library (outputs to `dist/ziti-console-lib`)
- **app-ziti-console**: Main application (outputs to `dist/app-ziti-console`)
- **ziti-console-node**: Deprecated Node.js server variant

The library is referenced in `package.json` as a local file dependency:
```json
"ziti-console-lib": "file:dist/ziti-console-lib"
```

This allows the app to import library components directly:
```typescript
import { GeolocateComponent } from 'ziti-console-lib';
```

### Data Flow & Services

#### Core Service Architecture

**ZitiDataService** (Injected as `ZITI_DATA_SERVICE`)
- Central abstraction for all API calls
- Handles Ziti Edge API and Fabric API communications
- Methods: `get()`, `post()`, `patch()`, `delete()`, `call()`
- Provides error handling and data transformation

#### State Management Pattern

The console uses **RxJS Observable patterns** with:
- **BehaviorSubject** for state management
- **Async pipe** in templates for automatic subscription management
- Service-based state (no global state management library)
- Example: `MapStateService` manages geolocate map state

### Page-Based Organization

Pages are feature modules with their own:
- Main component (e.g., `identities-page.component.ts`)
- Service (e.g., `identities-page.service.ts`) for business logic
- Data table, CRUD operations, and filters

Example pages:
- Identities, Edge Routers, Transit Routers
- Services, Service Policies, Edge Router Policies
- Auth Policies, Posture Checks, Configurations
- Sessions, API Sessions, JWT Signers
- **Geolocate**: Interactive map visualization (see detailed section below)

## Geolocate Component - Deep Architecture

The Geolocate component provides an interactive map for visualizing OpenZiti network topology with geolocation data.

### Data Flow Overview

```
API Data (Routers, Identities, Services, Circuits, Terminators, Links)
    ↓
MapDataService (Fetch & Merge)
    ↓
MapStateService (Centralized State)
    ↓
Circuit Calculation Services (Filter, Calculate, Build Paths)
    ↓
MapMarkerService (Create/Manage Markers)
    ↓
MapRenderingService (Render to Leaflet)
    ↓
GeolocateComponent Template (Display)
```

### Services (8 Specialized Services)

#### 1. **MapStateService** (`map-state.service.ts`)
Centralized state management for the entire geolocate component.

**State Categories:**
- **Visibility Toggles**: clustering, links, activeCircuits, routers, identities
- **Location Maps**: Router and identity coordinates (lat/lng stored in tags)
- **Router Types**: Tracks edge-router vs transit-router distinction
- **Side Panel State**: Type (marker/link/circuit/unlocated/entityList), data, open status, width
- **Selected Circuit**: Current circuit selection + associated routers
- **Filter State**: Service/identity/router attributes, connection status
- **Dropdown State**: Filter dropdown visibility toggles

**Key Methods:**
```typescript
// Visibility toggles
toggleClustering() / toggleLinks() / toggleRouters()

// Side panel management
openSidePanel(type, data)
closeSidePanel()

// Circuit selection
setSelectedCircuit(circuit)
clearSelectedCircuit()

// Filtering
hasActiveFilters() / clearAllFilters()

// State reset
resetState()
```

#### 2. **MapDataService** (`map-data.service.ts`)
Fetches raw data from APIs and merges fabric + edge API responses.

**Key Methods:**
```typescript
async fetchRouters(): Promise<{routers, routerTypes}>
// Merges fabric routers with edge router metadata (roleAttributes)
// Returns routerTypes map: edge-router | transit-router

async fetchIdentities(): Promise<any[]>
// Filters out "Router" type identities (already shown as markers)

async fetchServices(): Promise<any[]>
async fetchCircuits(): Promise<any[]>
async fetchTerminators(): Promise<any[]>
async fetchLinks(): Promise<any[]>
```

#### 3. **CircuitCalculationService** (`circuit-calculation.service.ts`)
Analyzes circuits to extract topology information.

**Key Methods:**
```typescript
findHostIdentityId(circuit, terminators): string | null
// Finds the service hosting identity for a circuit
// Tries: circuit.tags.hostId → terminator lookup → service terminator

buildCircuitPath(circuit, identities, locations, routers, terminators): CircuitPath | null
// Builds a complete path: client identity → routers → host identity
// Returns null if path is incomplete or missing locations
```

#### 4. **CircuitPathBuilderService** (`circuit-path-builder.service.ts`)
Constructs detailed circuit visualization data.

**Key Methods:**
```typescript
buildCircuitPathData(circuit, routerLocations, identityLocations, routers, identities): CircuitPathData | null
// Returns complete path data:
// - pathNodes, pathCoordinates
// - routerNames, entityIds, entityTypes
// - circuitHops (with visibility flags)
// - clientId, clientName, hostId, hostName
// - hasCompleteGeolocation, missingLocations
```

#### 5. **CircuitFilterService** (`circuit-filter.service.ts`)
Filters identities based on service/identity/router attribute selections.

**Key Methods:**
```typescript
getFilteredIdentityIds(identities, circuits, terminators, servicFilters, identityFilters): Set<string>
// Returns identities that:
// 1. Match selected identity filters (if any)
// 2. Have circuits for selected services (if any)
// 3. Host selected services (terminators)
```

#### 6. **MapMarkerService** (`map-marker.service.ts`)
Manages Leaflet markers for identities and routers.

**Key Responsibilities:**
- Create marker icons (SVG-based with scaling)
- Add/remove markers from cluster groups
- Handle marker interactions (click, drag, context menu)
- Track draggable marker state
- Scale markers for active circuit participation
- Emit events: `markerClicked`, `geolocationUpdated`, `geolocationRemoved`

**Key Methods:**
```typescript
createMarkerIcon(type: 'identity' | 'routers', isSelected, scale): L.Icon
addMarkers(data, type, clusterGroup, map, routerLocations, identityLocations): L.Marker[]
updateMarkerLocations(markers, locations, markerMap)
handleMarkerClick(marker, item, type)
makeMarkerDraggable(marker, item, type)
updateMarkerSize(markerIds: Set, scale)
```

#### 7. **MapRenderingService** (`map-rendering.service.ts`)
Renders network elements to Leaflet map.

**Key Responsibilities:**
- Render markers and cluster groups
- Draw links between routers
- Draw circuit paths (polylines with color coding)
- Update visibility based on toggles
- Handle clustering state
- Manage map panning/zooming

**Key Methods:**
```typescript
initializeMap(containerId): L.Map
renderMarkers(identities, routers, state)
renderLinks(links, routerLocations)
renderCircuitPath(circuit, pathData)
updateEntityVisibility(type, visible)
updateClusteringState(enabled)
```

#### 8. **GeolocationService** (`geolocation.service.ts`)
Handles reading and persisting geolocation data.

**Key Responsibilities:**
- Parse geolocation tags (format: "lat,lng")
- Update location in-memory (no save)
- Save location changes to backend
- Handle both edge-routers and transit-routers
- Provide user feedback (growlers)

**Key Methods:**
```typescript
updateGeolocationLocal(item, lat, lng): void
async saveGeolocation(item, type, routerTypes): Promise<void>
// Saves to: /edge-routers or /transit-routers or /identities
```

### Component Structure

#### Main Component: **GeolocateComponent**
- **File**: `geolocate.component.ts`
- **Template**: `geolocate.component.html`
- **Style**: `geolocate.component.scss`

**Responsibilities:**
- Coordinate data fetching and service initialization
- Manage overall component lifecycle
- Handle user interactions (map clicks, marker events)
- Coordinate between services
- Provide data to sub-components via template

**Key Properties:**
```typescript
map: L.Map                                    // Leaflet map instance
identityClusterGroup: L.MarkerClusterGroup    // Identity markers cluster
routerClusterGroup: L.MarkerClusterGroup      // Router markers cluster

// Data caches
circuits: any[]
terminators: any[]
identities: any[]
edgeRouters: any[]
services: any[]
links: any[]

// UI state
showVisualizer: boolean
unlocatedIdentities: number
unlocatedRouters: number
servicesWithActiveCircuits: number
geolocatedIdentities: number
geolocatedRouters: number
```

### Sub-Components (10 Components)

**Side Panel Components:**
1. **side-panel-container.component** - Resizable side panel wrapper
2. **marker-panel.component** - Displays marker (identity/router) details and location editing
3. **circuit-panel.component** - Shows selected circuit information with path visualization
4. **link-panel.component** - Displays link details and metrics
5. **unlocated-panel.component** - Lists entities without geolocation data
6. **entity-list-panel.component** - Paginated entity list with search/sort
7. **services-with-circuits-panel.component** - Lists services with active circuits

**UI Components:**
8. **filter-bar.component** - Service/identity/router attribute filters with dropdown selectors
9. **map-legend.component** - Visual legend explaining map markers and colors
10. **entity-count-legend.component** - Shows entity counts (located/unlocated)

**Supporting Tables:**
- **circuit-hops-table.component** - Displays circuit path hops
- **router-path-table.component** - Shows router sequence in circuit path

### Data Structures

#### Location Data
```typescript
{
  lat: number,      // Latitude from geolocation tag
  lng: number,      // Longitude from geolocation tag
  name: string      // Entity name (for display)
}
```

#### Circuit Path
```typescript
{
  nodes: CircuitPathNode[],         // Path nodes with coordinates
  coordinates: [number, number][]   // Lat/lng tuples for polyline
}

type CircuitPathNode = {
  id: string,
  name: string,
  type: 'identity' | 'routers',
  lat: number,
  lng: number
}
```

#### CircuitPathData (Complete)
```typescript
{
  pathNodes: any[],                         // Path node objects
  pathCoordinates: [number, number][],      // Coordinates
  routerNames: string[],
  entityIds: string[],
  entityTypes: string[],
  circuitHops: any[],                       // Hops with isVisible flag
  circuitRouters: any[],
  clientId: string | null,
  clientName: string,
  hostId: string | null,
  hostName: string,
  hasCompleteGeolocation: boolean,          // All entities have locations
  missingLocations: string[],
  visibleSegmentToHopIndex: Map<number, number>
}
```

### Integration with Main Component

The GeolocateComponent:

1. **Initialization** (ngOnInit):
   - Fetch all data in parallel (MapDataService)
   - Initialize map instance (MapRenderingService)
   - Populate MapStateService with location data
   - Create and render markers

2. **Data Subscriptions** (RxJS):
   - MapStateService observables for state changes
   - Visibility toggles → re-render map
   - Filter changes → recalculate visibility

3. **User Interactions**:
   - Map click → fetch nearby entities
   - Marker click → show side panel
   - Marker drag → update geolocation (local)
   - Save location → GeolocationService.saveGeolocation()

4. **Context Menus**:
   - Right-click on marker → edit location
   - Location input → immediate visual update

### Special Features

**Circuit Visualization**
- Color-coded polylines by latency
- Smooth bezier curves between points
- Hover effects to highlight paths
- Click to select circuits

**Geolocation Tagging**
- Format: `geolocation: "lat,lng"` in entity tags
- Editable via map interface (drag markers)
- Persisted to entity backend

**Clustering**
- Default: clustering enabled for visual clarity
- Toggle to show individual markers
- Dynamic scaling for circuit participants

**Filtering**
- Multi-select attributes (service, identity, router)
- Connection status filter
- Attribute-based filtering with role attributes

**Unlocated Entities**
- Separate panel for entities without geolocation
- Lists with search capability
- Quick location assignment interface

## Styling & Theme

- **Global styles**: `projects/ziti-console-lib/src/lib/shared-assets/styles/`
- **Component styles**: SCSS co-located with components (`.component.scss`)
- **Theme**: PrimeNG theme (saga-blue) + Angular Material
- **Icons**: Material Icons + PrimeIcons
- **Responsive**: Mobile-friendly with adaptive layouts

## Common Patterns & Conventions

### Service Injection
Services are injected and provided at root level:
```typescript
@Injectable({ providedIn: 'root' })
export class MyService { }

constructor(private service: MyService) { }
```

### RxJS Observables
State management uses BehaviorSubject + Observable pattern:
```typescript
private _visible$ = new BehaviorSubject<boolean>(false);
visible$ = this._visible$.asObservable();

set visible(value: boolean) {
  this._visible$.next(value);
}
```

### Component Subscription Management
Use async pipe in templates for automatic unsubscribe:
```html
<div *ngIf="(visibleState$ | async)">Content</div>
```

### Forms & Validation
- Dynamic forms via ProjectableFormComponent
- Validation service for common rules
- Material form controls with error messages

### Data Transformations
- MapDataService for API data fetching
- Service-specific processors for business logic
- Type-safe data structures via interfaces

## Configuration

### Environment Files
```
projects/app-ziti-console/src/app/environments/
├── environment.ts           # Development
├── environment.prod.ts      # Production
└── environment.node.ts      # Node.js server (deprecated)
```

### Angular.json Build Targets
- **ziti-console**: Main SPA application
- **ziti-console-node**: Deprecated Node server
- **ziti-console-lib**: Shared library

### SCSS Configuration
All SCSS compiles to CSS with source maps in development.

## Testing

The project uses:
- **Test Framework**: Jasmine 4.6.0
- **Test Runner**: Karma 6.4.0
- **Coverage**: karma-coverage 2.2.0

```bash
npm test                          # Run all tests with watch mode
ng test ziti-console             # Test main application
ng test ziti-console-lib         # Test library
```

## Deployment

### Single Page Application (Recommended)
1. Build: `ng build ziti-console --configuration production`
2. Output: `dist/app-ziti-console/`
3. Deploy to any static hosting (CDN, nginx, etc.)
4. Backend: Configure controller URL via environment settings

### Docker
```bash
npm run docker:build              # Build image
npm run docker:run                # Run locally
npm run docker:publish            # Push to registry
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `angular.json` | Angular CLI configuration for all projects |
| `package.json` | Dependencies and build scripts |
| `projects/ziti-console-lib/src/public-api.ts` | Library public API exports |
| `projects/app-ziti-console/src/app/app-routing.module.ts` | Main app routes |
| `projects/ziti-console-lib/src/lib/ziti-console-lib.module.ts` | Library root module |
| `projects/ziti-console-lib/src/lib/services/ziti-data.service.ts` | Core API service |
| `projects/ziti-console-lib/src/lib/pages/geolocate/` | Geolocate feature |

## Resource Links

- **OpenZiti**: https://openziti.io/
- **OpenZiti Docs**: https://openziti.io/docs/
- **Edge API Reference**: https://openziti.io/docs/reference/developer/api/
- **Angular CLI**: https://angular.io/cli
- **Leaflet**: https://leafletjs.com/
- **RxJS**: https://rxjs.dev/
- **PrimeNG**: https://primeng.org/

## Quick Reference: Common Tasks

### Add a New Page Component
```bash
ng generate component pages/my-page --project ziti-console-lib
```

### Add a Service
```bash
ng generate service services/my-service --project ziti-console-lib
```

### Build Library Only
```bash
ng build ziti-console-lib
```

### Debug in Development
```bash
npm start                         # Starts with source maps
# Chrome DevTools: Open localhost:4200
```

### Export from Library
Edit `projects/ziti-console-lib/src/public-api.ts` and add:
```typescript
export * from './lib/path/to/component';
```

## IDE Setup

### VSCode
- Install Angular Language Service extension
- Install Prettier extension for formatting
- Install ESLint extension

### WebStorm
- Built-in Angular support
- File watchers for SCSS compilation (optional)

## Git Workflow

- Main branch: `main`
- Feature branches: `feature/description` or issue number
- Commit messages: Descriptive and concise
- PRs require review before merge

---

**Last Updated**: February 2026
**Current Version**: 4.0.3
**Angular Version**: 16.2.12
**Node Version**: 18.13.0+
