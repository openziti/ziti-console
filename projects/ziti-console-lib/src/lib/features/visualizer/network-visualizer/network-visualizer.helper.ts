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
    data: Children;
    rootNode = 'No';
    firstChild = 'No';
    constructor() {
        this.type = 'Children';
        this.children = [];
    }
}

@Injectable({
    providedIn: 'root',
})
export class NetworkVisualizerHelper {

   uniqIId:any =0;

 createUniqId() {
   return ++this.uniqIId;
 }
  public createEdgeRouterNode(er, isRootNode = 'Yes') {
      const erOb = new ERouter();
      // erOb.id = createId();
         erOb.uuid = er.id;
         erOb.name = er.name;
         erOb.verified = er.isVerified? 'Yes': 'No';
         //erOb.version = er.productVersion;
         erOb.online = er.isOnline? 'Yes': 'No';
         erOb.disabled = er.disabled? 'Yes': 'No';
         erOb.type = 'Edge Router';
         erOb.rootNode = isRootNode;
         erOb.tunnelerEnabled = er.tunnelerEnabled? er.tunnelerEnabled: 'No';
         erOb.syncStatus = er.syncStatus? er.syncStatus:'No';
         erOb.createdAt = er.createdAt;
         erOb.updatedAt = er.updatedAt;
   return erOb;
  }
  public createServiceEdgeRouterPolicyNode(rawObj, isRootNode = 'Yes') {
     const serviceerpolicy = new ServiceERPolicy();
     // serviceerpolicy.id = createId();
     serviceerpolicy.uuid = rawObj.id;
     serviceerpolicy.name = rawObj.name;
     serviceerpolicy.type = 'Service Router Policy';
     serviceerpolicy.rootNode = isRootNode;
    return serviceerpolicy;
  }
  public createEdgeRouterPolicyNode(rawObj, isRootNode = 'Yes') {
    const erpolicy = new ERPolicy();
     // erpolicy.id = createId();
      erpolicy.uuid = rawObj.id;
      erpolicy.name = rawObj.name;
      erpolicy.type = 'Edge Router Policy';
      erpolicy.rootNode = isRootNode;
      erpolicy.isSystem = rawObj.isSystem;
      erpolicy.semantic = rawObj.semantic;
   return erpolicy;
  }
  public createServicePolicyNode(rawObj, isRootNode = 'Yes') {
    const bindGrp = new Group(43423, 'Bind-Policies', 'Bind Service Policy');
    const dialGrp = new Group(43545, 'Dial-Policies', 'Dial Service Policy');

    const spolicy:any = new ServicePolicy();
       // spolicy.id = createId();
       spolicy.id = 87956;
        spolicy.uuid = rawObj.id;
        spolicy.name = rawObj.name;
        spolicy.type = 'Service Policy';
        spolicy.rootNode = isRootNode;
        spolicy.clickProcess = "Not Yet";
      if(rawObj.type==='Bind') {
        bindGrp.children.push(spolicy);
        return bindGrp;
      } else {
        dialGrp.children.push(spolicy);
        return dialGrp;
      }
  }
  public createIdentityNode(rawObj, isRootNode = 'Yes') {
    const endpoint = new Identity();
            endpoint.rootNode = isRootNode;
           // endpoint.id = createId();
            endpoint.id = 5432;
            endpoint.uuid = rawObj.id;
            endpoint.name = rawObj.name;
            endpoint.online = rawObj.hasApiSession === true ? 'Yes' : 'No';
            endpoint.type = 'Identity';
            endpoint.createdAt = rawObj.createdAt;
            endpoint.updatedAt = rawObj.updatedAt;
            endpoint.status = rawObj.sdkInfo !== null ? 'Registered' : 'Not Registered';
              if (rawObj.sdkInfo) {
                  endpoint.os = rawObj.sdkInfo.type? rawObj.sdkInfo.type: rawObj.sdkInfo.appId;
                  endpoint.osVersion = rawObj.sdkInfo.version;
              }
              if (rawObj.authPolicy && rawObj.authPolicy.name.includes("BrowZer")) {
                 endpoint.type = 'BrowZer Identity';
              }
    return   endpoint;
  }
  public createServiceNode(rawObj, isRootNode = 'Yes') {
      const serviceobj = new Service();
       // serviceobj.id = createId();
        serviceobj.name = rawObj.name;
        serviceobj.uuid = rawObj.id;
        serviceobj.type = 'Service';
        serviceobj.rootNode = isRootNode;
        const attributeswithName = [];
        rawObj && rawObj.roleAttributes && rawObj.roleAttributes.find((srattr) => {
           attributeswithName.push(srattr);
        });
    return serviceobj;
  }

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
        services_totalCount, identities_totalCount, edgerouters_totalCount,
        service_policies_totalCount, edge_router_policies_totalCount,
        service_router_policies_totalCount,
        uniqId,
        logger,
        ...args: any
    ) {
       this.uniqIId = uniqId;

        function createId() {
            ++uniqId;
          //  ++this.uniqIId;
            return uniqId;
        }

        class RootJson {
            id = createId();
            name;
            lastId = 0;
            children = [];
            contextMenu = 'Yes';
            type = 'Network';
            rootNode = 'No';
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
          if(args[2]===false) return identitiesChildren;
            const obj_array = [];
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
                obj_array.push(endpoint);
            } // end of main for loop
          return grouping('Identitie', identitiesChildren, obj_array);

        }
        function subGrouping(name, mainGroup) {
           const pageSize = 25;
           mainGroup.children.sort(function (a, b) {
               return a.name.localeCompare(b.name);
           });
          if (mainGroup.children.length > pageSize) {
            const children:any = [];
            let pageNo = 0;
            for (let i = 0; i < mainGroup.children.length; i++) {
                const lastElement = (i + pageSize) < mainGroup.children.length? (i + pageSize) : (mainGroup.children.length);
                const nameS =
                        name + 's [' +
                        mainGroup.children[i].name.substring(0, 4) +
                        ' - ' +
                        mainGroup.children[lastElement-1].name.substring(0, 4) +
                        ']';
                const chld = new Group(
                        createId(),
                        nameS,
                        name + ' name starts with ' +
                         mainGroup.children[i].name.substring(0, 4) +
                         ' To ' +
                         mainGroup.children[lastElement-1].name.substring(0, 4)
                    );
                    let j = 0;
                for (j = i; j < lastElement; j++) {
                     i++;
                     chld.children.push(mainGroup.children[j]);
                }
                 --i;
                  chld.name = chld.name + ' (' + chld.children.length + ')';
                  children.push(chld);
            }
            mainGroup.children = children;
          }
          return mainGroup;
        }

        function grouping(name, children, objectsArray) {
          let protocolRDPGrp, protocolHTTPSGrp, protocolHTTPGrp, protocolFTPGrp, unregisteredGrp;

          if (name === 'Service') {
             protocolRDPGrp = new Group(
                createId(),
                'Services [protocol-RDP]',
                'Services created for RDP protocol'
            );
             protocolHTTPSGrp = new Group(
                createId(),
                'Services [protocol-HTTPS]',
                'Service created for HTTPS protocol'
            );
             protocolHTTPGrp = new Group(
                createId(),
                'Services [protocol-HTTP]',
                'Service created for HTTP protocol'
            );
             protocolFTPGrp = new Group(createId(), 'Services [protocol-FTP]', 'Service created for FTP protocol');
          }
           if (name === 'Identitie') {
             unregisteredGrp = new Group(
                          createId(),
                          'Identities[Unregistered]',
                          'Identities that are not registered'
              );
           }
            const abcdGrp = new Group(createId(), name + 's [A-D]', name +' name starts with A to D');
            const efghGrp = new Group(createId(), name + 's [E-H]', name +' name starts with E to H');
            const ijklGrp = new Group(createId(), name + 's [I-L]', name +' name starts with I to L');
            const mnopGrp = new Group(createId(), name + 's [M-P]', name +' name starts with M to P');
            const qrstGrp = new Group(createId(), name + 's [Q-T]', name +' name starts with Q to T');
            const uvwxGrp = new Group(createId(), name + 's [U-X]', name +' name starts with U to X');
            const yzGrp = new Group(createId(),   name + 's [Y-Z]', name +' name starts with Y and Z');
            const oneTo9Grp = new Group(createId(), name + 's [1-9]', name +' name starts with 0 to 9');
            const specialCharGrp = new Group(
                createId(),
                name + 's [others]',
                name + ' name starts with special characters'
            );

            for (let i = 0; i < objectsArray.length; i++) {
                const obj = objectsArray[i];
                const cha = obj.name.charAt(0).toLowerCase();
                if (name === 'Identitie' && obj.status === 'Not Registered') {
                    unregisteredGrp.children.push(obj);
                } else if (name === 'Service' && obj.protocol === 'rdp') {
                    protocolRDPGrp.children.push(obj);
                } else if (name === 'Service' && obj.protocol === 'https') {
                    protocolHTTPSGrp.children.push(obj);
                } else if (name === 'Service' && obj.protocol === 'http') {
                    protocolHTTPGrp.children.push(obj);
                } else if (name === 'Service' &&  obj.protocol === 'ftp') {
                    protocolFTPGrp.children.push(obj);
                } else if (cha === 'a' || cha === 'b' || cha === 'c' || cha === 'd') {
                    abcdGrp.children.push(obj);
                } else if (cha === 'e' || cha === 'f' || cha === 'g' || cha === 'h') {
                    efghGrp.children.push(obj);
                } else if (cha === 'i' || cha === 'j' || cha === 'k' || cha === 'l') {
                    ijklGrp.children.push(obj);
                } else if (cha === 'm' || cha === 'n' || cha === 'o' || cha === 'p') {
                    mnopGrp.children.push(obj);
                } else if (cha === 'q' || cha === 'r' || cha === 's' || cha === 't') {
                    qrstGrp.children.push(obj);
                } else if (cha === 'u' || cha === 'v' || cha === 'w' || cha === 'x') {
                    uvwxGrp.children.push(obj);
                } else if (cha === 'y' || cha === 'z') {
                    yzGrp.children.push(obj);
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
                    oneTo9Grp.children.push(obj);
                } else {
                    specialCharGrp.children.push(obj);
                }
            } // end main for loop

          if (name === 'Service') {
            if (protocolRDPGrp.children.length > 0) {
                protocolRDPGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                protocolRDPGrp.name = protocolRDPGrp.name + '(' + protocolRDPGrp.children.length + ')';
                children.children.push(protocolRDPGrp);
            }
            if (protocolHTTPSGrp.children.length > 0) {
                protocolHTTPSGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                protocolHTTPSGrp.name = protocolHTTPSGrp.name + '(' + protocolHTTPSGrp.children.length + ')';
                children.children.push(protocolHTTPSGrp);
            }
            if (protocolHTTPGrp.children.length > 0) {
                protocolHTTPGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                protocolHTTPGrp.name = protocolHTTPGrp.name + '(' + protocolHTTPGrp.children.length + ')';
                children.children.push(protocolHTTPGrp);
            }
            if (protocolFTPGrp.children.length > 0) {
                protocolFTPGrp.children.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                });
                protocolFTPGrp.name = protocolFTPGrp.name + '(' + protocolFTPGrp.children.length + ')';
                children.children.push(protocolFTPGrp);
            }
          }
            if (name === 'Identitie' && unregisteredGrp.children.length > 0) {
                unregisteredGrp.name = unregisteredGrp.name + '(' + unregisteredGrp.children.length + ')';
                children.children.push(unregisteredGrp);
                subGrouping(name, unregisteredGrp);
            }
            if (specialCharGrp.children.length > 0) {
                specialCharGrp.name = specialCharGrp.name + '(' + specialCharGrp.children.length + ')';
                children.children.push(specialCharGrp);
                subGrouping(name, specialCharGrp);
            }
            if (abcdGrp.children.length > 0) {
                abcdGrp.name = abcdGrp.name + '(' + abcdGrp.children.length + ')';
                children.children.push(abcdGrp);
                subGrouping(name, abcdGrp);
            }
            if (efghGrp.children.length > 0) {
                efghGrp.name = efghGrp.name + '(' + efghGrp.children.length + ')';
                children.children.push(efghGrp);
                subGrouping(name, efghGrp);
            }
            if (ijklGrp.children.length > 0) {
                ijklGrp.name = ijklGrp.name + '(' + ijklGrp.children.length + ')';
                children.children.push(ijklGrp);
                subGrouping(name, ijklGrp);
            }
            if (mnopGrp.children.length > 0) {
                mnopGrp.name = mnopGrp.name + '(' + mnopGrp.children.length + ')';
                children.children.push(mnopGrp);
                subGrouping(name, mnopGrp);
            }
            if (qrstGrp.children.length > 0) {
                qrstGrp.name = qrstGrp.name + '(' + qrstGrp.children.length + ')';
                children.children.push(qrstGrp);
                subGrouping(name, qrstGrp);
            }
            if (uvwxGrp.children.length > 0) {
                uvwxGrp.name = uvwxGrp.name + '(' + uvwxGrp.children.length + ')';
                children.children.push(uvwxGrp);
                subGrouping(name, uvwxGrp);
            }
            if (yzGrp.children.length > 0) {
                yzGrp.name = yzGrp.name + '(' + yzGrp.children.length + ')';
                children.children.push(yzGrp);
                subGrouping(name, yzGrp);
            }
            if (oneTo9Grp.children.length > 0) {
                oneTo9Grp.name = oneTo9Grp.name + '(' + oneTo9Grp.children.length + ')';
                children.children.push(oneTo9Grp);
                subGrouping(name, oneTo9Grp);
            }
            return children;
        }

        function processServicePoliciesForTree(
            servicePolicyChildren,
            servicePolicies,
            nx,
            ny
        ) {
          if(args[0]===false) return servicePolicyChildren;

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
           subGrouping('Bind-Policie', bindGrp);
           dialGrp.name = dialGrp.name + '('+ dialGrp.children.length +')';
           servicePolicyChildren.children.push(dialGrp);
           subGrouping('Dial-Policie', dialGrp);
          return servicePolicyChildren;
        }

        function processServicesForTree(
            servicesChildren,
            services,
            nx,
            ny
        ) {
          if(args[1]===false) return servicesChildren;
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
            return grouping('Service', servicesChildren, servicestree);
        } // end of processServicesForTree

        function processEdgeRouterPoliciesForTree(
            edgeRouterPoliciesChildren,
            edgeRouterPolicies,
            nx,
            ny
        ) {
          if(args[4]===false) return edgeRouterPoliciesChildren;
          const policies_Array = [];
            for (let i = nx; i < ny; i++) {
                const erpolicy = new ERPolicy();
                erpolicy.id = createId();
                erpolicy.uuid = edgeRouterPolicies[i].id;
                erpolicy.name = edgeRouterPolicies[i].name;
                erpolicy.type = 'Edge Router Policy';
                erpolicy.rootNode = 'Yes';
                erpolicy.isSystem = edgeRouterPolicies[i].isSystem;
                erpolicy.semantic = edgeRouterPolicies[i].semantic;
                policies_Array.push(erpolicy);
            } // end of main for loop
            return grouping('Edge Router Policies',edgeRouterPoliciesChildren,policies_Array);
        } // end

        function processServiceEdgeRouterPoliciesForTree(
            serviceEdgeRouterPoliciesChildren,
            serviceEdgeRouterPolicies,
            nx,
            ny
        ) {
        if(args[5]===false) return serviceEdgeRouterPoliciesChildren;
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

        function processEdgeRoutersForTree(
            routersChildren,
            edgerouters,
            nx,
            ny
        ) {
        if(args[3]===false) return routersChildren;

            const er_objects = [];
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
                    er_objects.push(erOb);
                }
            } // end main for loop
           // return routersChildren;
           return grouping('Edge Router', routersChildren, er_objects);
        }

        // createId() generates node Id 1,2,3,4,5 for the following five nodes. this id is used to search capability.
        let servicPoliciesChildren = new Children();
        servicPoliciesChildren.id = createId();
        servicPoliciesChildren.firstChild = 'Yes';
        servicPoliciesChildren.name = 'Service Policies('+ service_policies_totalCount +')';

        let servicesChildren = new Children();
        servicesChildren.id = createId();
        servicesChildren.firstChild = 'Yes';
        servicesChildren.name = 'Services('+ services_totalCount +')';

        let identitiesChildren = new Children();
        identitiesChildren.id = createId();
        identitiesChildren.firstChild = 'Yes';
        identitiesChildren.name = 'Identities('+ identities_totalCount +')';

        let edgerouterChildren = new Children();
        edgerouterChildren.id = createId();
        edgerouterChildren.firstChild = 'Yes';
        edgerouterChildren.name = 'Edge Routers('+ edgerouters_totalCount +')';

        let edgeRouterPoliciesChildren = new Children();
        edgeRouterPoliciesChildren.id = createId();
        edgeRouterPoliciesChildren.firstChild = 'Yes';
        edgeRouterPoliciesChildren.name = 'Edge Router Policies('+ edge_router_policies_totalCount +')';

        let serviceEdgeRouterPolicesChildren = new Children();
        serviceEdgeRouterPolicesChildren.id = createId();
        serviceEdgeRouterPolicesChildren.firstChild = 'Yes';
        serviceEdgeRouterPolicesChildren.name = 'Service Edge Router Policies('+ service_router_policies_totalCount +')';

        servicesChildren = processServicesForTree(
            servicesChildren,
            services,
            0,
            services.length
        );

        edgerouterChildren = processEdgeRoutersForTree(
            edgerouterChildren,
            edgerouters,
            0,
            edgerouters.length
        );

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
