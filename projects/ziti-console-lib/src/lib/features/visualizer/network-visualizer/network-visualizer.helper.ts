import { Injectable } from '@angular/core';
import _ from 'lodash';

export class Identity {
    id;
    uuid;
    name;
    status;
    type;
    rootNode;
    serverEgressProtocol;
    serverEgressHost;
    serverEgressPort;
    postureChecks;
    events;
    os;
    utilization;
    children;
    contextMenu;
    online;
    osVersion;
    createdAt;
    updatedAt;
    constructor() {
        this.rootNode = 'No';
        this.children = [];
        this.contextMenu = 'Yes';
    }
}

export class Service {
    id;
    uuid;
    name;
    intercept_host;
    intercept_port;
    encrypted;
    rootNode;
    serverEgressHost;
    serverEgressPort;
    status;
    protocol;
    type;
    children;
    attributes;
    utilization;
    contextMenu;
    createdAt;
    updatedAt;
    intercept;
    constructor() {
        this.rootNode = 'No';
        this.children = [];
        this.contextMenu = 'Yes';
    }
}
export class Config {
  uuid;
  id;
  name;
  data;
  children;
  contextMenu;
  rootNode;
  constructor() {
      this.rootNode = 'No';
      this.children = [];
      this.contextMenu = 'Yes';
  }
}
export class Group {
    id;
    name;
    type;
    group;
    children;

    constructor(idv, s, g) {
        this.id = idv;
        this.name = s;
        this.group = g;
        this.type = 'Group';
        this.children = [];
    }
}

export class ServicePolicy {
    id;
    uuid;
    name;
    type;
    rootNode;
    children;
    contextMenu;
    createdAt;
    updatedAt;

    constructor() {
        this.rootNode = 'No';
        this.children = [];
        this.contextMenu = 'Yes';
    }
}

export class Attribute {
    id;
    name;
    type;
    children;

    constructor() {
        this.children = [];
    }
}

export class ERPolicy {
    id;
    uuid;
    name;
    status;
    size;
    type;
    semantic;
    isSystem;
    rootNode;
    children;
    contextMenu;
    createdAt;
    updatedAt;
    data;
    constructor() {
        this.rootNode = 'No';
        this.children = [];
        this.contextMenu = 'Yes';
    }
}

export class ServiceERPolicy {
    id;
    uuid;
    name;
    status;
    size;
    type;
    rootNode;
    children;
    contextMenu;
    createdAt;
    updatedAt;

    constructor() {
        this.rootNode = 'No';
        this.children = [];
        this.contextMenu = 'Yes';
    }
}

export class ERouter {
    id;
    uuid;
    name;
    verified;
    size;
    type;
    provider;
    rootNode;
    serverEgressProtocol;
    serverEgressHost;
    serverEgressPort;
    children;
    utilization;
    contextMenu;
    online;
    disabled;
    version;
    tunnelerEnabled;
    syncStatus;
    createdAt;
    updatedAt;

    constructor() {
        this.rootNode = 'No';
        this.children = [];
        this.contextMenu = 'Yes';
    }
}

export class Children {
    id;
    name;
    status;
    size;
    type;
    children;
    data:Children;

    constructor() {
        this.type = 'Children';
        this.children = [];
    }
}

@Injectable({
    providedIn: 'root',
})
export class NetworkVisualizerHelper {

    public getResourceTreeObj(
        networkName,
        networkStatus,
        services,
        identities,
        servicePolicies,
        edgerouters,
        edgeRouterPolicies,
        serviceEdgeRouterPolicies,
        // networkProductVersion,
        uniqId,
        logger
    ) {
        function createId() {
            ++uniqId;
            return uniqId;
        }

        class RootJson {
            id = createId();
            name;
            lastId = 0;
            children = [];
            contextMenu = 'Yes';
            type = 'Network';
           // version = networkProductVersion;
            status;
        }

        const rootJson = new RootJson();
        rootJson.name = 'Network';
        rootJson.status = 'Provisioned';

        function processIdentitiesForTree(
            identitiesChildren,
            identities,
            nx,
            ny
        ) {
            identitiesChildren.name = identitiesChildren.name + ' (' + ny + ')';
            const unregisteredGrp = new Group(
                createId(),
                'Identities[Unregistered]',
                'Identities that are not registered'
            );
            const abcdGrp = new Group(createId(), 'Identities [A-D]', 'Identity name starts with A to D');
            const efghGrp = new Group(createId(), 'Identities [E-H]', 'Identity name starts with E to H');
            const ijklGrp = new Group(createId(), 'Identities [I-L]', 'Identity name starts with I to L');
            const mnopGrp = new Group(createId(), 'Identities [M-P]', 'Identity name starts with M to P');
            const qrstGrp = new Group(createId(), 'Identities [Q-T]', 'Identity name starts with Q to T');
            const uvwxGrp = new Group(createId(), 'Identities [U-X]', 'Identity name starts with U to X');
            const yzGrp   = new Group(createId(), 'Identities [Y-Z]', 'Identity name starts with Y and Z');
            const oneTo9Grp = new Group(createId(), 'Identities [1-9]', 'Identity name starts with 0 to 9');
            const specialCharGrp = new Group(
                createId(),
                'Identities [others]',
                'Identity name starts with special characters'
            );

            for (let j = nx; j < ny; j++) {
                const endpoint = new Identity();
                endpoint.rootNode = 'Yes';
                endpoint.id = createId();
                endpoint.uuid = identities[j].id;
                endpoint.name = identities[j].name;
                endpoint.online = identities[j].hasApiSession === true ? 'Yes' : 'No';
                endpoint.type = 'Identity';
                endpoint.createdAt = identities[j].createdAt;
                endpoint.updatedAt = identities[j].updatedAt;
                endpoint.status = identities[j].sdkInfo !== null ? 'Registered' : 'Not Registered';
                if (identities[j].sdkInfo) {
                    endpoint.os = identities[j].sdkInfo.type? identities[j].sdkInfo.type: identities[j].sdkInfo.appId;
                    endpoint.osVersion = identities[j].sdkInfo.version;
                }
                if (identities[j].authPolicy && identities[j].authPolicy.name.includes("BrowZer")) {
                   endpoint.type = 'BrowZer Identity';
                }

                const cha = endpoint.name.charAt(0).toLowerCase();
                if (endpoint.status === 'Not Registered') {
                    unregisteredGrp.children.push(endpoint);
                } else if (cha === 'a' || cha === 'b' || cha === 'c' || cha === 'd') {
                    abcdGrp.children.push(endpoint);
                } else if (cha === 'e' || cha === 'f' || cha === 'g' || cha === 'h') {
                    efghGrp.children.push(endpoint);
                } else if (cha === 'i' || cha === 'j' || cha === 'k' || cha === 'l') {
                    ijklGrp.children.push(endpoint);
                } else if (cha === 'm' || cha === 'n' || cha === 'o' || cha === 'p') {
                    mnopGrp.children.push(endpoint);
                } else if (cha === 'q' || cha === 'r' || cha === 's' || cha === 't') {
                    qrstGrp.children.push(endpoint);
                } else if (cha === 'u' || cha === 'v' || cha === 'w' || cha === 'x') {
                    uvwxGrp.children.push(endpoint);
                } else if (cha === 'y' || cha === 'z') {
                    yzGrp.children.push(endpoint);
                } else if (
                    cha === '0' ||
                    cha === '1' ||
                    cha === '2' ||
                    cha === '3' ||
                    cha === '4' ||
                    cha === '5' ||
                    cha === '6' ||
                    cha === '7' ||
                    cha === '8' ||
                    cha === '9'
                ) {
                    oneTo9Grp.children.push(endpoint);
                } else {
                    specialCharGrp.children.push(endpoint);
                }
            } // end of main for loop

            if (unregisteredGrp.children.length > 0) {
                unregisteredGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                unregisteredGrp.name = unregisteredGrp.name + '(' + unregisteredGrp.children.length + ')';
                identitiesChildren.children.push(unregisteredGrp);
            }
            if (abcdGrp.children.length > 0) {
                abcdGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                abcdGrp.name = abcdGrp.name + ' (' + abcdGrp.children.length + ')';
                identitiesChildren.children.push(abcdGrp);
            }

            if (efghGrp.children.length > 0) {
                efghGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                efghGrp.name = efghGrp.name + ' (' + efghGrp.children.length + ')';
                identitiesChildren.children.push(efghGrp);
            }
            if (ijklGrp.children.length > 0) {
                ijklGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                ijklGrp.name = ijklGrp.name + ' (' + ijklGrp.children.length + ')';
                identitiesChildren.children.push(ijklGrp);
            }
            if (mnopGrp.children.length > 0) {
                mnopGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                mnopGrp.name = mnopGrp.name + ' (' + mnopGrp.children.length + ')';
                identitiesChildren.children.push(mnopGrp);
            }
            if (qrstGrp.children.length > 0) {
                qrstGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                qrstGrp.name = qrstGrp.name + ' (' + qrstGrp.children.length + ')';
                identitiesChildren.children.push(qrstGrp);
            }
            if (uvwxGrp.children.length > 0) {
                uvwxGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                uvwxGrp.name = uvwxGrp.name + ' (' + uvwxGrp.children.length + ')';
                identitiesChildren.children.push(uvwxGrp);
            }
            if (yzGrp.children.length > 0) {
                yzGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                yzGrp.name = yzGrp.name + ' (' + yzGrp.children.length + ')';
                identitiesChildren.children.push(yzGrp);
            }

            if (specialCharGrp.children.length > 0) {
                specialCharGrp.name = specialCharGrp.name + ' (' + specialCharGrp.children.length + ')';
                identitiesChildren.children.push(specialCharGrp);
            }

            if (oneTo9Grp.children.length > 0 && oneTo9Grp.children.length <= 100) {
                oneTo9Grp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                oneTo9Grp.name = oneTo9Grp.name + ' (' + oneTo9Grp.children.length + ')';
                identitiesChildren.children.push(oneTo9Grp);
            } else if (oneTo9Grp.children.length > 100) {
                oneTo9Grp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                for (let i = 0; i < oneTo9Grp.children.length; i++) {
                    const lastElement = i + 80 < oneTo9Grp.children.length ? i + 80 : oneTo9Grp.children.length - 1;
                    const nameS =
                        'Identities [' +
                        oneTo9Grp.children[i].name.substring(0, 4) +
                        '-' +
                        oneTo9Grp.children[lastElement].name.substring(0, 4) +
                        ']';
                    const chld = new Group(
                        createId(),
                        nameS,
                        'Identity name starts with ' +
                            oneTo9Grp.children[i].name.substring(0, 4) +
                            ' To ' +
                            oneTo9Grp.children[lastElement].name.substring(0, 4)
                    );
                    for (let j = i; j < lastElement; j++) {
                        chld.children.push(oneTo9Grp.children[j]);
                    }
                    chld.name = chld.name + ' (' + chld.children.length + ')';
                    identitiesChildren.children.push(chld);
                    i = i + 80;
                }
            }

            return identitiesChildren;
        }

        function processServicePoliciesForTree(
            servicePolicyChildren,
            servicePolicies,
            nx,
            ny
        ) {
          const bindGrp = new Group(createId(), 'Bind-Policies', 'Bind Service Policy');
          const dialGrp = new Group(createId(), 'Dial-Policies', 'Dial Service Policy');

          servicePolicies.forEach( (sp) => {

            const spolicy = new ServicePolicy();
                spolicy.id = createId();
                spolicy.uuid = sp.id;
                spolicy.name = sp.name;
                spolicy.type = 'Service Policy';
                spolicy.rootNode = 'Yes';
                if(sp.type==='Bind') {
                  bindGrp.children.push(spolicy);
                } else {
                  dialGrp.children.push(spolicy);
                }

          } );

          bindGrp.name = bindGrp.name + '('+ bindGrp.children.length +')';
          servicePolicyChildren.children.push(bindGrp);
          dialGrp.name = dialGrp.name + '('+ dialGrp.children.length +')';
          servicePolicyChildren.children.push(dialGrp);
            servicePolicyChildren.name = servicePolicyChildren.name + ' (' + (bindGrp.children.length + dialGrp.children.length) + ')';
            return servicePolicyChildren;
        }

        function serviceGrouping(servicesChildren, servicestree) {
            const protocolRDPGrp = new Group(
                createId(),
                'Services [protocol-RDP]',
                'Services created for RDP protocol'
            );
            const protocolHTTPSGrp = new Group(
                createId(),
                'Services [protocol-HTTPS]',
                'Service created for HTTPS protocol'
            );
            const protocolHTTPGrp = new Group(
                createId(),
                'Services [protocol-HTTP]',
                'Service created for HTTP protocol'
            );
            const protocolFTPGrp = new Group(createId(), 'Services [protocol-FTP]', 'Service created for FTP protocol');

            const abcdGrp = new Group(createId(), 'Services [A-D]', 'Service name starts with A to D');
            const efghGrp = new Group(createId(), 'Services [E-H]', 'Service name starts with E to H');
            const ijklGrp = new Group(createId(), 'Services [I-L]', 'Service name starts with I to L');
            const mnopGrp = new Group(createId(), 'Services [M-P]', 'Service name starts with M to P');
            const qrstGrp = new Group(createId(), 'Services [Q-T]', 'Service name starts with Q to T');
            const uvwxGrp = new Group(createId(), 'Services [U-X]', 'Service name starts with U to X');
            const yzGrp = new Group(createId(), 'Services [Y-Z]', 'Service name starts with Y and Z');
            const oneTo9Grp = new Group(createId(), 'Services [1-9]', 'Service name starts with 0 to 9');
            const specialCharGrp = new Group(
                createId(),
                'Services [others]',
                'Service name starts with special characters'
            );

            for (let i = 0; i < servicestree.length; i++) {
                const serviceobj = servicestree[i];
                const cha = serviceobj.name.charAt(0).toLowerCase();

                if (serviceobj.protocol === 'rdp') {
                    protocolRDPGrp.children.push(serviceobj);
                } else if (serviceobj.protocol === 'https') {
                    protocolHTTPSGrp.children.push(serviceobj);
                } else if (serviceobj.protocol === 'http') {
                    protocolHTTPGrp.children.push(serviceobj);
                } else if (serviceobj.protocol === 'ftp') {
                    protocolFTPGrp.children.push(serviceobj);
                } else if (cha === 'a' || cha === 'b' || cha === 'c' || cha === 'd') {
                    abcdGrp.children.push(serviceobj);
                } else if (cha === 'e' || cha === 'f' || cha === 'g' || cha === 'h') {
                    efghGrp.children.push(serviceobj);
                } else if (cha === 'i' || cha === 'j' || cha === 'k' || cha === 'l') {
                    ijklGrp.children.push(serviceobj);
                } else if (cha === 'm' || cha === 'n' || cha === 'o' || cha === 'p') {
                    mnopGrp.children.push(serviceobj);
                } else if (cha === 'q' || cha === 'r' || cha === 's' || cha === 't') {
                    qrstGrp.children.push(serviceobj);
                } else if (cha === 'u' || cha === 'v' || cha === 'w' || cha === 'x') {
                    uvwxGrp.children.push(serviceobj);
                } else if (cha === 'y' || cha === 'z') {
                    yzGrp.children.push(serviceobj);
                } else if (
                    cha === '0' ||
                    cha === '1' ||
                    cha === '2' ||
                    cha === '3' ||
                    cha === '4' ||
                    cha === '5' ||
                    cha === '6' ||
                    cha === '7' ||
                    cha === '8' ||
                    cha === '9'
                ) {
                    oneTo9Grp.children.push(serviceobj);
                } else {
                    specialCharGrp.children.push(serviceobj);
                }
            } // end main for loop

            if (protocolRDPGrp.children.length > 0) {
                protocolRDPGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                protocolRDPGrp.name = protocolRDPGrp.name + '(' + protocolRDPGrp.children.length + ')';
                servicesChildren.children.push(protocolRDPGrp);
            }
            if (specialCharGrp.children.length > 0) {
                specialCharGrp.name = specialCharGrp.name + '(' + specialCharGrp.children.length + ')';
                servicesChildren.children.push(specialCharGrp);
            }
            if (protocolHTTPSGrp.children.length > 0) {
                protocolHTTPSGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                protocolHTTPSGrp.name = protocolHTTPSGrp.name + '(' + protocolHTTPSGrp.children.length + ')';
                servicesChildren.children.push(protocolHTTPSGrp);
            }
            if (protocolHTTPGrp.children.length > 0) {
                protocolHTTPGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                protocolHTTPGrp.name = protocolHTTPGrp.name + '(' + protocolHTTPGrp.children.length + ')';
                servicesChildren.children.push(protocolHTTPGrp);
            }
            if (protocolFTPGrp.children.length > 0) {
                protocolFTPGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                protocolFTPGrp.name = protocolFTPGrp.name + '(' + protocolFTPGrp.children.length + ')';
                servicesChildren.children.push(protocolFTPGrp);
            }
            if (abcdGrp.children.length > 0) {
                abcdGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                abcdGrp.name = abcdGrp.name + '(' + abcdGrp.children.length + ')';
                servicesChildren.children.push(abcdGrp);
            }
            if (efghGrp.children.length > 0) {
                efghGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                efghGrp.name = efghGrp.name + '(' + efghGrp.children.length + ')';
                servicesChildren.children.push(efghGrp);
            }
            if (ijklGrp.children.length > 0) {
                ijklGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                ijklGrp.name = ijklGrp.name + '(' + ijklGrp.children.length + ')';
                servicesChildren.children.push(ijklGrp);
            }
            if (mnopGrp.children.length > 0) {
                mnopGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                mnopGrp.name = mnopGrp.name + '(' + mnopGrp.children.length + ')';
                servicesChildren.children.push(mnopGrp);
            }
            if (qrstGrp.children.length > 0) {
                qrstGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                qrstGrp.name = qrstGrp.name + '(' + qrstGrp.children.length + ')';
                servicesChildren.children.push(qrstGrp);
            }
            if (uvwxGrp.children.length > 0) {
                uvwxGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                uvwxGrp.name = uvwxGrp.name + '(' + uvwxGrp.children.length + ')';
                servicesChildren.children.push(uvwxGrp);
            }
            if (yzGrp.children.length > 0) {
                yzGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                yzGrp.name = yzGrp.name + '(' + yzGrp.children.length + ')';
                servicesChildren.children.push(yzGrp);
            }
            if (oneTo9Grp.children.length > 0) {
                oneTo9Grp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                oneTo9Grp.name = oneTo9Grp.name + '(' + oneTo9Grp.children.length + ')';
                servicesChildren.children.push(oneTo9Grp);
            }
            servicesChildren.name = servicesChildren.name + '(' + servicestree.length + ')';
            return servicesChildren;
        }

        function processServicesForTree(
            servicesChildren,
            services,
            nx,
            ny
        ) {
            const servicestree = [];
            for (let i = nx; i < ny; i++) {
                const serviceobj = new Service();
                serviceobj.id = createId();
                serviceobj.name = services[i].name;
                serviceobj.uuid = services[i].id;
                serviceobj.type = 'Service';
                serviceobj.rootNode = 'Yes';

                const attributeswithName = [];
                attributeswithName.push('@' + services[i].name);
                services[i] && services[i].roleAttributes && services[i].roleAttributes.find((srattr) => {
                    attributeswithName.push(srattr);
                });

                let isItRDPProtocolAttr = false;
                let isItHTTPProtocolAttr = false;
                let isItHTTPSProtocolAttr = false;
                let isItFTPProtocolAttr = false;

                for (let k = 0; k < attributeswithName.length; k++) {
                    const attrOb = new Attribute();
                    attrOb.id = createId();
                    attrOb.name = attributeswithName[k];
                    attrOb.type = 'Service Attribute';
                    const attName = attributeswithName[k].toLowerCase();
                    if (isItRDPProtocolAttr === false && attName.includes('rdp')) {
                        serviceobj.protocol = 'rdp';
                        isItRDPProtocolAttr = true;
                    }
                    if (isItHTTPSProtocolAttr === false && attName.includes('https')) {
                        serviceobj.protocol = 'https';
                        isItHTTPSProtocolAttr = true;
                    }
                    if (isItHTTPSProtocolAttr === false && isItHTTPProtocolAttr === false && attName.includes('http')) {
                        serviceobj.protocol = 'http';
                        isItHTTPProtocolAttr = true;
                    }
                    if (isItFTPProtocolAttr === false && attName.includes('ftp')) {
                        serviceobj.protocol = 'ftp';
                        isItFTPProtocolAttr = true;
                    }
                } // end inner for loop

                servicestree.push(serviceobj);
            } // end for loop

            return serviceGrouping(servicesChildren, servicestree);
        } // end of processServicesForTree

        function processEdgeRouterPoliciesForTree(
            edgeRouterPoliciesChildren,
            edgeRouterPolicies,
            nx,
            ny
        ) {
            for (let i = nx; i < ny; i++) {
                const erpolicy = new ERPolicy();
                erpolicy.id = createId();
                erpolicy.uuid = edgeRouterPolicies[i].id;
                erpolicy.name = edgeRouterPolicies[i].name;
                erpolicy.type = 'Router Policy';
                erpolicy.rootNode = 'Yes';
                erpolicy.isSystem = edgeRouterPolicies[i].isSystem;
                erpolicy.semantic = edgeRouterPolicies[i].semantic;
                edgeRouterPoliciesChildren.children.push(erpolicy);
            } // end of main for loop
            return edgeRouterPoliciesChildren;
        } // end

        function processServiceEdgeRouterPoliciesForTree(
            serviceEdgeRouterPoliciesChildren,
            serviceEdgeRouterPolicies,
            nx,
            ny
        ) {
            for (let i = nx; i < ny; i++) {
                const serviceerpolicy = new ServiceERPolicy();
                serviceerpolicy.id = createId();
                serviceerpolicy.uuid = serviceEdgeRouterPolicies[i].id;
                serviceerpolicy.name = serviceEdgeRouterPolicies[i].name;
                serviceerpolicy.type = 'Service Router Policy';
                serviceerpolicy.rootNode = 'Yes';
                serviceEdgeRouterPoliciesChildren.children.push(serviceerpolicy);
            } // end of main for loop
            return serviceEdgeRouterPoliciesChildren;
        } // end

        function processEdgeroutersForTree(
            edgerouterChildren,
            edgerouters,
            nx,
            ny
        ) {
            for (let i = nx; i < ny; i++) {
                const erOb = new ERouter();
                erOb.id = createId();
                const er = edgerouters[i];
                if (er) {
                    erOb.uuid = er.id;
                    erOb.name = er.name;
                    erOb.verified = er.isVerified? 'Yes': 'No';
                    //erOb.version = er.productVersion;
                    erOb.online = er.isOnline? 'Yes': 'No';
                    erOb.disabled = er.disabled? 'Yes': 'No';
                    erOb.type = 'Edge Router';
                    erOb.rootNode = 'Yes';
                    erOb.tunnelerEnabled = er.tunnelerEnabled? er.tunnelerEnabled: 'No';
                    erOb.syncStatus = er.syncStatus? er.syncStatus:'No';
                    erOb.createdAt = er.createdAt;
                    erOb.updatedAt = er.updatedAt;

                    edgerouterChildren.children.push(erOb);
                }
            } // end main for loop
            return edgerouterChildren;
        }

        // createId() generates node Id 1,2,3,4,5 for the following five nodes. this id is used to search capability.
        let servicPoliciesChildren = new Children();
        servicPoliciesChildren.id = createId();
        servicPoliciesChildren.name = 'Service Policies';

        let servicesChildren = new Children();
        servicesChildren.id = createId();
        servicesChildren.name = 'Services';

        let identitiesChildren = new Children();
        identitiesChildren.id = createId();
        identitiesChildren.name = 'Identities';

        let edgerouterChildren = new Children();
        edgerouterChildren.id = createId();
        edgerouterChildren.name = 'Edge Routers';

        let edgeRouterPoliciesChildren = new Children();
        edgeRouterPoliciesChildren.id = createId();
        edgeRouterPoliciesChildren.name = 'Edge Router Policies';

        let serviceEdgeRouterPolicesChildren = new Children();
        serviceEdgeRouterPolicesChildren.id = createId();
        serviceEdgeRouterPolicesChildren.name = 'Service Edge Router Policies';

        servicesChildren = processServicesForTree(
            servicesChildren,
            services,
            0,
            services.length
        );

        edgerouterChildren = processEdgeroutersForTree(
            edgerouterChildren,
            edgerouters,
            0,
            edgerouters.length
        );

        if (edgerouterChildren) {
            edgerouterChildren.name = edgerouterChildren.name + ' (' + edgerouterChildren.children.length + ')';
        }

        servicPoliciesChildren = processServicePoliciesForTree(
            servicPoliciesChildren,
            servicePolicies,
            0,
            servicePolicies.length
        );

        edgeRouterPoliciesChildren = processEdgeRouterPoliciesForTree(
            edgeRouterPoliciesChildren,
            edgeRouterPolicies,
            0,
            edgeRouterPolicies.length
        );

        if (edgeRouterPoliciesChildren) {
            edgeRouterPoliciesChildren.name =
                'Edge Router Policies (' + edgeRouterPoliciesChildren.children.length + ')';
        }

        identitiesChildren = processIdentitiesForTree(
            identitiesChildren,
            identities,
            0,
            identities.length
        );

        //serviceRouterPolicies
        serviceEdgeRouterPolicesChildren = processServiceEdgeRouterPoliciesForTree(
            serviceEdgeRouterPolicesChildren,
            serviceEdgeRouterPolicies,
            0,
            serviceEdgeRouterPolicies.length
        );

        if (edgeRouterPoliciesChildren) {
            serviceEdgeRouterPolicesChildren.name =
                'Service Edge Router Policies (' + serviceEdgeRouterPolicesChildren.children.length + ')';
        }

        rootJson.children.push(servicPoliciesChildren);
        rootJson.children.push(servicesChildren);
        rootJson.children.push(identitiesChildren);
        rootJson.children.push(edgerouterChildren);
        rootJson.children.push(edgeRouterPoliciesChildren);
        rootJson.children.push(serviceEdgeRouterPolicesChildren);
        rootJson.lastId = uniqId;

        return rootJson;
    }

}
