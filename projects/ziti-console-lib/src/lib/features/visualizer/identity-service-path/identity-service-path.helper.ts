import { Inject, Injectable } from '@angular/core';
import _ from 'lodash';

// statusReason explains WHY a link is in a broken (status === 2) state so the renderer
// can show router-reported issues differently from tunneler-side connectivity problems.
type LinkStatusReason = 'router-down' | 'tunneler-unreachable' | 'misconfigured' | null;

interface LinkState {
    state: number; // 1 = active, -1/0 = available/offline, 2 = broken
    reason: LinkStatusReason;
}

class Link {
    source;
    sourceName;
    target;
    targetName;
    weight;
    status;
    statusReason: LinkStatusReason = null;
    linkType: 'active-circuit' | 'fabric-link' | 'inferred' | 'endpoint-connection' = 'inferred';
}

class Node {
    id;
    name;
    provider;
    group;
    posx;
    posy;
    status;
    online;
    apiSession;
    routerConnection;
    tunnelerEnabled;
    os;
    mfaEnabled;
    type;
    usage;
    routerType?: 'edge-router' | 'transit-router';
    // brokenCause drives the broken node iconography; connectivity is the human-readable
    // line shown in the hover tooltip. Both are null/empty when the node is healthy.
    brokenCause?: LinkStatusReason;
    connectivity?: string;
    connState?: 'online' | 'offline' | 'unknown' | 'unenrolled';
}

class ServiceHostNode {
    id;
    name;
    group;
    posx;
    posy;
    interceptIps;
    interceptPorts;
    interceptProtocols;
    forwardedHost;
    hostNames;
    forwardedPort;
    hostPorts;
    forwardedProtocol;
    hostProtocols;
    status;
    type;
    usage;
    intercept = [];
    configAddress;
    configPorts;
}

export class ServiceData {
    id;
    name;
}

@Injectable({
    providedIn: 'root',
})
export class IdentityServicePathHelper {
    posy_for_group3 = 0;

    constructor(
    ) {}

    public getEndpointGraphObj(
        endpoint,
        bindIdnetities,
        edgerouters,
        selectedServiceOb,
        serviceConfigs,
        filterText = '',
        // New fabric topology parameters
        hostEdgeRouters: any[] = [],
        fabricRouters: any[] = [],
        routerTypesMap: Map<string, string> = new Map(),
        fabricLinks: any[] = [],
        serviceCircuits: any[] = [],
        serviceTerminators: any[] = [],
        fabricApiAvailable = false,
        availableWidth = 900
    ) {
        const rootOb = new RootJson();

        // If fabric API is not available, use the legacy layout
        if (!fabricApiAvailable) {
            return this.buildLegacyGraph(
                endpoint, bindIdnetities, edgerouters,
                selectedServiceOb, serviceConfigs
            );
        }

        // === GROUP 1: Dialing Identity ===
        let endpointNodeOb = null;
        const bindNode = bindIdnetities.find((nd) => nd.id === endpoint.id);
        if (!bindNode) {
            endpointNodeOb = createEndpoint(endpoint);
            endpointNodeOb.group = '1';
            endpointNodeOb.posx = 50;
            endpointNodeOb.posy = 200;
            rootOb.addNode(endpointNodeOb);
        }

        // === GROUP 2d: Dial-side Edge Routers ===
        const dialEdgeRouterIds = new Set<string>();
        const group2dNodes = [];
        _.isArray(edgerouters) && edgerouters.forEach((nd) => {
            const nodeOb = createERNode(nd);
            nodeOb.group = '2d';
            nodeOb.routerType = 'edge-router';
            dialEdgeRouterIds.add(nd.id);
            group2dNodes.push(nodeOb);
            rootOb.addNode(nodeOb);
        });

        // === GROUP 2h: Host-side Edge Routers ===
        const hostEdgeRouterIds = new Set<string>();
        const group2hNodes = [];
        _.isArray(hostEdgeRouters) && hostEdgeRouters.forEach((nd) => {
            if (dialEdgeRouterIds.has(nd.id)) {
                // Router is on both sides — keep it in the public column
                // but track it as host-side too for link creation
                hostEdgeRouterIds.add(nd.id);
                return;
            }
            const nodeOb = createERNode(nd);
            nodeOb.group = '2h';
            nodeOb.routerType = 'edge-router';
            hostEdgeRouterIds.add(nd.id);
            group2hNodes.push(nodeOb);
            rootOb.addNode(nodeOb);
        });

        // Also check terminators for host-side routers not yet captured
        serviceTerminators.forEach((term) => {
            const routerId = term.routerId || term.router?.id;
            if (routerId && !dialEdgeRouterIds.has(routerId) && !hostEdgeRouterIds.has(routerId)) {
                const fabricRouter = fabricRouters.find(r => r.id === routerId);
                if (fabricRouter) {
                    const rType = routerTypesMap.get(routerId) || 'edge-router';
                    if (rType === 'edge-router') {
                        const nodeOb = createFabricRouterNode(fabricRouter, rType);
                        nodeOb.group = '2h';
                        hostEdgeRouterIds.add(routerId);
                        group2hNodes.push(nodeOb);
                        rootOb.addNode(nodeOb);
                    }
                }
            }
        });

        // Transit routers excluded for now — can be added in a future iteration
        const group2tNodes = [];

        // === GROUP 4: Service Node ===
        const group4Nodes = [];
        const srNode = new ServiceHostNode();
        srNode.id = selectedServiceOb.id;
        srNode.name = selectedServiceOb.name;
        srNode.intercept = serviceConfigAlias(serviceConfigs);
        buildServiceDetails(srNode, selectedServiceOb, serviceConfigs);
        srNode.type = 'Config Service';
        srNode.group = '4';
        srNode.status = '1';
        group4Nodes.push(srNode);
        rootOb.addNode(srNode);

        // === GROUP 3: Hosting Identities ===
        const group3Ids = [];
        _.isArray(bindIdnetities) && bindIdnetities.forEach((ePoint) => {
            if (group3Ids.indexOf(ePoint.id) < 0) {
                group3Ids.push(ePoint.id);
            }
        });

        const group3Nodes = [];
        group3Ids.forEach((nid) => {
            // Skip if this identity is already in the graph as a router
            if (dialEdgeRouterIds.has(nid) || hostEdgeRouterIds.has(nid)) {
                return;
            }
            const grp3Node = findEndpoint(nid, bindIdnetities);
            if (grp3Node) {
                grp3Node.group = '3';
                group3Nodes.push(grp3Node);
                rootOb.addNode(grp3Node);
            }
        });

        // === POSITIONING ===
        // Dynamically distribute 5 columns across available width
        // Build column list dynamically — only include groups that have nodes
        const columnDefs = [
            { groups: ['1'], nodes: endpointNodeOb ? [endpointNodeOb] : [] },
            { groups: ['2d', '2dh'], nodes: group2dNodes },
            { groups: ['2h'], nodes: group2hNodes },
            { groups: ['3'], nodes: group3Nodes },
            { groups: ['4'], nodes: group4Nodes },
        ];
        const activeColumns = columnDefs.filter(col => col.nodes.length > 0);

        const padding = 100;
        const usableWidth = availableWidth - (padding * 2);
        const gaps = Math.max(activeColumns.length - 1, 1);
        const colSpacing = usableWidth / gaps;

        // Assign X positions to active columns
        const POS_X: Record<string, number> = {};
        activeColumns.forEach((col, i) => {
            const x = padding + colSpacing * i;
            col.groups.forEach(g => { POS_X[g] = x; });
        });
        // Fallback for groups that might not be in active columns
        if (!POS_X['2t']) POS_X['2t'] = POS_X['2h'] || POS_X['2d'] || padding;
        if (!POS_X['2dh']) POS_X['2dh'] = POS_X['2d'] || padding;
        if (!POS_X['2h']) POS_X['2h'] = POS_X['2d'] || padding;

        // Compute available height based on the tallest group
        const allGroups = activeColumns.map(col => ({ nodes: col.nodes, x: POS_X[col.groups[0]] }));
        const maxCount = Math.max(...allGroups.map(g => g.nodes.length));
        const MIN_Y = 55;
        const availableHeight = Math.max(350, maxCount * 70);

        // Position all groups with the same available height so they align
        allGroups.forEach((g) => {
            positionGroupNodes(g.nodes, g.x, availableHeight);
        });

        // Position shared routers (2dh) at center x
        rootOb.nodes.forEach((nd) => {
            if (nd.group === '2dh') {
                nd.posx = POS_X['2dh'];
            }
        });

        // === LINKS ===

        // Build set of active circuit hops for highlighting
        // Only include circuits for THIS specific identity
        const activeCircuitHops = new Set<string>();
        const endpointId = endpoint.id;
        serviceCircuits.forEach((circuit) => {
            const clientId = circuit.tags?.clientId || circuit.clientId || circuit.client?.id;
            if (clientId !== endpointId) return; // skip circuits for other identities

            const pathNodes = circuit.path?.nodes || circuit.path || [];
            const hostId = circuit.tags?.hostId || circuit.host?.id;

            // Client -> first router
            if (pathNodes.length > 0) {
                const firstRouterId = pathNodes[0]?.id || pathNodes[0];
                activeCircuitHops.add(hopKey(endpointId, firstRouterId));
            }

            // Router -> Router hops
            for (let i = 0; i < pathNodes.length - 1; i++) {
                const fromId = pathNodes[i]?.id || pathNodes[i];
                const toId = pathNodes[i + 1]?.id || pathNodes[i + 1];
                activeCircuitHops.add(hopKey(fromId, toId));
            }

            // Last router -> host identity
            if (pathNodes.length > 0 && hostId) {
                const lastRouterId = pathNodes[pathNodes.length - 1]?.id || pathNodes[pathNodes.length - 1];
                // If the last router IS the host (tunnel routers), mark router -> service as active
                if (lastRouterId === hostId) {
                    activeCircuitHops.add(hopKey(hostId, selectedServiceOb.id));
                } else {
                    activeCircuitHops.add(hopKey(lastRouterId, hostId));
                    activeCircuitHops.add(hopKey(hostId, selectedServiceOb.id));
                }
            }
        });

        // Per-host connectivity is derived from the identity's own controller-reported state
        // (hasEdgeRouterConnection / edgeRouterConnectionStatus -> routerConnection/apiSession),
        // NOT from terminators: real ziti terminators carry no hosting-identity id (identity:"",
        // no hostId), so a terminator can't be mapped back to the host that created it. Terminator
        // COUNT remains a service-level health hint only.

        // Annotate node connectivity so the renderer can pick a broken icon and the tooltip can
        // explain the cause. A hosting tunneler that is enrolled but unreachable, or expected to
        // host (Bind policy) yet has no terminator, is "broken".
        group3Nodes.forEach((node) => {
            if (node.status === 'Un-Registered') {
                node.brokenCause = 'misconfigured';
                node.connectivity = 'Not enrolled';
            } else if (node.apiSession === 'No' || node.routerConnection === 'No') {
                node.brokenCause = 'tunneler-unreachable';
                node.connectivity = 'Configured but not connected (offline or blocked)';
            } else {
                node.connectivity = 'Connected';
            }
        });
        if (endpointNodeOb && endpointNodeOb.status !== 'Un-Registered') {
            if (endpointNodeOb.apiSession === 'No' || endpointNodeOb.routerConnection === 'No') {
                endpointNodeOb.brokenCause = 'tunneler-unreachable';
                endpointNodeOb.connectivity = 'Configured but not connected (offline or blocked)';
            } else {
                endpointNodeOb.connectivity = 'Connected';
            }
        }

        // Build fabric link lookup
        const fabricLinkSet = new Set<string>();
        fabricLinks.forEach((link) => {
            const srcId = link.sourceRouter?.id || link.sourceRouterId || link.src?.id;
            const dstId = link.destRouter?.id || link.destRouterId || link.dst?.id;
            if (srcId && dstId) {
                fabricLinkSet.add(hopKey(srcId, dstId));
            }
        });

        // 1. Identity -> Dial-side Edge Routers (Group 1 -> 2d/2dh)
        if (endpointNodeOb !== null) {
            rootOb.nodes.forEach((nd) => {
                if (nd.group === '2d' || nd.group === '2dh') {
                    const lnk = new Link();
                    lnk.source = endpointNodeOb.id;
                    lnk.sourceName = endpointNodeOb.name;
                    lnk.target = nd.id;
                    lnk.targetName = nd.name;
                    applyLinkState(lnk, getEndpointToRouterLinkState(endpointNodeOb, nd));
                    lnk.linkType = activeCircuitHops.has(hopKey(endpointNodeOb.id, nd.id))
                        ? 'active-circuit' : 'endpoint-connection';
                    rootOb.addLink(lnk);
                }
            });
        }

        // 2. Router-to-Router links — only show links on actual circuit paths
        //    or shortest fabric-link paths between dial-side and host-side routers.
        const routerGroups = ['2d', '2dh', '2t', '2h'];
        const routerNodeMap = new Map<string, any>();
        rootOb.nodes.forEach(nd => {
            if (routerGroups.includes(nd.group)) {
                routerNodeMap.set(nd.id, nd);
            }
        });

        // Collect router-to-router hops that should be drawn
        const relevantHops = new Set<string>();
        let hasAnyFabricRouterLink = false;

        // a) Always include hops from active circuit paths
        serviceCircuits.forEach((circuit) => {
            const pathNodes = circuit.path?.nodes || circuit.path || [];
            for (let i = 0; i < pathNodes.length - 1; i++) {
                const fromId = pathNodes[i]?.id || pathNodes[i];
                const toId = pathNodes[i + 1]?.id || pathNodes[i + 1];
                if (routerNodeMap.has(fromId) && routerNodeMap.has(toId)) {
                    relevantHops.add(hopKey(fromId, toId));
                }
            }
        });

        // b) For potential paths: find shortest fabric-link paths from each
        //    dial-side router to each host-side router using BFS
        const dialSideIds = new Set([...dialEdgeRouterIds]);
        const hostSideIds = new Set([...hostEdgeRouterIds]);

        // Build adjacency list from fabric links (only among visible routers)
        const adjacency = new Map<string, Set<string>>();
        fabricLinks.forEach((link) => {
            const srcId = link.sourceRouter?.id || link.sourceRouterId || link.src?.id;
            const dstId = link.destRouter?.id || link.destRouterId || link.dst?.id;
            if (srcId && dstId && routerNodeMap.has(srcId) && routerNodeMap.has(dstId)) {
                if (!adjacency.has(srcId)) adjacency.set(srcId, new Set());
                if (!adjacency.has(dstId)) adjacency.set(dstId, new Set());
                adjacency.get(srcId).add(dstId);
                adjacency.get(dstId).add(srcId);
            }
        });

        // BFS from each dial-side router to find shortest path to any host-side router
        dialSideIds.forEach((startId) => {
            if (!adjacency.has(startId)) return;
            const visited = new Set<string>();
            const parent = new Map<string, string>();
            const queue: string[] = [startId];
            visited.add(startId);

            while (queue.length > 0) {
                const current = queue.shift();
                if (current !== startId && hostSideIds.has(current)) {
                    // Trace back the path and add all hops
                    let node = current;
                    while (parent.has(node)) {
                        const prev = parent.get(node);
                        relevantHops.add(hopKey(prev, node));
                        node = prev;
                    }
                    continue; // found one host-side target, keep searching for others
                }
                const neighbors = adjacency.get(current);
                if (neighbors) {
                    neighbors.forEach((neighbor) => {
                        if (!visited.has(neighbor)) {
                            visited.add(neighbor);
                            parent.set(neighbor, current);
                            queue.push(neighbor);
                        }
                    });
                }
            }
        });

        // Now create links only for relevant hops
        relevantHops.forEach((key) => {
            const [id1, id2] = key.split('::');
            const r1 = routerNodeMap.get(id1);
            const r2 = routerNodeMap.get(id2);
            if (!r1 || !r2) return;

            // Skip links between routers on the same side
            if (r1.group === r2.group) return;
            const hostGroups = ['2h', '2dh'];
            if (hostGroups.includes(r1.group) && hostGroups.includes(r2.group)) return;
            const dialGroups = ['2d', '2dh'];
            if (dialGroups.includes(r1.group) && dialGroups.includes(r2.group)) return;

            hasAnyFabricRouterLink = true;
            const isActiveCircuit = activeCircuitHops.has(key);
            const lnk = new Link();
            lnk.source = r1.id;
            lnk.sourceName = r1.name;
            lnk.target = r2.id;
            lnk.targetName = r2.name;
            lnk.linkType = isActiveCircuit ? 'active-circuit' : 'fabric-link';
            const r1Up = r1.online === 'Yes' || r1.status === 'PROVISIONED';
            const r2Up = r2.online === 'Yes' || r2.status === 'PROVISIONED';
            if (isActiveCircuit) {
                applyLinkState(lnk, { state: 1, reason: null });
            } else if (!r1Up || !r2Up) {
                applyLinkState(lnk, { state: 2, reason: 'router-down' });
            } else {
                applyLinkState(lnk, { state: 1, reason: null });
            }
            rootOb.addLink(lnk);
        });

        // If no fabric links connect dial to host side, add inferred connections
        if (!hasAnyFabricRouterLink && group2dNodes.length > 0 && (group2hNodes.length > 0 || group3Nodes.length > 0)) {
            const targetNodes = group2hNodes.length > 0 ? group2hNodes : group3Nodes;
            group2dNodes.forEach((dialRouter) => {
                targetNodes.forEach((targetNode) => {
                    const lnk = new Link();
                    lnk.source = dialRouter.id;
                    lnk.sourceName = dialRouter.name;
                    lnk.target = targetNode.id;
                    lnk.targetName = targetNode.name;
                    lnk.linkType = 'inferred';
                    lnk.status = -1;
                    lnk.weight = 5;
                    rootOb.addLink(lnk);
                });
            });
        }

        // 3. Host-side Edge Routers -> Hosting Identities (Group 2h/2dh -> 3)
        // Use terminators to map which router connects to which hosting identity
        const terminatorRouterToHost = new Map<string, Set<string>>();
        serviceTerminators.forEach((term) => {
            const routerId = term.routerId || term.router?.id;
            const hostId = (term.hostId && term.hostId.trim()) ||
                (term.identity && typeof term.identity === 'string' && term.identity.trim()) ||
                term.identity?.id || term.identityId;
            if (routerId && hostId) {
                if (!terminatorRouterToHost.has(routerId)) {
                    terminatorRouterToHost.set(routerId, new Set());
                }
                terminatorRouterToHost.get(routerId).add(hostId);
            }
        });

        const hostRouterNodes = rootOb.nodes.filter(nd =>
            nd.group === '2h' || nd.group === '2dh' || (nd.group === '2d' && hostEdgeRouterIds.has(nd.id))
        );
        if (hostRouterNodes.length > 0 && group3Nodes.length > 0) {
            let hasTerminatorLink = false;
            hostRouterNodes.forEach((routerNode) => {
                const hostIds = terminatorRouterToHost.get(routerNode.id);
                if (hostIds) {
                    group3Nodes.forEach((hostNode) => {
                        if (hostIds.has(hostNode.id)) {
                            hasTerminatorLink = true;
                            const lnk = new Link();
                            lnk.source = routerNode.id;
                            lnk.sourceName = routerNode.name;
                            lnk.target = hostNode.id;
                            lnk.targetName = hostNode.name;
                            applyLinkState(lnk, getEndpointToRouterLinkState(hostNode, routerNode));
                            lnk.linkType = activeCircuitHops.has(hopKey(routerNode.id, hostNode.id))
                                ? 'active-circuit' : 'endpoint-connection';
                            rootOb.addLink(lnk);
                        }
                    });
                }
            });

            // If no terminator-based links, add inferred connections using actual status
            if (!hasTerminatorLink) {
                hostRouterNodes.forEach((routerNode) => {
                    group3Nodes.forEach((hostNode) => {
                        const lnk = new Link();
                        lnk.source = routerNode.id;
                        lnk.sourceName = routerNode.name;
                        lnk.target = hostNode.id;
                        lnk.targetName = hostNode.name;
                        applyLinkState(lnk, getEndpointToRouterLinkState(hostNode, routerNode));
                        lnk.linkType = activeCircuitHops.has(hopKey(routerNode.id, hostNode.id))
                            ? 'active-circuit'
                            : (lnk.status === 1 ? 'endpoint-connection' : 'inferred');
                        rootOb.addLink(lnk);
                    });
                });
            }
        } else if (group3Nodes.length > 0) {
            // No host-side routers at all — connect dial routers directly to hosting identities (inferred)
            const dialRouterNodes = rootOb.nodes.filter(nd => nd.group === '2d' || nd.group === '2dh');
            dialRouterNodes.forEach((dialRouter) => {
                group3Nodes.forEach((hostNode) => {
                    // Only add if no link already exists between them
                    const exists = rootOb.links.find(l =>
                        (l.source === dialRouter.id && l.target === hostNode.id) ||
                        (l.source === hostNode.id && l.target === dialRouter.id)
                    );
                    if (!exists) {
                        const lnk = new Link();
                        lnk.source = dialRouter.id;
                        lnk.sourceName = dialRouter.name;
                        lnk.target = hostNode.id;
                        lnk.targetName = hostNode.name;
                        applyLinkState(lnk, getEndpointToRouterLinkState(hostNode, dialRouter));
                        lnk.linkType = lnk.status === 1 ? 'endpoint-connection' : 'inferred';
                        rootOb.addLink(lnk);
                    }
                });
            });
        }

        // 4. Hosting Identities/Routers -> Service (Group 3 or host routers -> 4)
        // Collect all nodes that host this service (either group 3 identities or routers that are also hosts)
        const hostingNodes = [...group3Nodes];
        // Add routers that are also hosting identities (tunnel routers)
        bindIdnetities.forEach((bi) => {
            if (dialEdgeRouterIds.has(bi.id) || hostEdgeRouterIds.has(bi.id)) {
                const routerNode = rootOb.nodes.find(n => n.id === bi.id);
                if (routerNode && !hostingNodes.find(h => h.id === bi.id)) {
                    hostingNodes.push(routerNode);
                }
            }
        });

        group4Nodes.forEach((serviceNode) => {
            hostingNodes.forEach((hostNode) => {
                const lnk = new Link();
                lnk.source = hostNode.id;
                lnk.sourceName = hostNode.name;
                lnk.target = serviceNode.id;
                lnk.targetName = serviceNode.name;
                lnk.weight = 1;
                applyLinkState(lnk, getServiceToEndpointLinkState(hostNode, serviceNode));
                lnk.linkType = activeCircuitHops.has(hopKey(hostNode.id, serviceNode.id))
                    ? 'active-circuit' : 'endpoint-connection';
                rootOb.addLink(lnk);
            });
        });

        // Final cleanup: remove any links between nodes on the same side
        const nodeGroupMap = new Map<string, string>();
        rootOb.nodes.forEach(nd => nodeGroupMap.set(nd.id, nd.group));
        const hostSide = new Set(['2h', '2dh']);
        const dialSide = new Set(['2d', '2dh']);
        rootOb.links = rootOb.links.filter((lnk) => {
            const srcGroup = nodeGroupMap.get(lnk.source) || '';
            const tgtGroup = nodeGroupMap.get(lnk.target) || '';
            if (hostSide.has(srcGroup) && hostSide.has(tgtGroup)) return false;
            if (dialSide.has(srcGroup) && dialSide.has(tgtGroup)) return false;
            return true;
        });

        // Collapse parallel links between the same node pair. A router that is on BOTH the dial
        // and host side can otherwise produce two links to the same node — e.g. an 'available'
        // inferred link and a 'router-down' link — which overlap and render as mixed dashed/dotted.
        // Keep the single most-significant link per pair.
        const linkSeverity = (l) => {
            if (l.linkType === 'active-circuit') return 4; // live traffic wins
            if (l.status === 2) return 3;                  // broken (router-down / tunneler-unreachable)
            if (l.status === 1) return 2;                  // connected
            return 1;                                      // available / inferred
        };
        const bestLinkByPair = new Map<string, any>();
        rootOb.links.forEach((lnk) => {
            const key = [lnk.source, lnk.target].sort().join('::');
            const existing = bestLinkByPair.get(key);
            if (!existing || linkSeverity(lnk) > linkSeverity(existing)) {
                bestLinkByPair.set(key, lnk);
            }
        });
        rootOb.links = Array.from(bestLinkByPair.values());

        return rootOb;
    }

    /**
     * Fallback: builds the graph using the original policy-derived approach
     * when fabric API data is not available.
     */
    private buildLegacyGraph(endpoint, bindIdnetities, edgerouters, selectedServiceOb, serviceConfigs) {
        let endpointNodeOb = null;
        const rootOb = new RootJson();
        const bindNode = bindIdnetities.find((nd) => nd.id === endpoint.id);
        if (!bindNode) {
            endpointNodeOb = createEndpoint(endpoint);
            endpointNodeOb.group = '1';
            endpointNodeOb.posx = 50;
            endpointNodeOb.posy = 200;
            rootOb.addNode(endpointNodeOb);
        }
        let publicRouterNodes = [];
        let posy = 0;
        _.isArray(edgerouters) && edgerouters.forEach((nd) => {
            const nodeOb = createERNode(nd);
            nodeOb.group = '2a';
            nodeOb.posx = 250;
            posy = posy + 100;
            nodeOb.posy = posy;
            publicRouterNodes.push(nodeOb);
            rootOb.addNode(nodeOb);
        });

        const posx_for_group3 = 550;
        this.posy_for_group3 = 0;
        const group3Ids = [];
        let posy_for_group4 = 150;
        const group4Nodes = [];
        const srNode = new ServiceHostNode();
        srNode.id = selectedServiceOb.id;
        srNode.name = selectedServiceOb.name;
        srNode.intercept = serviceConfigAlias(serviceConfigs);
        buildServiceDetails(srNode, selectedServiceOb, serviceConfigs);
        srNode.type = 'Config Service';
        srNode.group = '4';
        srNode.status = '1';
        group4Nodes.push(srNode);
        rootOb.addNode(srNode);
        _.isArray(bindIdnetities) && bindIdnetities.forEach((ePoint) => {
            if (group3Ids.indexOf(ePoint.id) < 0) {
                group3Ids.push(ePoint.id);
            }
        });

        this.posy_for_group3 = 165;
        let grp3Yincrement = 100;

        const group3Nodes = [];
        let countgrp3 = 0;
        group3Ids.find((nid) => {
            const grp3Node = findEndpoint(nid, bindIdnetities);
            if (grp3Node) {
                grp3Node.group = '3';
                grp3Node.posx = posx_for_group3;
                grp3Node.posy = this.posy_for_group3;
                this.posy_for_group3 = this.posy_for_group3 + 125;
                group3Nodes.push(grp3Node);
                countgrp3++;
                rootOb.addNode(grp3Node);
            }
        });

        grp3Yincrement = countgrp3 > 2 ? 75 : 100;
        if (countgrp3 === 1) {
            this.posy_for_group3 = 160;
        } else if (countgrp3 === 2) {
            this.posy_for_group3 = 120;
        } else if (countgrp3 >= 5) {
            this.posy_for_group3 = 50;
            grp3Yincrement = 75;
        } else {
            this.posy_for_group3 = 73;
        }

        if (group3Nodes) {
            group3Nodes.find((node3) => {
                if (node3.group === '3') {
                    node3.posy = this.posy_for_group3;
                    this.posy_for_group3 = this.posy_for_group3 + grp3Yincrement;
                }
            });
        }

        if (group4Nodes && group4Nodes.length === 1) {
            posy_for_group4 = 200;
        }

        group4Nodes.find((nd4) => {
            nd4.posx = posx_for_group3 + 175;
            nd4.posy = posy_for_group4;
            posy_for_group4 = posy_for_group4 + 100;
        });

        let countPublicNodes = 0;
        rootOb.nodes.find((pNode) => {
            if (pNode.group.includes('2')) {
                countPublicNodes = countPublicNodes + 1;
            }
        });

        publicRouterNodes = [];
        let posy_group2 = 100;
        let yIncrement = 0;
        if (countPublicNodes === 1) {
            posy_group2 = 200;
        } else if (countPublicNodes >= 2 && countPublicNodes < 5) {
            posy_group2 = 60;
            yIncrement = 80;
        } else if (countPublicNodes >= 5 && countPublicNodes < 10) {
            posy_group2 = 40;
            yIncrement = 50;
        } else {
            posy_group2 = 40;
            yIncrement = 40;
        }

        rootOb.nodes.find((publicNode) => {
            if (publicNode.group.includes('2')) {
                publicNode.posx = 275;
                publicNode.posy = posy_group2;
                posy_group2 = posy_group2 + yIncrement;
                publicRouterNodes.push(publicNode);
                if (publicNode.group === '2b') {
                    group3Nodes.push(publicNode);
                }
            }
        });

        for (let k1 = 0; k1 < rootOb.nodes.length; k1++) {
            const nd = rootOb.nodes[k1];
            if (endpointNodeOb !== null && (nd.group === '2a' || nd.group === '2ab' || nd.group === '2ac')) {
                const lnk = new Link();
                lnk.source = endpointNodeOb.id;
                lnk.sourceName = endpointNodeOb.name;
                lnk.target = nd.id;
                lnk.targetName = nd.name;
                applyLinkState(lnk, getEndpointToRouterLinkState(endpointNodeOb, nd));
                lnk.linkType = 'endpoint-connection';
                rootOb.addLink(lnk);
            }
        }

        for (let k1 = 0; k1 < rootOb.nodes.length; k1++) {
            const nd1 = rootOb.nodes[k1];
            if (nd1.group.includes('2')) {
                for (let k2 = 0; k2 < group3Nodes.length; k2++) {
                    const nd2 = group3Nodes[k2];
                    if (nd2.group === '2b' || nd2.group === '2ab') {
                        continue;
                    }
                    const lnk = new Link();
                    lnk.source = nd1.id;
                    lnk.sourceName = nd1.name;
                    lnk.target = nd2.id;
                    lnk.targetName = nd2.name;
                    if (nd1.type.includes('Router') && nd2.type.includes('Router')) {
                        lnk.status =
                            nd1.status === 'PROVISIONED' &&
                            nd1.online === 'Yes' &&
                            nd2.status === 'PROVISIONED' &&
                            nd2.online === 'Yes'
                                ? 1 : 0;
                        lnk.statusReason = lnk.status === 1 ? null : 'router-down';
                    } else {
                        applyLinkState(lnk, getEndpointToRouterLinkState(nd2, nd1));
                    }
                    lnk.weight = getWeight(lnk.status);
                    lnk.linkType = 'inferred';
                    rootOb.addLink(lnk);
                }
            }
        }

        for (let k0 = 0; k0 < group4Nodes.length; k0++) {
            for (let k1 = 0; k1 < group3Nodes.length; k1++) {
                const lnk = new Link();
                lnk.source = group3Nodes[k1].id;
                lnk.sourceName = group3Nodes[k1].name;
                lnk.target = group4Nodes[k0].id;
                lnk.targetName = group4Nodes[k0].name;
                lnk.weight = 1;
                const foundNd = rootOb.nodes.find(function (rnd) {
                    return rnd.id === group3Nodes[k1].id;
                });
                if (foundNd.type.includes('Router')) {
                    lnk.status = foundNd.online === 'Yes' ? 1 : -1;
                } else {
                    applyLinkState(lnk, getServiceToEndpointLinkState(group3Nodes[k1], group4Nodes[k0]));
                }
                lnk.linkType = 'endpoint-connection';
                rootOb.addLink(lnk);
            }
        }

        return rootOb;
    }
}

// === Shared helper functions ===

function hopKey(id1: string, id2: string): string {
    return [id1, id2].sort().join('::');
}

function positionGroupNodes(nodes: any[], posx: number, availableHeight = 450) {
    const count = nodes.length;
    if (count === 0) return;

    const MIN_Y = 40;
    const MAX_Y = MIN_Y + availableHeight;

    if (count === 1) {
        nodes[0].posx = posx;
        nodes[0].posy = (MIN_Y + MAX_Y) / 2; // center vertically
        return;
    }

    const yIncrement = Math.min(90, (MAX_Y - MIN_Y) / (count - 1));
    // Center the group vertically within the available space
    const totalHeight = yIncrement * (count - 1);
    const posyStart = MIN_Y + ((availableHeight - totalHeight) / 2);

    nodes.forEach((nd, i) => {
        nd.posx = posx;
        nd.posy = posyStart + (i * yIncrement);
    });
}

function serviceConfigAlias(configs) {
    const intercept = [];
    _.isArray(configs) && configs.forEach((conf) => {
        let addresses = '';
        let ports = '';
        if (conf.data.addresses) {
            addresses = conf.data.addresses.toString();
        } else {
            addresses = conf.data.address;
        }
        if (_.isArray(conf.data.portRanges)) {
            conf.data.portRanges.forEach((portsJson) => {
                for (const key in portsJson) {
                    ports = ports + key + ':' + portsJson[key] + ' ';
                }
                ports = ports + ';';
            });
        } else {
            ports = conf.data.port;
        }
        intercept.push(addresses);
        intercept.push(ports);
    });
    return intercept;
}

// Annotates the service node with labeled, purpose-specific details so the hover card can explain
// what each address is for and surface the service's configuration. Handles services that are
// intercept+host, host-only, intercept-only, or SDK-defined (no address configs at all).
function buildServiceDetails(srNode, service, configs) {
    srNode.encryptionRequired = service ? service.encryptionRequired : undefined;
    srNode.terminatorStrategy = service ? service.terminatorStrategy : undefined;
    srNode.serviceRoleAttributes = _.isArray(service && service.roleAttributes) ? service.roleAttributes : [];
    srNode.permissions = _.isArray(service && service.permissions) ? service.permissions : [];

    const fmtPorts = (portRanges, port) => {
        if (_.isArray(portRanges)) {
            return portRanges.map((r) => (r.low === r.high ? `${r.low}` : `${r.low}-${r.high}`));
        }
        if (port !== undefined && port !== null) return [String(port)];
        return [];
    };
    const fmtEndpoint = (addrs, ports, protos) => {
        const a = (addrs || []).filter(Boolean).join(', ');
        const detail = [(protos || []).join('/'), (ports || []).join(',')].filter(Boolean).join('/');
        return detail ? `${a}  ${detail}` : a;
    };

    const types = [];
    _.isArray(configs) && configs.forEach((conf) => {
        const t = ((conf && conf.configType && conf.configType.name) || (conf && conf.type) || '').toString();
        const d = (conf && conf.data) || {};
        if (t) types.push(t);
        if (t.indexOf('intercept') === 0) {
            const addrs = d.addresses || (d.address ? [d.address] : []);
            srNode.interceptSummary = fmtEndpoint(addrs, fmtPorts(d.portRanges, d.port), d.protocols || (d.protocol ? [d.protocol] : []));
        } else if (t.indexOf('host') === 0) {
            const addrs = d.address ? [d.address] : (d.forwardAddress ? ['(forwarded)'] : []);
            srNode.hostSummary = fmtEndpoint(addrs, fmtPorts(d.allowedPortRanges, d.port), d.protocol ? [d.protocol] : (d.protocols || (d.forwardProtocol ? ['(forwarded)'] : [])));
        }
    });
    srNode.configTypeNames = types;
}

function findEndpoint(endpointId, endpoints) {
    if (endpointId === null) {
        return null;
    }
    const ePoint = endpoints.find(function (er) {
        return er.id === endpointId;
    });
    if (ePoint) {
        const node = createEndpoint(ePoint);
        node.type = 'Hosted Identity';
        return node;
    }
    return null;
}

function createEndpoint(ePoint) {
    const node = new Node();
    node.id = ePoint.id;
    node.name = ePoint.name;
    node.type = 'Identity';
    // Prefer the explicit booleans, which controllers populate reliably. Only fall back to the
    // edgeRouterConnectionStatus string when it actually carries a value — note its key can be
    // PRESENT-BUT-NULL, so `_.has` is not a safe guard (that bug made every identity look "Yes").
    if (ePoint.edgeRouterConnectionStatus != null) {
        node.routerConnection = ePoint.edgeRouterConnectionStatus === 'offline' ? 'No' : 'Yes';
        node.apiSession = node.routerConnection;
    } else {
        node.routerConnection = ePoint['hasEdgeRouterConnection'] === false ? 'No' : 'Yes';
        node.apiSession = ePoint['hasApiSession'] === false ? 'No' : 'Yes';
    }
    node.os = ePoint.envInfo ? ePoint.envInfo.os : '';
    node.mfaEnabled = ePoint.isMfaEnabled;
    // "Registered" means the identity has enrolled and run (it has reported env info). Guard on a
    // truthy os: the controller returns envInfo as an empty object {} for a created-but-never-
    // enrolled identity, and `{}.os !== null` is true — which previously mis-classed it Registered.
    node.status = (ePoint.envInfo && ePoint.envInfo.os) ? 'Registered' : 'Un-Registered';

    // Node status indicator. Mirrors the controller's edgeRouterConnectionStatus enum
    // (online | offline | unknown) when present, falling back to the hasEdgeRouterConnection
    // boolean otherwise. An identity that hasn't enrolled is "unenrolled" (its own state, not an
    // error). There is no "error" value in the API, so we don't synthesize one.
    if (node.status === 'Un-Registered') {
        node.connState = 'unenrolled';
    } else {
        const ers = ePoint.edgeRouterConnectionStatus;
        if (ers === 'online' || ers === 'offline' || ers === 'unknown') {
            node.connState = ers;
        } else {
            node.connState = (ePoint.hasEdgeRouterConnection === true || ePoint.hasApiSession === true)
                ? 'online' : 'offline';
        }
    }
    return node;
}

function createERNode(erouter) {
    const nodeOb = new Node();
    nodeOb.id = erouter.id;
    nodeOb.name = erouter.name;
    nodeOb.status = erouter.isVerified === true ? 'Registered' : 'Un-Registered';
    nodeOb.online = erouter.isOnline === false ? 'No' : 'Yes';
    nodeOb.tunnelerEnabled = erouter.isTunnelerEnabled === false ? 'No' : 'Yes';
    nodeOb.type = 'EdgeRouter';
    nodeOb.routerType = 'edge-router';
    return nodeOb;
}

function createFabricRouterNode(fabricRouter, routerType: 'edge-router' | 'transit-router') {
    const nodeOb = new Node();
    nodeOb.id = fabricRouter.id;
    nodeOb.name = fabricRouter.name;
    nodeOb.status = fabricRouter.connected ? 'PROVISIONED' : 'Un-Registered';
    nodeOb.online = fabricRouter.connected || fabricRouter.isOnline ? 'Yes' : 'No';
    nodeOb.tunnelerEnabled = fabricRouter.isTunnelerEnabled === false ? 'No' : 'Yes';
    nodeOb.type = routerType === 'transit-router' ? 'TransitRouter' : 'EdgeRouter';
    nodeOb.routerType = routerType;
    return nodeOb;
}

// Determines the state of an identity/tunneler <-> edge-router link.
// A router-reported problem (offline/errored router) is distinguished from a tunneler-side
// problem (enrolled identity that cannot establish a connection to the router, e.g. blocked
// by a firewall) so the visualizer can render the two causes differently.
function getEndpointToRouterLinkState(endpointNode, routerNode): LinkState {
    if (routerNode.status === 'ERROR' || routerNode.online === 'No') {
        return { state: 2, reason: 'router-down' }; // router-reported issue
    }
    if (endpointNode.status === 'Un-Registered') {
        // Never enrolled — the path through this identity can't carry traffic, so it's not
        // "available". Marked unavailable (the node still shows the specific "Not enrolled" cause).
        return { state: 2, reason: 'misconfigured' };
    }
    if (endpointNode.apiSession === 'No' || endpointNode.routerConnection === 'No') {
        // Enrolled but cannot reach the edge router — tunneler-side broken (was previously
        // shown as a benign "available" link, which is exactly what we're fixing).
        return { state: 2, reason: 'tunneler-unreachable' };
    }
    if (routerNode.online === 'Yes' && endpointNode.routerConnection === 'Yes') {
        return { state: 1, reason: null }; // active/available
    }
    return { state: -1, reason: null };
}

// Determines the state of a hosting identity/router <-> service link.
// hasTerminator is the authoritative signal that the host actually established its hosting
// connection: a Bind policy makes a host "expected", but only a terminator proves it connected.
function getServiceToEndpointLinkState(hostNode, serviceNode): LinkState {
    const isRouter = !!(hostNode.type && String(hostNode.type).includes('Router'));
    if (isRouter) {
        if (hostNode.status === 'ERROR' || hostNode.online === 'No') {
            return { state: 2, reason: 'router-down' };
        }
        return { state: 1, reason: null };
    }
    // Identity host (tunneler). Broken-detection uses the host's own connection state, since
    // terminators can't be attributed to a specific host (see note in getEndpointGraphObj).
    if (hostNode.status === 'Un-Registered') {
        return { state: 2, reason: 'misconfigured' }; // never enrolled
    }
    if (hostNode.apiSession === 'No' || hostNode.routerConnection === 'No') {
        return { state: 2, reason: 'tunneler-unreachable' }; // enrolled but unreachable (e.g. firewall)
    }
    if (hostNode.status === 'Registered' && hostNode.routerConnection === 'Yes') {
        return { state: 1, reason: null }; // active/available
    }
    return { state: -1, reason: null };
}

// Applies a computed LinkState to a link, including its derived weight.
function applyLinkState(lnk, ls: LinkState) {
    lnk.status = ls.state;
    lnk.statusReason = ls.reason;
    lnk.weight = getWeight(ls.state);
}

function getWeight(linkState) {
    return linkState === -1 ? 5 : 1;
}

class RootJson {
    nodes: any = [];
    links: any = [];
    addNode(newObject) {
        const foundObj = this.nodes.find(function (nd) {
            return nd.id === newObject.id;
        });
        if (!foundObj) {
            this.nodes.push(newObject);
        }
    }
    replaceNode(newObject) {
        const indx = this.nodes.findIndex(nd => nd.id === newObject.id);
        if (indx >= 0) {
            this.nodes[indx] = newObject;
        }
    }
    addLink(newObject) {
        this.links.push(newObject);
    }
}
