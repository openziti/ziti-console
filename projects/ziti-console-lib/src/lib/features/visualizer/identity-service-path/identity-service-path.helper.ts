import { Inject, Injectable } from '@angular/core';

class Link {
    source;
    sourceName;
    target;
    targetName;
    weight;
    status;
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
    os;
    mfaEnabled;
    type;
    usage;
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
    alias;
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
        filterText = ''
    ) {
        let endpointNodeOb = null;
        const rootOb = new RootJson();
        const bindNode =  bindIdnetities.find( (nd) =>  nd.id === endpoint.id  );
       if (!bindNode) {
          endpointNodeOb = createEndpoint(endpoint);
          endpointNodeOb.group = '1';
          endpointNodeOb.posx = 50;
          endpointNodeOb.posy = 200;
          rootOb.addNode(endpointNodeOb);
        }
        let publicRouterNodes = [];
        let posy = 0;
        edgerouters.forEach((nd) => {
            const nodeOb = createERNode(nd);
            nodeOb.group = '2a';
            nodeOb.posx = 250;
            posy = posy + 100;
            nodeOb.posy = posy;
            publicRouterNodes.push(nodeOb);
            rootOb.addNode(nodeOb);
        });

        let publicRouterNodesForEndpointTunnelers = [];

        const posx_for_group3 = 550;
        this.posy_for_group3 = 0;
        let group3Ids = [];
        let posy_for_group4 = 150;
        const group4Nodes = [];
        const serviceIPPorts = [];

           const srNode = new ServiceHostNode();
                       srNode.id = selectedServiceOb.id;
                       srNode.name = selectedServiceOb.name;
                       srNode.alias = selectedServiceOb.name;
                       srNode.type = 'Config Service';
                       srNode.group = '4';
                       srNode.status = '1';
                       group4Nodes.push(srNode);
                       rootOb.addNode(srNode);
                    bindIdnetities.forEach((ePoint) => {
                         if (group3Ids.indexOf(ePoint.id) < 0) {
                            group3Ids.push(ePoint.id);
                         }
                     });

        // create links between nodes

        // in group3,  remove  routers/ep  that exist in group2
        this.posy_for_group3 = 165;
        let grp3Yincrement = 100;

        const group3Nodes = [];
        let countgrp3 = 0;
        group3Ids.find((nid) => {
                // let's check if the service hosted is an Endpoint
               let grp3Node = findEndpoint(nid, bindIdnetities);
                  if(grp3Node) {
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

        if (group3Nodes)
            group3Nodes.find((node3) => {
                if (node3.group === '3') {
                    node3.posy = this.posy_for_group3;
                    this.posy_for_group3 = this.posy_for_group3 + grp3Yincrement;
                }
            });

        if (group4Nodes && group4Nodes.length === 1) {
            posy_for_group4 = 200;
        }

        group4Nodes.find((nd4) => {
           // nd4.posx = group3Nodes  && group3Nodes.length > 0  && !group3Nodes[0].type.includes("Public Hosted") ? posx_for_group3 + 175 : posx_for_group3;
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
            if (endpointNodeOb !==null && (nd.group === '2a' || nd.group === '2ab' || nd.group === '2ac')) {
                const lnk = new Link();
                lnk.source = endpointNodeOb.id;
                lnk.sourceName = endpointNodeOb.name;
                lnk.target = nd.id;
                lnk.targetName = nd.name;
                lnk.status = getEndpointToRouterLinkState(endpointNodeOb, nd);
                lnk.weight = getWeight(lnk.status);
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
                    } // link not required.

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
                                ? 1
                                : 0;
                    } else {
                        lnk.status = getEndpointToRouterLinkState(nd2, nd1);
                    }
                    lnk.weight = getWeight(lnk.status);
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
                const foundNd = rootOb.nodes.find( function (rnd) {
                   // if (rnd.id === group3Nodes[k1].id) {
                        return rnd.id === group3Nodes[k1].id;
                   // }
                });
                if (foundNd.type.includes('Router')) {
                    lnk.status = foundNd.status === 'PROVISIONED' && foundNd.online === 'Yes' ? 1 : 0;
                } else {
                    lnk.status = getServiceToEndpointLinkState(group3Nodes[k1], group4Nodes[k0]);
                    lnk.weight = getWeight(lnk.status);
                }
                rootOb.addLink(lnk);
            }
        }

        function findEndpoint(endpointId, endpoints) {
            let node = null;
            if (endpointId === null) {
                return null;
            }
            const ePoint = endpoints.find( function (er) {
               // if (er.id === endpointId ) {
                    return er.id === endpointId;
                // }
            });

            if (ePoint) {
                node = createEndpoint(ePoint);
                node.type = 'Hosted Endpoint';
            }
            return node;
        } // end of findEndpoint

        function createEndpoint(ePoint) {
            const node = new Node();
            node.id = ePoint.id;
            node.name = ePoint.name;
            node.type = 'Endpoint';
            node.apiSession = ePoint.hasApiSession === false ? 'No' : 'Yes';
            node.routerConnection = ePoint.hasEdgeRouterConnection === false ? 'No' : 'Yes';
            node.os = ePoint.envInfo? ePoint.envInfo.os : '';
            node.mfaEnabled = ePoint.isMfaEnabled;
            node.status = ePoint.envInfo && ePoint.envInfo.os !== null ? 'Registered' : 'Un-Registered';
            return node;
        }

        function createERNode(erouter) {
            const nodeOb = new Node();
            nodeOb.id = erouter.id;
            nodeOb.name = erouter.name;
            nodeOb.provider = 'aws';
             //   erouter._embedded && erouter._embedded.host && erouter._embedded.host.provider !== null
              //      ? erouter._embedded.host.provider
               //     : 'Private Data Center';
            nodeOb.status = erouter.isVerified === true? 'Registered':'Un-Registered';
            nodeOb.online = erouter.isOnline === false ? 'No' : 'Yes';
            nodeOb.type = 'EdgeRouter';
            return nodeOb;
        }

        function findEdgeRouterForId(routerId, edgerouters) {
            const erouter = edgerouters.find((er) => {
              //  if (er.id === routerId) {
                    return er.id === routerId;
               // }
            });

            if (erouter) {
                return createERNode(erouter);
            } else {
                return null;
            }
        } // end of findEdgeRouterForId

        function getUtilization(name, data) {
            if (!data) {
                return '0 Bytes';
            }
            for (const jsonData of data) {
                const vals = Object.values(jsonData);
                if (vals[0] === name) {
                    return vals[1] + ' in 30 days';
                }
            }
            return '0 Bytes';
        }

        function getEndpointToRouterLinkState(endpointNode, routerNode) {
            let linkstate = 0;
            if (routerNode.status === 'ERROR') {
                linkstate = 0;
            } else if (endpointNode.status === 'Un-Registered') {
                linkstate = -1;
            } else if (endpointNode.apiSession === 'No') {
                linkstate = 0;
            } else if (endpointNode.routerConnection === 'No') {
                linkstate = -1;
            } else if (routerNode.online === 'Yes' && endpointNode.routerConnection === 'Yes') {
                linkstate = 1;
            } else {
                linkstate = -1;
            }
            return linkstate;
        }

        function getServiceToEndpointLinkState(endpointNode, serviceNode) {
            let linkstate = 0;
            if (endpointNode.status === 'Un-Registered' || serviceNode.alias.includes('No')) {
                linkstate = -1;
            } else if (endpointNode.apiSession === 'No') {
                linkstate = 0;
            } else if (endpointNode.status === 'Registered' && endpointNode.apiSession === 'Yes') {
                linkstate = 1;
            } else {
                linkstate = 0;
            }
            return linkstate;
        }

        function getWeight(linkState) {
            return linkState === -1 ? 5 : 1;
        }
        return rootOb;
    } // end of NEW Function

}

 class RootJson {
        nodes:any = [];
        links:any = [];
        addNode (newObject) {
                const foundObj = this.nodes.find( function (nd) {
                   // if (nd.id === newObject.id) {
                       // nd = newObject;
                        return nd.id === newObject.id;
                    // }
                });
                if (!foundObj) {
                    this.nodes.push(newObject);
                }
        };
        replaceNode (newObject) {
              const indx = this.nodes.findIndex(nd => nd.id === newObject.id);
                if (indx >= 0) {
                 this.nodes[indx] = newObject;
                }
        };
       addLink (newObject) {
           this.links.push(newObject);
        };

 }
