import { Inject, Injectable } from '@angular/core';
import _ from 'lodash';

class Link {
    source;
    sourceName;
    target;
    targetName;
    weight;
    status;
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
            const grp3Node = findEndpoint(nid, bindIdnetities);
            if (grp3Node) {
                grp3Node.group = '3';
                group3Nodes.push(grp3Node);
                rootOb.addNode(grp3Node);
            }
        });

        // === POSITIONING ===
        // Dynamically distribute 5 columns across available width
        const padding = 100;
        const usableWidth = availableWidth - (padding * 2);
        const colSpacing = usableWidth / 4; // 4 gaps between 5 columns
        const colPositions = [
            padding,                        // Identity
            padding + colSpacing,           // Public Edge Routers
            padding + colSpacing * 2,       // Private Edge Routers
            padding + colSpacing * 3,       // Hosts
            padding + colSpacing * 4,       // Service
        ];
        const POS_X = {
            '1': colPositions[0],
            '2d': colPositions[1],
            '2dh': colPositions[2],
            '2t': colPositions[2],
            '2h': colPositions[2],
            '3': colPositions[3],
            '4': colPositions[4],
        };

        // Compute available height based on the tallest group
        const allGroups = [
            { nodes: endpointNodeOb ? [endpointNodeOb] : [], x: POS_X['1'] },
            { nodes: group2dNodes, x: POS_X['2d'] },
            { nodes: group2tNodes, x: POS_X['2t'] },
            { nodes: group2hNodes, x: POS_X['2h'] },
            { nodes: group3Nodes, x: POS_X['3'] },
            { nodes: group4Nodes, x: POS_X['4'] },
        ];
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
        const activeCircuitHops = new Set<string>();
        serviceCircuits.forEach((circuit) => {
            const pathNodes = circuit.path?.nodes || circuit.path || [];
            const clientId = circuit.tags?.clientId || circuit.clientId || circuit.client?.id;
            const hostId = circuit.tags?.hostId || circuit.host?.id;

            // Client -> first router
            if (pathNodes.length > 0) {
                const firstRouterId = pathNodes[0]?.id || pathNodes[0];
                if (clientId) {
                    activeCircuitHops.add(hopKey(clientId, firstRouterId));
                }
            }

            // Router -> Router hops
            for (let i = 0; i < pathNodes.length - 1; i++) {
                const fromId = pathNodes[i]?.id || pathNodes[i];
                const toId = pathNodes[i + 1]?.id || pathNodes[i + 1];
                activeCircuitHops.add(hopKey(fromId, toId));
            }

            // Last router -> host
            if (pathNodes.length > 0 && hostId) {
                const lastRouterId = pathNodes[pathNodes.length - 1]?.id || pathNodes[pathNodes.length - 1];
                activeCircuitHops.add(hopKey(lastRouterId, hostId));
            }
        });

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
                    lnk.status = getEndpointToRouterLinkState(endpointNodeOb, nd);
                    lnk.weight = getWeight(lnk.status);
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
            lnk.status = (r1.online === 'Yes' || r1.status === 'PROVISIONED') &&
                         (r2.online === 'Yes' || r2.status === 'PROVISIONED') ? 1 : 0;
            if (isActiveCircuit) lnk.status = 1;
            lnk.weight = getWeight(lnk.status);
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
                            lnk.status = getEndpointToRouterLinkState(hostNode, routerNode);
                            lnk.weight = getWeight(lnk.status);
                            lnk.linkType = activeCircuitHops.has(hopKey(routerNode.id, hostNode.id))
                                ? 'active-circuit' : 'endpoint-connection';
                            rootOb.addLink(lnk);
                        }
                    });
                }
            });

            // If no terminator-based links, add inferred connections
            if (!hasTerminatorLink) {
                hostRouterNodes.forEach((routerNode) => {
                    group3Nodes.forEach((hostNode) => {
                        const lnk = new Link();
                        lnk.source = routerNode.id;
                        lnk.sourceName = routerNode.name;
                        lnk.target = hostNode.id;
                        lnk.targetName = hostNode.name;
                        lnk.linkType = 'inferred';
                        lnk.status = -1;
                        lnk.weight = 5;
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
                        lnk.linkType = 'inferred';
                        lnk.status = getEndpointToRouterLinkState(hostNode, dialRouter);
                        lnk.weight = getWeight(lnk.status);
                        rootOb.addLink(lnk);
                    }
                });
            });
        }

        // 4. Hosting Identities -> Service (Group 3 -> 4)
        group4Nodes.forEach((serviceNode) => {
            group3Nodes.forEach((hostNode) => {
                const lnk = new Link();
                lnk.source = hostNode.id;
                lnk.sourceName = hostNode.name;
                lnk.target = serviceNode.id;
                lnk.targetName = serviceNode.name;
                lnk.weight = 1;
                lnk.status = getServiceToEndpointLinkState(hostNode, serviceNode);
                lnk.weight = getWeight(lnk.status);
                lnk.linkType = 'endpoint-connection';
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
                lnk.status = getEndpointToRouterLinkState(endpointNodeOb, nd);
                lnk.weight = getWeight(lnk.status);
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
                    } else {
                        lnk.status = getEndpointToRouterLinkState(nd2, nd1);
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
                    lnk.status = getServiceToEndpointLinkState(group3Nodes[k1], group4Nodes[k0]);
                    lnk.weight = getWeight(lnk.status);
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

    const MIN_Y = 75; // clear the column headers and counts
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
    if (_.has(ePoint, 'edgeRouterConnectionStatus')) {
        node.routerConnection = ePoint.edgeRouterConnectionStatus === 'offline' ? 'No' : 'Yes';
        node.apiSession = node.routerConnection;
    } else {
        node.routerConnection = ePoint['hasEdgeRouterConnection'] === false ? 'No' : 'Yes';
        node.apiSession = ePoint['hasApiSession'] === false ? 'No' : 'Yes';
    }
    node.os = ePoint.envInfo ? ePoint.envInfo.os : '';
    node.mfaEnabled = ePoint.isMfaEnabled;
    node.status = ePoint.envInfo && ePoint.envInfo.os !== null ? 'Registered' : 'Un-Registered';
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

function getEndpointToRouterLinkState(endpointNode, routerNode) {
    let linkstate = -1;
    if (routerNode.status === 'ERROR') {
        linkstate = 2; // router is broken — warning
    } else if (endpointNode.status === 'Un-Registered') {
        linkstate = -1;
    } else if (endpointNode.apiSession === 'No' || endpointNode.routerConnection === 'No') {
        // No session or no connection = offline, not error
        linkstate = -1;
    } else if (routerNode.online === 'Yes' && endpointNode.routerConnection === 'Yes') {
        linkstate = 1;
    } else {
        linkstate = -1;
    }
    return linkstate;
}

function getServiceToEndpointLinkState(endpointNode, serviceNode) {
    // status 1 = active, -1 = offline/available, 2 = warning/misconfigured
    if (endpointNode.status === 'Un-Registered') {
        return 2; // hosting identity never enrolled — misconfigured
    } else if (endpointNode.apiSession === 'No' || endpointNode.routerConnection === 'No') {
        return -1; // just offline
    } else if (endpointNode.status === 'Registered' && endpointNode.routerConnection === 'Yes') {
        return 1; // active
    }
    return -1;
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
