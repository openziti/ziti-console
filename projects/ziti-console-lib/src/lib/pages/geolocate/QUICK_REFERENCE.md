# Circuit & Latency Quick Reference

## Quick Answer: Where is Latency Data?

**Latency is NOT in Circuits or Circuit Hops.**

Latency is in **Link objects** (router-to-router connections):
```typescript
link.sourceLatency  // nanoseconds
link.destLatency    // nanoseconds
```

Convert: `latencyMs = latencyNs / 1000000`

---

## File Locations

```
/geolocate/
├── geolocate.component.ts                              # Main orchestrator
├── components/
│   ├── circuit-panel/
│   │   ├── circuit-panel.component.ts                  # Displays circuit details
│   │   ├── circuit-panel.component.html                # Template
│   │   └── circuit-panel.component.scss
│   ├── circuit-hops-table/
│   │   ├── circuit-hops-table.component.ts             # Displays hops table
│   │   ├── circuit-hops-table.component.html           # Template
│   │   └── circuit-hops-table.component.scss
│   ├── router-path-table/                              # Displays router sequence
│   └── side-panel-container/                           # Side panel wrapper
│
├── services/
│   ├── circuit-path-builder.service.ts                 # Builds CircuitPathData
│   ├── circuit-calculation.service.ts                  # Circuit analysis
│   ├── circuit-filter.service.ts                       # Circuit filtering
│   ├── map-rendering.service.ts                        # Renders circuits & links
│   ├── map-marker.service.ts                           # Manages markers
│   ├── map-state.service.ts                            # Centralized state
│   ├── map-data.service.ts                             # Data fetching
│   └── geolocation.service.ts                          # Geolocation updates
│
└── assets/mock-data/
    ├── circuits.json                                   # Mock circuits (NO latency)
    ├── links.json                                      # Mock links (HAS latency!)
    └── ...
```

---

## Key Interfaces

### CircuitHop (from circuit-path-builder.service.ts)
```typescript
interface CircuitHop {
  from: string;
  fromType: 'identity' | 'routers';
  fromId: string;
  fromHasLocation: boolean;
  to: string;
  toType: 'identity' | 'routers';
  toId: string;
  toHasLocation: boolean;
  isVisible: boolean;
  // NO LATENCY FIELD
}
```

### Link (from links.json)
```typescript
interface Link {
  id: string;
  sourceRouter: {id, name};
  destRouter: {id, name};
  sourceLatency: number;      // NANOSECONDS
  destLatency: number;        // NANOSECONDS
  state: 'Connected';
  down: boolean;
}
```

---

## Data Flow Diagram

```
circuits.json
    ↓
MapDataService.fetchCircuits()
    ↓
[Circuit objects - NO latency]
    ↓
CircuitPathBuilderService.buildCircuitPathData(circuit)
    ↓
CircuitPathData {
  circuitHops: [CircuitHop],    // Shows topology, NO latency
  circuitRouters: [Router]      // Router details
}
    ↓
openSidePanel('circuit', data)
    ↓
circuit-panel.component receives data
    ↓
circuit-hops-table displays hops (no latency shown)
```

## To Display Latency on Circuit Hops:

1. In `circuit-path-builder.service.ts`:
   - Add `latencyMs?: number` to `CircuitHop` interface
   - Pass `links` array to `buildCircuitPathData()`
   - For each hop, find matching link by router IDs
   - Extract latency and add to hop object

2. In `circuit-hops-table.component.html`:
   ```html
   <td>{{ hop.latencyMs?.toFixed(2) }} ms</td>
   ```

3. In `circuit-panel.component.ts`:
   - Pass `links` to component input
   - Calculate total/max latency for circuit

---

## Latency Thresholds (for rendering links)

From `map-rendering.service.ts`:
- **GREEN** (< 50ms): Normal/excellent latency
- **YELLOW** (50-100ms): Elevated/noticeable latency
- **RED** (> 100ms): Poor/problematic latency

---

## Important Notes

1. **Circuits don't have latency** - only links do
2. **Links are router-to-router** - not client-to-host
3. **Links latency is in nanoseconds** - divide by 1,000,000 for milliseconds
4. **circuit.path.links** - are REFERENCES to link objects, not full data
5. **circuitHops** - are LOGICAL hops (client → routers → host), not physical links
6. **To match**: Use router IDs from circuit.path.nodes to find links

---

## Example: Adding Latency to Hops

```typescript
// In circuit-path-builder.service.ts buildCircuitPathData()

// Find link between two routers
const findLinkBetween = (fromId: string, toId: string, links: any[]) => {
  return links.find(l => 
    (l.sourceRouter.id === fromId && l.destRouter.id === toId) ||
    (l.sourceRouter.id === toId && l.destRouter.id === fromId)
  );
};

// In the hop building loop:
for (let i = 0; i < allNodeIds.length - 1; i++) {
  const link = findLinkBetween(allNodeIds[i], allNodeIds[i+1], links);
  const latencyMs = link ? Math.max(link.sourceLatency, link.destLatency) / 1000000 : undefined;
  
  circuitHops.push({
    from: allNodeNames[i],
    to: allNodeNames[i + 1],
    fromId: allNodeIds[i],
    toId: allNodeIds[i + 1],
    fromType: allNodeTypes[i],
    toType: allNodeTypes[i + 1],
    isVisible: allNodeHasLocation[i] && allNodeHasLocation[i + 1],
    fromHasLocation: allNodeHasLocation[i],
    toHasLocation: allNodeHasLocation[i + 1],
    latencyMs  // NEW FIELD
  });
}
```

