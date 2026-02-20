# Key Code Snippets - Circuit Data Structures

## 1. CircuitHop Interface Definition

**File**: `services/circuit-path-builder.service.ts` (lines 3-13)

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
}
```

**Usage**: Displayed in circuit-hops-table to show each hop in a circuit path.

---

## 2. CircuitPathData Interface Definition

**File**: `services/circuit-path-builder.service.ts` (lines 15-30)

```typescript
export interface CircuitPathData {
  pathNodes: any[];
  pathCoordinates: [number, number][];
  routerNames: string[];
  entityIds: string[];
  entityTypes: string[];
  circuitHops: CircuitHop[]; // All logical hops with 'isVisible' flag
  circuitRouters: any[];
  clientId: string | null;
  clientName: string;
  hostId: string | null;
  hostName: string;
  hasCompleteGeolocation: boolean; // Whether all entities have geolocation data
  missingLocations: string[]; // List of entity names missing geolocation
  visibleSegmentToHopIndex: Map<number, number>; // Maps visual segment index to logical hop index
}
```

**Usage**: Returned by `CircuitPathBuilderService.buildCircuitPathData()` and passed to side panel for display.

---

## 3. Building CircuitHops from Path Nodes

**File**: `services/circuit-path-builder.service.ts` (lines 109-168)

```typescript
// Build circuit hops for display (from/to pairs for each segment)
// Include all entities (even those without geolocation) for complete circuit info
const circuitHops: CircuitHop[] = [];
const allNodeNames: string[] = [];
const allNodeIds: string[] = [];
const allNodeTypes: string[] = [];
const allNodeHasLocation: boolean[] = [];

// Add client (always, even without geolocation)
allNodeNames.push(clientName);
allNodeIds.push(clientId || '');
allNodeTypes.push('identity');
allNodeHasLocation.push(!!clientLocation);

// Add routers from path
for (const routerId of pathNodes) {
  const router = routers.find(r => r.id === routerId);
  const routerName = router?.name || routerId;
  const routerLocation = routerLocations.get(routerId);

  allNodeNames.push(routerLocation?.name || routerName);
  allNodeIds.push(routerId);
  allNodeTypes.push('routers');
  allNodeHasLocation.push(!!routerLocation);
}

// Add host (always, even without geolocation)
allNodeNames.push(hostName);
allNodeIds.push(hostId || '');
allNodeTypes.push('identity');
allNodeHasLocation.push(!!hostLocation);

// Build hops from complete node lists and track which are visible on the map
// A hop is visible if both its endpoints have geolocation data
const visibleSegmentToHopIndex = new Map<number, number>();
let visibleSegmentIndex = 0;

for (let i = 0; i < allNodeNames.length - 1; i++) {
  const fromHasLocation = allNodeHasLocation[i];
  const toHasLocation = allNodeHasLocation[i + 1];
  const isVisible = fromHasLocation && toHasLocation;

  circuitHops.push({
    from: allNodeNames[i],
    to: allNodeNames[i + 1],
    fromId: allNodeIds[i],
    toId: allNodeIds[i + 1],
    fromType: allNodeTypes[i],
    toType: allNodeTypes[i + 1],
    isVisible: isVisible,
    fromHasLocation: fromHasLocation,
    toHasLocation: toHasLocation
  });

  // Map visual segment index to logical hop index for visible segments
  if (isVisible) {
    visibleSegmentToHopIndex.set(visibleSegmentIndex, i);
    visibleSegmentIndex++;
  }
}
```

---

## 4. Opening Circuit Side Panel

**File**: `geolocate.component.ts` (lines 2995-3016)

```typescript
this.openSidePanel('circuit', {
  circuit: circuit,
  segment: {
    index: 0,
    total: pathData.circuitHops.length,
    from: pathData.circuitHops[0].from,
    to: pathData.circuitHops[0].to,
    fromId: pathData.circuitHops[0].fromId,
    toId: pathData.circuitHops[0].toId,
    fromType: pathData.circuitHops[0].fromType,
    toType: pathData.circuitHops[0].toType,
    isVisible: pathData.circuitHops[0].isVisible
  },
  pathNodes: pathData.pathNodes,
  pathCoordinates: pathData.pathCoordinates,
  routerNames: pathData.routerNames,
  entityIds: pathData.entityIds,
  entityTypes: pathData.entityTypes,
  circuitHops: pathData.circuitHops,
  circuitRouters: pathData.circuitRouters,
  visibleSegmentToHopIndex: pathData.visibleSegmentToHopIndex
});
```

---

## 5. Circuit Hops Table Template

**File**: `components/circuit-hops-table/circuit-hops-table.component.html` (lines 17-64)

```html
<tr *ngFor="let hop of circuitHops; let i = index"
    (click)="hopSelected.emit({hop, index: i})"
    [class.selected-row]="selectedSegmentIndex === i"
    [class.hop-not-visible]="!hop.isVisible"
    [matTooltip]="!hop.isVisible ? 'This hop is not visible on the map due to missing geolocation data' : ''"
    [matTooltipDisabled]="hop.isVisible"
    class="clickable-circuit-row">
  <td class="hop-number">
    {{ i + 1 }}
    <span *ngIf="!hop.isVisible"
          class="visibility-badge"
          matTooltip="Not visible on map"
          matTooltipPosition="right">
      <span class="icon-eye-slash"></span>
    </span>
  </td>
  <td class="hop-from">
    <span *ngIf="hop.fromHasLocation"
          [class]="hop.fromType === 'identity' ? 'icon-identity' : 'icon-routers'"
          class="hop-entity-icon"></span>
    <span *ngIf="!hop.fromHasLocation"
          class="hop-entity-icon unlocated-icon"
          matTooltip="No geolocation data"
          matTooltipPosition="right">
      <img src="/assets/svgs/unknown-marker.svg" alt="No location" class="unlocated-marker-img">
    </span>
    <span class="hop-entity-name" [class.missing-location]="!hop.fromHasLocation">
      {{ hop.from }}
    </span>
  </td>
  <td class="hop-arrow">→</td>
  <td class="hop-to">
    <span *ngIf="hop.toHasLocation"
          [class]="hop.toType === 'identity' ? 'icon-identity' : 'icon-routers'"
          class="hop-entity-icon"></span>
    <span *ngIf="!hop.toHasLocation"
          class="hop-entity-icon unlocated-icon"
          matTooltip="No geolocation data"
          matTooltipPosition="right">
      <img src="/assets/svgs/unknown-marker.svg" alt="No location" class="unlocated-marker-img">
    </span>
    <span class="hop-entity-name" [class.missing-location]="!hop.toHasLocation">
      {{ hop.to }}
    </span>
  </td>
</tr>
```

---

## 6. Circuit Hops Table Component

**File**: `components/circuit-hops-table/circuit-hops-table.component.ts`

```typescript
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CircuitHop } from '../../services/circuit-path-builder.service';

@Component({
  selector: 'lib-circuit-hops-table',
  templateUrl: './circuit-hops-table.component.html',
  styleUrls: ['./circuit-hops-table.component.scss']
})
export class CircuitHopsTableComponent implements OnChanges {
  @Input() circuitHops: CircuitHop[] = [];
  @Input() selectedSegmentIndex: number | null = null;

  @Output() hopSelected = new EventEmitter<{hop: CircuitHop, index: number}>();

  ngOnChanges(changes: SimpleChanges): void {
    // Component updates when circuitHops input changes
  }
}
```

---

## 7. Link Object Structure (from mock-data/links.json)

```json
{
  "id": "L1L6gNhMjY2Z93h0HfjxXV",
  "sourceRouter": {
    "id": "UHAGL4duxr",
    "name": "tokyo-router-11",
    "entity": "routers"
  },
  "destRouter": {
    "id": "mgqtrE5PVH",
    "name": "london-router-7",
    "entity": "routers"
  },
  "sourceLatency": 219783019,
  "destLatency": 220639076,
  "state": "Connected",
  "down": false,
  "cost": 109,
  "staticCost": 1,
  "protocol": "tls",
  "iteration": 2,
  "connections": [
    {
      "source": "tcp:21.242.195.80:24827",
      "dest": "tcp:126.69.68.76:40885",
      "type": "ack"
    }
  ]
}
```

---

## 8. Link Latency Processing (map-rendering.service.ts)

**File**: `services/map-rendering.service.ts` (lines 72-100)

```typescript
// Determine line color based on link state and latency
let lineColor = '#4A90E2'; // default blue
let lineOpacity = 0.6;

if (link.down) {
  lineColor = '#E74C3C'; // red for down links
  lineOpacity = 0.8;
} else if (link.state === 'Connected') {
  // Check latency thresholds (latency values are in nanoseconds)
  // Use the higher of source/dest latency
  const latencyNs = Math.max(link.sourceLatency || 0, link.destLatency || 0);
  const latencyMs = latencyNs / 1000000; // Convert nanoseconds to milliseconds

  // Define latency thresholds based on industry standards for network infrastructure:
  // - Under 50ms: Excellent/normal latency for network links
  // - 50-100ms: Acceptable but elevated, becomes noticeable in real-time applications
  // - Over 100ms: Poor/problematic, significantly impacts user experience
  const GOOD_LATENCY = 50;  // Green: under 50ms (excellent/normal)
  const ACCEPTABLE_LATENCY = 100;  // Yellow: 50-100ms (elevated/noticeable)
  // Red: over 100ms (poor/problematic)

  if (latencyMs < GOOD_LATENCY) {
    lineColor = '#2ECC71'; // green for excellent latency
    lineOpacity = 0.7;
  } else if (latencyMs < ACCEPTABLE_LATENCY) {
    lineColor = '#F39C12'; // yellow for elevated latency
    lineOpacity = 0.75;
  } else {
    lineColor = '#E74C3C'; // red for problematic latency
    lineOpacity = 0.9;
  }
}
```

---

## 9. Drawing Circuit Segments (map-rendering.service.ts)

**File**: `services/map-rendering.service.ts` (lines 398-426)

```typescript
hitboxLine.on('click', () => {
  // Map visual segment index to logical hop index
  const logicalHopIndex = visibleSegmentToHopIndex.get(i) ?? i;
  const hop = circuitPathData.circuitHops[logicalHopIndex];

  this.circuitSegmentClicked.emit({
    circuit: circuit,
    segment: {
      index: logicalHopIndex,  // Use logical hop index for correct selection
      total: circuitPathData.circuitHops.length,
      from: hop?.from || routerNames[i],
      to: hop?.to || routerNames[i + 1],
      fromId: hop?.fromId || entityIds[i],
      toId: hop?.toId || entityIds[i + 1],
      fromType: hop?.fromType || entityTypes[i],
      toType: hop?.toType || entityTypes[i + 1],
      isVisible: hop?.isVisible ?? true,
      fromHasLocation: hop?.fromHasLocation ?? true,
      toHasLocation: hop?.toHasLocation ?? true
    },
    pathNodes: circuitPathData.pathNodes,
    pathCoordinates: pathCoordinates,
    routerNames: routerNames,
    entityIds: entityIds,
    entityTypes: entityTypes,
    circuitHops: circuitPathData.circuitHops,
    visibleSegmentToHopIndex: visibleSegmentToHopIndex
  });
});
```

---

## 10. Entity List Panel Circuit Display

**File**: `components/entity-list-panel/entity-list-panel.component.ts` (lines 216-282)

```typescript
/**
 * Update service groups - group circuits by service and apply filtering
 */
updateServiceGroups(): void {
  let processed = [...this.previewCircuits];

  // Pre-compute client/host info for all circuits to avoid repeated computation in templates
  processed.forEach(circuit => {
    if (!circuit._clientInfo) {
      circuit._clientInfo = this.computeClientInfo(circuit);
    }
    if (!circuit._hostInfo) {
      circuit._hostInfo = this.computeHostInfo(circuit);
    }
  });

  // Filter duplicates if enabled
  if (this.hideOlderCircuits && processed.length > 0) {
    const grouped = new Map<string, any[]>();

    processed.forEach(circuit => {
      const clientId = circuit.tags?.clientId || circuit.clientId || 'unknown';
      const hostId = circuit.tags?.hostId || circuit.hostId || 'unknown';
      const serviceId = circuit.service?.id || circuit.serviceId || 'unknown';
      const key = `${serviceId}-${clientId}-${hostId}`;

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(circuit);
    });

    // Keep only the most recent circuit per group
    processed = [];
    grouped.forEach(circuits => {
      const sorted = circuits.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      processed.push(sorted[0]);
    });
  }

  // Group circuits by service
  const serviceMap = new Map<string, ServiceGroup>();

  processed.forEach(circuit => {
    const serviceId = circuit.service?.id || 'unknown';
    const serviceName = circuit.service?.name || 'Unknown Service';

    if (!serviceMap.has(serviceId)) {
      serviceMap.set(serviceId, {
        serviceName,
        serviceId,
        circuits: [],
        expanded: false
      });
    }

    serviceMap.get(serviceId)!.circuits.push(circuit);
  });

  // Convert to array and sort by service name
  this.serviceGroups = Array.from(serviceMap.values()).sort((a, b) =>
    a.serviceName.localeCompare(b.serviceName)
  );
}
```

---

## Summary

- **CircuitHop**: Used to display circuit path segments in table (topology only, no latency)
- **CircuitPathData**: Complete structure returned by CircuitPathBuilderService
- **Link**: Where latency is actually stored (sourceLatency, destLatency in nanoseconds)
- **Conversion**: `ms = ns / 1000000`
- **Latency Display**: Currently on router-to-router links (map rendering), not on circuit hops

