# Geolocate Component Documentation

This directory contains comprehensive documentation about circuit data structures and latency information in the Ziti Console geolocate component.

## Documentation Files

### 1. QUICK_REFERENCE.md (START HERE)
**Best for**: Quick answers and quick lookups
- Where is latency data stored?
- File locations and structure
- Key interfaces and data structures
- Latency thresholds
- Quick examples

**Read this first**: 5-10 minute read

### 2. CIRCUIT_DATA_STRUCTURES.md
**Best for**: Comprehensive understanding
- Detailed overview of all data structures
- Circuit object structure and properties
- Link object structure (where latency is!)
- CircuitHop and CircuitPathData interfaces
- Side panel data flow
- Data fetching initialization
- Where and how to add latency to circuit hops

**Read this**: Complete reference (15-20 minute read)

### 3. CODE_SNIPPETS.md
**Best for**: Copy/paste and implementation reference
- Actual code from the codebase
- All key interfaces with file references
- Building hops from path nodes
- Opening side panels with circuit data
- Component templates
- Link latency processing
- Drawing circuit segments

**Use this**: When implementing or modifying code

---

## Quick Navigation

### Question: Where is latency data?
Answer: **Link objects** - router-to-router connections
- File: `assets/mock-data/links.json`
- Fields: `sourceLatency`, `destLatency` (in nanoseconds)
- Conversion: `latencyMs = latencyNs / 1000000`

See: QUICK_REFERENCE.md > "Where is Latency Data?"

---

### Question: What data structure displays circuit hops?
Answer: **CircuitHop interface**
- File: `services/circuit-path-builder.service.ts`
- Currently: No latency field
- Displays: Logical hops (client → routers → host)
- Usage: `circuit-hops-table.component`

See: CODE_SNIPPETS.md > "CircuitHop Interface Definition"

---

### Question: How are circuit hops built?
Answer: From circuit path nodes plus client/host identities
- Builder: `CircuitPathBuilderService.buildCircuitPathData()`
- Process: Add client, iterate path nodes, add host
- Output: CircuitHop[] with visibility flags

See: CODE_SNIPPETS.md > "Building CircuitHops from Path Nodes"

---

### Question: How to add latency display to hops?
Answer: Three options depending on requirements
1. Add `latencyMs?: number` field to CircuitHop
2. Add latency arrays to CircuitPathData
3. Pass links separately to components

See: CIRCUIT_DATA_STRUCTURES.md > Section 9: "WHERE TO ADD LATENCY DATA"

---

## Key Concepts

### Circuit vs Link
- **Circuit**: End-to-end connection from client to host through routers
- **Link**: Physical router-to-router connection
- **Relationship**: Circuit path contains links, but links have latency data

### CircuitHop vs Link
- **CircuitHop**: Logical segment in circuit display (no latency currently)
- **Link**: Physical network connection (has latency)
- **Mismatch**: Hops display topology, links have performance metrics

### Visible vs Total Hops
- **Total hops**: All entities (client, routers, host) even without geolocation
- **Visible hops**: Only hops where both endpoints have coordinates
- **Map rendering**: Only draws visible segments (with complete geolocation data)

---

## File Structure

```
/geolocate/
├── README.md                                          # This file
├── QUICK_REFERENCE.md                                 # Quick answers
├── CIRCUIT_DATA_STRUCTURES.md                         # Comprehensive guide
├── CODE_SNIPPETS.md                                   # Implementation reference
│
├── geolocate.component.ts                             # Main orchestrator
├── geolocate.component.html
├── geolocate.component.scss
│
├── services/
│   ├── circuit-path-builder.service.ts                # Builds CircuitPathData
│   ├── circuit-calculation.service.ts
│   ├── circuit-filter.service.ts
│   ├── map-rendering.service.ts                       # Renders circuits & links
│   ├── map-marker.service.ts
│   ├── map-state.service.ts
│   ├── map-data.service.ts
│   └── geolocation.service.ts
│
├── components/
│   ├── circuit-panel/
│   │   ├── circuit-panel.component.ts
│   │   ├── circuit-panel.component.html
│   │   └── circuit-panel.component.scss
│   ├── circuit-hops-table/
│   │   ├── circuit-hops-table.component.ts
│   │   ├── circuit-hops-table.component.html
│   │   └── circuit-hops-table.component.scss
│   ├── router-path-table/
│   ├── side-panel-container/
│   ├── marker-panel/
│   ├── link-panel/
│   ├── unlocated-panel/
│   ├── entity-list-panel/
│   ├── services-with-circuits-panel/
│   ├── filter-bar/
│   ├── map-legend/
│   └── entity-count-legend/
│
└── assets/mock-data/
    ├── circuits.json                                  # Mock circuits (NO latency)
    ├── links.json                                     # Mock links (HAS latency!)
    └── ...
```

---

## Data Flow Summary

```
Initialization:
  1. MapDataService.fetchCircuits() -> circuits array
  2. MapDataService.fetchLinks() -> links array (has latency!)
  3. MapDataService.fetchRouters() -> routers with locations
  4. MapDataService.fetchIdentities() -> identities with locations
  5. MapStateService populated with location maps

Circuit Selection:
  1. User clicks circuit segment on map
  2. mapRenderingService.circuitSegmentClicked emitted
  3. geolocate.component.openSidePanel('circuit', data)
  4. CircuitPathBuilderService.buildCircuitPathData() called
  5. Side panel receives CircuitPathData with circuitHops
  6. circuit-hops-table displays hops
  7. circuit-panel shows overall info

Link Rendering:
  1. Links fetched with sourceLatency/destLatency (nanoseconds)
  2. Converted to milliseconds
  3. Colored based on thresholds (green/yellow/red)
  4. Rendered as colored polylines on map
```

---

## Common Tasks

### Find where circuits are fetched
- File: `services/map-data.service.ts` -> `fetchCircuits()`
- Called from: `geolocate.component.ts` ngOnInit()

### Find where hops are created
- File: `services/circuit-path-builder.service.ts` -> `buildCircuitPathData()`
- Called from: `map-rendering.service.ts` (drawActiveCircuits)

### Find where circuit panel data is passed
- File: `geolocate.component.ts` -> `openSidePanel('circuit', data)`
- Lines: 2995-3016 and 1741-1765

### Find where hops are displayed
- Component: `circuit-hops-table.component`
- Template: Shows from -> to, isVisible flag, icons

### Find latency processing
- File: `services/map-rendering.service.ts`
- Lines: 72-100 (drawLinks)
- Lines: 80-83 (latency conversion)

---

## Latency Thresholds

Industry-standard thresholds for network infrastructure:

- **GREEN (< 50ms)**: Excellent/normal latency
  - Suitable for all real-time applications
  - No user-perceivable delay
  
- **YELLOW (50-100ms)**: Elevated/noticeable
  - Acceptable but noticeable in real-time apps
  - May impact interactive response times
  
- **RED (> 100ms)**: Poor/problematic
  - Significantly impacts user experience
  - Causes noticeable delays in interactive applications
  - Not suitable for high-frequency operations

---

## Next Steps

1. Start with: **QUICK_REFERENCE.md**
2. For details: **CIRCUIT_DATA_STRUCTURES.md**
3. For coding: **CODE_SNIPPETS.md**
4. For questions: Check "Quick Navigation" section above

---

## Questions?

Refer to the documentation structure:
- **What is it?** → CIRCUIT_DATA_STRUCTURES.md
- **How do I use it?** → CODE_SNIPPETS.md
- **Quick answer?** → QUICK_REFERENCE.md

