# Circuit Data Structures in Ziti Console Geolocate Component

## Overview
This document describes how circuit data is structured, fetched, displayed, and where latency information is stored in the geolocate component.

---

## 1. CIRCUIT OBJECT (from API/Mock Data)

The raw circuit object comes from `/assets/mock-data/circuits.json` and has this structure:

```typescript
{
  id: string;                    // Circuit ID
  tags: {
    clientId: string;           // ID of client identity
    hostId: string;             // ID of host/service identity
    serviceId: string;          // ID of service
  };
  clientId: string;             // Alternative client ID field
  createdAt: string;            // ISO date string
  updatedAt: string;            // ISO date string
  
  service: {                     // Service object
    id: string;
    name: string;
    entity: string;             // "services"
    _links: {
      self: { href: string };
      terminators: { href: string };
    };
  };
  
  terminator: {                  // Terminator object
    id: string;
    entity: string;             // "terminators"
    _links: {
      self: { href: string };
    };
  };
  
  path: {
    links: Array<{              // Router links in the path (NOT client-to-host latency)
      id: string;
      name: string;
      entity: string;           // "links"
    }>;
    nodes: Array<{              // Router nodes in the path
      id: string;
      name: string;
      entity: string;           // "routers"
    }>;
  };
}
```

### Key Points About Circuit Object:
- **NO latency data on circuit itself** - circuits don't carry latency info
- `path.links` references router-to-router link IDs (NOT latency data)
- `path.nodes` contains intermediate routers only (NOT client or host)
- Latency is stored on Link objects, not Circuit objects
- Client and host IDs are stored in `tags` object or top-level properties

---

## 2. LINK OBJECT (where latency IS stored)

Links are separate objects in `/assets/mock-data/links.json`. They represent router-to-router connections:

```typescript
{
  id: string;                    // Link ID
  sourceRouter: {
    id: string;
    name: string;
    entity: string;             // "routers"
  };
  destRouter: {
    id: string;
    name: string;
    entity: string;             // "routers"
  };
  
  // LATENCY DATA (in nanoseconds)
  sourceLatency: number;         // Latency from source router (ns)
  destLatency: number;           // Latency from dest router (ns)
  
  // Other metadata
  state: string;                 // "Connected", "Disconnected"
  down: boolean;                 // Is link down
  cost: number;                  // Link cost
  staticCost: number;
  protocol: string;              // "tls"
  iteration: number;
  connections: Array<{
    source: string;
    dest: string;
    type: string;              // "ack"
  }>;
}
```

### Latency Conversion:
- **Input**: nanoseconds (ns) from API
- **Conversion**: `latencyMs = latencyNs / 1000000`
- **Thresholds** (in map-rendering.service.ts):
  - GREEN (< 50ms): Excellent/normal latency
  - YELLOW (50-100ms): Elevated latency  
  - RED (> 100ms): Poor/problematic latency

---

## 3. CIRCUITHOP DATA STRUCTURE

The `CircuitHop` interface is used to display circuit segments in the UI:

```typescript
// From circuit-path-builder.service.ts
export interface CircuitHop {
  from: string;                 // Start entity name
  fromType: string;             // "identity" or "routers"
  fromId: string;               // Start entity ID
  fromHasLocation: boolean;      // Is start entity geolocated?
  
  to: string;                   // End entity name
  toType: string;               // "identity" or "routers"
  toId: string;                 // End entity ID
  toHasLocation: boolean;        // Is end entity geolocated?
  
  isVisible: boolean;            // Both endpoints have geolocation?
}
```

### Important Notes:
- **NO latency field in CircuitHop** - hops only show connectivity between entities
- `isVisible` = true only if both `fromHasLocation` and `toHasLocation` are true
- Built from path.nodes + client/host identities
- Represents logical connections, not physical network links

---

## 4. CIRCUITPATHDATA STRUCTURE

Complete circuit visualization data built by CircuitPathBuilderService:

```typescript
// From circuit-path-builder.service.ts
export interface CircuitPathData {
  pathNodes: any[];                          // Router nodes in path
  pathCoordinates: [number, number][];        // [lat, lng] tuples for rendering
  
  routerNames: string[];                      // Names of routers with locations
  entityIds: string[];                        // IDs of all path entities
  entityTypes: string[];                      // Types: "identity" or "routers"
  
  circuitHops: CircuitHop[];                  // All logical hops (see above)
  circuitRouters: Array<{                     // Router details for display
    id: string;
    name: string;
    type: string;                             // "routers"
    connected: boolean;                       // Is router online?
    _notFound: boolean;                       // Router not in data?
  }>;
  
  clientId: string | null;
  clientName: string;
  hostId: string | null;
  hostName: string;
  
  hasCompleteGeolocation: boolean;            // All entities have locations?
  missingLocations: string[];                 // Entities without geolocation
  
  visibleSegmentToHopIndex: Map<number, number>;  // Maps visual segment to logical hop
}
```

### Key Points:
- Built from circuit + routers + identities + locations
- **Still NO latency data** - this structure is only for displaying path topology
- `visibleSegmentToHopIndex` maps visual line segments (with coordinates) to logical hops
- Only includes entities with geolocation in `pathCoordinates`

---

## 5. SIDE PANEL CIRCUIT DATA

When a circuit is selected and side panel opens, the data passed is:

```typescript
// From geolocate.component.ts openSidePanel()
mapStateService.sidePanelData = {
  circuit: circuit,                    // Full circuit object
  segment: {
    index: number;                     // Logical hop index
    total: number;                     // Total hops in circuit
    from: string;
    to: string;
    fromId: string;
    toId: string;
    fromType: string;                  // "identity" or "routers"
    toType: string;
    isVisible: boolean;
    fromHasLocation: boolean;
    toHasLocation: boolean;
  };
  pathNodes: any[];
  pathCoordinates: [number, number][];
  routerNames: string[];
  entityIds: string[];
  entityTypes: string[];
  circuitHops: CircuitHop[];           // Used by circuit-hops-table
  circuitRouters: any[];               // Used by router-path-table
  visibleSegmentToHopIndex: Map<number, number>;
}
```

---

## 6. CIRCUIT HOPS TABLE DISPLAY

The `circuit-hops-table.component` displays circuit hops:

```html
<!-- circuit-hops-table.component.html -->
<tr *ngFor="let hop of circuitHops; let i = index"
    (click)="hopSelected.emit({hop, index: i})"
    [class.selected-row]="selectedSegmentIndex === i"
    [class.hop-not-visible]="!hop.isVisible">
  
  <td>{{ i + 1 }}</td>
  <td>
    <span *ngIf="!hop.fromHasLocation" class="unlocated-icon"></span>
    <span>{{ hop.from }}</span>
  </td>
  <td>→</td>
  <td>
    <span *ngIf="!hop.toHasLocation" class="unlocated-icon"></span>
    <span>{{ hop.to }}</span>
  </td>
</tr>
```

### Display Logic:
- Shows from → to for each hop
- Marks hops with `isVisible = false` as "not visible on map"
- Icons show if endpoints have geolocation
- Click emits `hopSelected` event with hop and index

---

## 7. CIRCUIT PANEL COMPONENT

The `circuit-panel.component` displays overall circuit info:

```html
<!-- circuit-panel.component.html -->
<table class="details-table">
  <tr>
    <td>Service:</td>
    <td>{{ circuitData?.circuit?.service?.name }}</td>
  </tr>
  <tr>
    <td>Client:</td>
    <td>{{ circuitData?.circuit?.tags?.clientId }}</td>
  </tr>
  <tr>
    <td>From:</td>
    <td>{{ circuitData?.segment?.from }}</td>
  </tr>
  <tr>
    <td>To:</td>
    <td>{{ circuitData?.segment?.to }}</td>
  </tr>
  <tr>
    <td>Hop:</td>
    <td>{{ circuitData?.segment?.index + 1 }} of {{ circuitData?.segment?.total }}</td>
  </tr>
  <tr>
    <td>Total Path:</td>
    <td>{{ circuitData?.pathNodes?.length }} routers</td>
  </tr>
  <tr>
    <td>Created:</td>
    <td>{{ circuitData?.circuit?.createdAt | date:'short' }}</td>
  </tr>
</table>

<!-- Child components -->
<lib-circuit-hops-table
  [circuitHops]="circuitData?.circuitHops"
  [selectedSegmentIndex]="selectedSegmentIndex"
  (hopSelected)="onHopSelected($event)">
</lib-circuit-hops-table>

<lib-router-path-table
  [circuitRouters]="circuitData?.circuitRouters"
  [selectedRouterId]="selectedRouterId"
  (routerSelected)="onRouterSelected($event)">
</lib-router-path-table>
```

---

## 8. DATA FETCHING FLOW

### Initialization (geolocate.component.ts):
```
1. ngOnInit() loads data in parallel:
   - MapDataService.fetchCircuits() → circuits array
   - MapDataService.fetchLinks() → links array (has latency!)
   - MapDataService.fetchRouters() → routers with locations
   - MapDataService.fetchIdentities() → identities with locations
   - MapDataService.fetchTerminators() → terminators

2. MapStateService populated with:
   - routerLocations: Map<routerId, {lat, lng, name}>
   - identityLocations: Map<identityId, {lat, lng, name}>

3. Circuits drawn on map by MapRenderingService.drawActiveCircuits()

4. When circuit segment clicked:
   - circuitSegmentClicked event emitted
   - openSidePanel('circuit', data) called with CircuitPathData
```

---

## 9. WHERE TO ADD LATENCY DATA

### Option 1: Add to CircuitHop (recommended for segment-level latency)
If you want to display latency per circuit hop, modify the `CircuitHop` interface in `circuit-path-builder.service.ts`:

```typescript
export interface CircuitHop {
  from: string;
  fromType: string;
  fromId: string;
  fromHasLocation: boolean;
  to: string;
  toType: string;
  toId: string;
  toHasLocation: boolean;
  isVisible: boolean;
  
  // ADD NEW FIELDS:
  latencyMs?: number;             // Latency between from and to
  linkId?: string;                // Reference to link for more details
}
```

Then in `buildCircuitPathData()`, you would:
1. Look up the link object by matching routers
2. Extract `sourceLatency` and `destLatency`
3. Convert nanoseconds to milliseconds
4. Store in the hop

### Option 2: Add to CircuitPathData (for overall circuit latency)
```typescript
export interface CircuitPathData {
  // ... existing fields ...
  
  // ADD NEW FIELDS:
  linkLatencies: number[];                 // Latency for each segment
  totalLatencyMs?: number;                 // Sum of all latencies
  maxLatencyMs?: number;                   // Worst link latency
}
```

### Option 3: Reference Links separately
Keep links data separate and pass to component:
```typescript
sidePanelData = {
  circuit: circuit,
  segment: segment,
  pathLinks: circuitPathData.circuitHops.map((hop, i) => {
    // Find link between hop.fromId and hop.toId
    return links.find(l => 
      (l.sourceRouter.id === hop.fromId && l.destRouter.id === hop.toId) ||
      (l.sourceRouter.id === hop.toId && l.destRouter.id === hop.fromId)
    );
  }),
  // ... other fields ...
}
```

---

## 10. KEY FILES REFERENCE

| File | Purpose |
|------|---------|
| `geolocate.component.ts` | Main component, orchestrates everything |
| `services/circuit-path-builder.service.ts` | Builds CircuitPathData from circuit |
| `services/map-rendering.service.ts` | Renders circuits on map, uses link latency for coloring |
| `services/circuit-calculation.service.ts` | Analyzes circuits |
| `components/circuit-hops-table/circuit-hops-table.component.ts` | Displays hops table |
| `components/circuit-panel/circuit-panel.component.ts` | Displays circuit details |
| `assets/mock-data/circuits.json` | Mock circuit data |
| `assets/mock-data/links.json` | Mock link data (has latency!) |

---

## Summary

**Key Takeaway**: 
- **Latency is NOT on circuits or hops** - it's on Link objects (router-to-router connections)
- Links are fetched separately and used for link rendering (colored polylines)
- To display latency for circuit hops, you must:
  1. Match circuit path nodes with link objects
  2. Extract sourceLatency/destLatency from matching links
  3. Convert nanoseconds to milliseconds
  4. Add to CircuitHop or CircuitPathData structure
  5. Display in circuit-hops-table or circuit-panel components

