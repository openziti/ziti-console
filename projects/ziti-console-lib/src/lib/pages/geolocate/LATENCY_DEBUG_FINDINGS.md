# Debug Findings: Missing Latency Values in Circuit Hops Table

## Issue Summary
Latency values are not appearing in the circuit hops table. The root cause: **the `links` parameter is not being passed to `buildCircuitPathData()` in multiple call locations**.

---

## 1. MOCK DATA STRUCTURE - Links

**File**: `/Users/rgalletto/nf/source/ziti-console/projects/ziti-console-lib/src/lib/assets/mock-data/links.json`

### Link Object Structure (Sample):
```json
{
  "connections": [
    {
      "dest": "tcp:126.69.68.76:40885",
      "source": "tcp:21.242.195.80:24827",
      "type": "ack"
    }
  ],
  "cost": 109,
  "destLatency": 220639076,
  "destRouter": {
    "_links": {
      "self": {
        "href": "./routers/mgqtrE5PVH"
      },
      "terminators": {
        "href": "./routers/mgqtrE5PVH/terminators"
      }
    },
    "entity": "routers",
    "id": "mgqtrE5PVH",
    "name": "london-router-7"
  },
  "down": false,
  "id": "L1L6gNhMjY2Z93h0HfjxXV",
  "iteration": 2,
  "protocol": "tls",
  "sourceLatency": 219783019,
  "sourceRouter": {
    "_links": {
      "self": {
        "href": "./routers/UHAGL4duxr"
      },
      "terminators": {
        "href": "./routers/UHAGL4duxr/terminators"
      }
    },
    "entity": "routers",
    "id": "UHAGL4duxr",
    "name": "tokyo-router-11"
  },
  "state": "Connected",
  "staticCost": 1
}
```

**Key Latency Fields**:
- `sourceLatency`: 219783019 (nanoseconds) - latency of source router
- `destLatency`: 220639076 (nanoseconds) - latency of destination router
- `sourceRouter.id`: "UHAGL4duxr" - source router ID
- `destRouter.id`: "mgqtrE5PVH" - destination router ID

---

## 2. MOCK DATA STRUCTURE - Circuits

**File**: `/Users/rgalletto/nf/source/ziti-console/projects/ziti-console-lib/src/lib/assets/mock-data/circuits.json`

### Circuit Object Structure (Sample):
```json
{
  "_links": {
    "self": {
      "href": "./circuits/t25eOgxIZPEbLF80Qp4DR6"
    },
    "services": {
      "href": "./circuits/t25eOgxIZPEbLF80Qp4DR6/services"
    },
    "terminators": {
      "href": "./circuits/t25eOgxIZPEbLF80Qp4DR6/terminators"
    }
  },
  "createdAt": "2026-01-28T04:22:06.273Z",
  "id": "t25eOgxIZPEbLF80Qp4DR6",
  "tags": {
    "clientId": "MNm5nLecvUJt",
    "hostId": "PjtgpwFnC947",
    "serviceId": "pO7xUei4ySwMYCyuYXzkMZ"
  },
  "updatedAt": "2026-02-01T04:22:06.273Z",
  "clientId": "MNm5nLecvUJt",
  "path": {
    "links": [
      {
        "_links": {
          "self": {
            "href": "./links/SYzg6tQi3BUPVGLO6ZqCet"
          }
        },
        "entity": "links",
        "id": "SYzg6tQi3BUPVGLO6ZqCet",
        "name": "SYzg6tQi3BUPVGLO6ZqCet"
      }
    ],
    "nodes": [
      {
        "_links": {
          "self": {
            "href": "./routers/U5Z6wtTaqw"
          },
          "terminators": {
            "href": "./routers/U5Z6wtTaqw/terminators"
          }
        },
        "entity": "routers",
        "id": "U5Z6wtTaqw",
        "name": "frankfurt-router-8"
      }
    ]
  }
}
```

**Key Path Structure**:
- `path.nodes`: Array of router objects with `id` and `name`
- `path.links`: Array of link objects (currently only contains ID/name, NOT latency data)
- Router IDs in path.nodes should match `sourceRouter.id` or `destRouter.id` in link data

---

## 3. GEOLOCATE COMPONENT - Links Declaration and Population

**File**: `/Users/rgalletto/nf/source/ziti-console/projects/ziti-console-lib/src/lib/pages/geolocate/geolocate.component.ts`

### Declaration (Line 86):
```typescript
// Data caches
circuits: any[] = [];
terminators: any[] = [];
identities: any[] = [];
edgeRouters: any[] = [];
services: any[] = [];
links: any[] = [];
```

### First Population - From Mock Data (Lines 589):
```typescript
// Load links
this.links = linksData.data || [];
```
This occurs in `ngOnInit()` where mock data is loaded.

### Second Population - From API (Lines 868-870):
```typescript
this.links = links;
// Links will be drawn when data is ready or when filters change
if (this.mapStateService.selectedServiceAttributes.length === 0 &&
```
This occurs when fetching real data from the API.

---

## 4. CIRCUIT PATH HANDLING IN GEOLOCATE

**File**: `/Users/rgalletto/nf/source/ziti-console/projects/ziti-console-lib/src/lib/pages/geolocate/geolocate.component.ts`

### How circuit.path is structured (Lines 1571, 1657, 2656, 2741):
```typescript
// Handle both formats: circuit.path.nodes (new) or circuit.path (old)
const pathNodes = circuit.path?.nodes || circuit.path;

if (pathNodes) {
  // pathNodes is an array of router objects or IDs
  pathNodes.forEach((node: any) => {
    // Process each node
  });
}
```

**Key Point**: Circuits contain router IDs in the path, which need to be matched with links to get latency data.

---

## 5. ROOT CAUSE - Missing Links Parameter in buildCircuitPathData()

### Problem Location 1: map-rendering.service.ts (Lines 299-305)

**File**: `/Users/rgalletto/nf/source/ziti-console/projects/ziti-console-lib/src/lib/pages/geolocate/services/map-rendering.service.ts`

**Function Signature (Lines 245-260)**:
```typescript
drawActiveCircuits(
  map: any,
  circuits: any[],
  identities: any[],
  identityLocations: Map<string, any>,
  routerLocations: Map<string, any>,
  terminators: any[],
  edgeRouters: any[],
  services: any[],
  selectedServiceAttributes: any[],
  selectedServiceNamedAttributes: any[],
  selectedCircuitSegment: any,
  activeCircuitsVisible: boolean,
  isCircuitSelectionActive: boolean,
  scaleCircuitMarkersCallback: (scaleUp: boolean) => void
): Set<string>
```

**BUG - Missing links parameter**: The function signature does NOT include a `links` parameter!

**Call to buildCircuitPathData (Lines 299-305)**:
```typescript
// MISSING 6th parameter: links!
const circuitPathData = this.circuitPathBuilderService.buildCircuitPathData(
  circuit,
  routerLocations,
  identityLocations,
  routers,
  identities
  // BUG: links parameter not passed!
);
```

### Problem Location 2: geolocate.component.ts (Lines 1604-1610)

**File**: `/Users/rgalletto/nf/source/ziti-console/projects/ziti-console-lib/src/lib/pages/geolocate/geolocate.component.ts`

**Call to buildCircuitPathData**:
```typescript
// MISSING 6th parameter: links!
const circuitPathData = this.circuitPathBuilderService.buildCircuitPathData(
  circuit,
  this.mapStateService.routerLocations,
  this.mapStateService.identityLocations,
  this.edgeRouters,
  this.identities
  // BUG: links parameter not passed!
);
```

### Working Example: geolocate.component.ts (Lines 2966-2973)

**File**: `/Users/rgalletto/nf/source/ziti-console/projects/ziti-console-lib/src/lib/pages/geolocate/geolocate.component.ts`

This call CORRECTLY passes the links parameter:
```typescript
// CORRECT - links parameter is passed!
const pathData = this.circuitPathBuilderService.buildCircuitPathData(
  circuit,
  this.mapStateService.routerLocations,
  this.mapStateService.identityLocations,
  this.edgeRouters,
  this.identities,
  this.links  // <-- CORRECTLY PASSED!
);
```

---

## 6. CIRCUIT PATH BUILDER SERVICE - Latency Calculation

**File**: `/Users/rgalletto/nf/source/ziti-console/projects/ziti-console-lib/src/lib/pages/geolocate/services/circuit-path-builder.service.ts`

### Interface Definition (Lines 3-14):
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
  latencyMs?: number; // Average latency for router-to-router hops (in ms), from link data
}
```

### Function Signature (Lines 47-54):
```typescript
buildCircuitPathData(
  circuit: any,
  routerLocations: Map<string, any>,
  identityLocations: Map<string, any>,
  routers: any[],
  identities: any[],
  links: any[] = []  // <-- Optional parameter with default empty array
): CircuitPathData | null
```

### Latency Calculation Logic (Lines 154-168):
```typescript
// Compute latency for router-to-router hops by matching against link data
let latencyMs: number | undefined;
if (allNodeTypes[i] === 'routers' && allNodeTypes[i + 1] === 'routers' && links.length > 0) {
  const fromId = allNodeIds[i];
  const toId = allNodeIds[i + 1];
  const matchingLink = links.find(link =>
    (link.sourceRouter?.id === fromId && link.destRouter?.id === toId) ||
    (link.destRouter?.id === fromId && link.sourceRouter?.id === toId)
  );
  if (matchingLink) {
    const srcLatency = matchingLink.sourceLatency || 0;
    const dstLatency = matchingLink.destLatency || 0;
    latencyMs = (srcLatency + dstLatency) / 2 / 1_000_000;  // Convert nanoseconds to milliseconds
  }
}
```

### Hop Creation (Lines 170-181):
```typescript
circuitHops.push({
  from: allNodeNames[i],
  to: allNodeNames[i + 1],
  fromId: allNodeIds[i],
  toId: allNodeIds[i + 1],
  fromType: allNodeTypes[i],
  toType: allNodeTypes[i + 1],
  isVisible: isVisible,
  fromHasLocation: fromHasLocation,
  toHasLocation: toHasLocation,
  latencyMs  // <-- Latency (undefined if no matching link found)
});
```

---

## 7. CIRCUIT HOPS TABLE - Display Layer

**File**: `/Users/rgalletto/nf/source/ziti-console/projects/ziti-console-lib/src/lib/pages/geolocate/components/circuit-hops-table/circuit-hops-table.component.html`

### Latency Display (Lines 64-73):
```html
<td class="hop-latency">
  <span *ngIf="hop.latencyMs !== undefined"
        class="latency-value"
        [class.latency-good]="hop.latencyMs < 50"
        [class.latency-elevated]="hop.latencyMs >= 50 && hop.latencyMs < 100"
        [class.latency-poor]="hop.latencyMs >= 100">
    {{ hop.latencyMs | number:'1.1-1' }}ms
  </span>
  <span *ngIf="hop.latencyMs === undefined" class="latency-na">—</span>
</td>
```

The table correctly handles displaying latency IF the value exists in the hop object.

---

## Summary of the Problem

| Location | Issue |
|----------|-------|
| **map-rendering.service.ts (line 299)** | `buildCircuitPathData()` called WITHOUT `links` parameter |
| **geolocate.component.ts (line 1604)** | `buildCircuitPathData()` called WITHOUT `links` parameter |
| **geolocate.component.ts (line 2966)** | `buildCircuitPathData()` called WITH `links` parameter (CORRECT) |
| **circuit-path-builder.service.ts** | Service expects `links` parameter, calculates latency IF links provided |
| **circuit-hops-table.component.html** | Template displays latency IF `hop.latencyMs !== undefined` |

### Why Latency Shows as "—" (N/A):
1. `drawActiveCircuits()` in map-rendering.service calls `buildCircuitPathData()` WITHOUT passing `links`
2. Service defaults to empty array: `links: any[] = []`
3. Latency calculation is skipped: `if (allNodeTypes[i] === 'routers' && allNodeTypes[i + 1] === 'routers' && links.length > 0)`
4. `latencyMs` remains `undefined`
5. Template displays "—" when latencyMs is undefined

---

## Solution

Pass the `links` array to `buildCircuitPathData()` calls in:
1. `map-rendering.service.ts` line 299
2. `geolocate.component.ts` line 1604

Both calls need to add `this.links` as the 6th parameter, similar to how it's done at line 2966.
