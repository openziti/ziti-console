import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import _ from 'lodash';
import { ServicePolicy, Attribute, Children, Identity, ERouter, ERPolicy, Group, Service, Config } from './network-visualizer.helper';

@Injectable({
    providedIn: 'root',
})
export class TreeNodeProcessor {
    uniqId = 0;
    getPagingObject(pagesize) {
      const paging = {
        searchOn: 'name',
        noSearch: false,
        filter: '',
        total: pagesize,
        page: 1,
        sort: 'name',
        order: 'asc',
      };
      return  paging;
    }

    async processIdentitiesForNodeClick(
        identityNode,
        networkGraph,
        rawEndpoints,
        uniqId,
        zitiService,
        configs
    ) {
    const myPromise = await new Promise( async (resolve, reject) => {
       const wait_promises = [];
        this.uniqId = uniqId;
        const rawEp = this.findRawEndpoint(identityNode.data.name, rawEndpoints);
        let rawEpAttributes = [];
        if (rawEp.roleAttributes) {rawEpAttributes = rawEp.roleAttributes};
        // rawEpAttributes.push('@' + rawEp.name);
        for (let i = 0; i < rawEpAttributes.length; i++) {
                    const attribute = new Attribute();
                    attribute.id = this.createId();
                    attribute.name = rawEpAttributes[i];
                    attribute.type = 'Identity Attribute';
                    identityNode.data.children.push(attribute);
                }

      const bindServices = new Children();
      const dialServices = new Children();
      bindServices.id = this.createId();
      dialServices.id = this.createId();
      let identityServicePolicies = [];
      const pagesize = 500;
    // fetch associated routers
      const url = this.getLinkForResource(rawEp, 'edge-routers').replace('./', '');
      let associatedRouters = [];
      const paging = this.getPagingObject(pagesize);
      const erChailds = new Children();
        erChailds.name= 'Associated Routers';
        erChailds.type= 'Associated Routers';
      const associatedRoutersPromise =  await zitiService.get(url, paging, [])
           .then( (result) => {
             result.data.forEach( (re) => {
               const tmp = new ERouter();
                   tmp.id = this.createId();
                   tmp.name = re.name;
                   tmp.type = 'Router';
                   erChailds.children.push(tmp);
             } );
      });

      const policies_url = this.getLinkForResource(rawEp, 'service-policies').replace('./', '');
      const policies_paging = this.getPagingObject(pagesize);
      const firstPromise =  await zitiService
              .get(policies_url, policies_paging, [])
              .then((result) => {
                identityServicePolicies = result.data;
               });

        const promises = [];
        identityServicePolicies.forEach( (sp) => {
             const nodeArray =  this.getServicesForAServicePolicy(sp, zitiService, 500);
             promises.push(nodeArray);
        });

        await Promise.all(promises).then( (nodeArray) => {
             nodeArray.forEach( (arOb) => {
              if(arOb[0] === 'Bind' ) {
                 bindServices.children = this.arrayObjectCopyRightToLeft(bindServices.children, arOb[1]);
              } else {
                 dialServices.children = this.arrayObjectCopyRightToLeft(dialServices.children, arOb[1]);
              }
             } );
        });

      Promise.all(wait_promises).then( () => {
        if (erChailds.children.length >0 ) {
             erChailds.name = erChailds.name+'('+erChailds.children.length+')';
             identityNode.data.children.push(erChailds);
        }
        if(bindServices.children.length>0) {
              bindServices.name = 'Bind-Services('+bindServices.children.length+')';
              identityNode.data.children.push(bindServices);
        }
        if(dialServices.children.length>0) {
              dialServices.name = 'Dial-Services('+dialServices.children.length+')';
              identityNode.data.children.push(dialServices);
        }
        resolve('this is a promise');
      });

    });

     networkGraph = d3.hierarchy(networkGraph.data, function (nd) {
          return nd.children;
     });
         return [networkGraph, this.uniqId];
    } // end of function

    createId() {
        ++this.uniqId;
        return this.uniqId;
    }

   createServiceNode( sr) {
        const serviceOb = new Service();
         serviceOb.id = this.createId();
         serviceOb.uuid = sr.id;
         serviceOb.name = sr.name;
         serviceOb.type = 'Service';
       return serviceOb;
   }

   arrayObjectCopyRightToLeft(leftArr,rightArr) {
     const leftArrIds = [];
     leftArr.forEach( (ob) => {
       leftArrIds.push(ob.id);
     } );

     rightArr.forEach( (ob) => {
      if (!leftArr.includes(ob.id)) {
           leftArr.push(ob);
      }
     } );

    return leftArr;
   }

  addItemToArray(Idnetities, ob) {
    if ( ob.name && !Idnetities.find((item) => item.uuid === ob.id)) {
      Idnetities.push(this.createIdentity(ob));
    }
    return Idnetities;
  }
  createIdentity(ob) {
      const endpoint = new Identity();
       endpoint.id = this.createId();
       endpoint.uuid = ob.id;
       endpoint.name = ob.name;
       endpoint.online = ob.hasApiSession === true ? 'Yes': 'No';
       endpoint.type = 'Identity';
       endpoint.status = ob.sdkInfo !== null ? 'Registered': 'Not Registered';
       if (ob.sdkInfo) {
           endpoint.os = ob.sdkInfo.type? ob.sdkInfo.type: ob.sdkInfo.appId;
           endpoint.osVersion = ob.sdkInfo.version;
       }
       if (ob.authPolicy && ob.authPolicy.name.includes("BrowZer")) {
           endpoint.type = 'BrowZer Identity';
       }
       endpoint.createdAt = ob.createdAt;
       endpoint.updatedAt = ob.updatedAt;

     return endpoint;
  }
  getLinkForResource(ob, resource) {
    return ob['_links'][resource]['href'];
  }

    findServicesHostedOnEndpoint(rawEp, services, servicePolicies, zitiService) {
       const servicesArr = [];
        const childrenNoGroups = [];
        const endpointAttr = rawEp.roleAttributes? rawEp.roleAttributes: [];
        endpointAttr.push('@'+rawEp.id);

        let dialServiceAttrs = [];
        let bindServiceAttrs = [];

        const bindPolicies = new Children();
           bindPolicies.name = 'Bind-Policies';
        const dialPolicies = new Children();
            dialPolicies.name = 'Dial-Policies';

        bindPolicies.id = this.createId();
        dialPolicies.id = this.createId();

        servicePolicies.find( (sp) => {
          sp.identityRoles.find( (attr) => {
              if (endpointAttr.includes(attr) ) {
               if (sp.type === 'Bind') {
                   const sPolicy = new ServicePolicy();
                         sPolicy.id = this.createId();
                         sPolicy.name = sp.name;
                         sPolicy.type = sp.type;
                         sPolicy.children = this.getServicesForPolicy(services, sp);
                   bindPolicies.children.push(sp);
                   bindServiceAttrs = fillArray(bindServiceAttrs, sp.serviceRoles);
               } else {
                 const sPolicy = new ServicePolicy();
                     sPolicy.id = this.createId();
                     sPolicy.name = sp.name;
                     sPolicy.type = sp.type;
                     sPolicy.children = this.getServicesForPolicy(services, sp) ;
                 dialPolicies.children.push(sPolicy);
                dialServiceAttrs = fillArray(dialServiceAttrs, sp.serviceRoles);
               }
              }
          });
        } );

        function fillArray(arr1, arr2) {
          arr2.forEach( (item) => {
           arr1.push(item);
          } );
          return arr1;
        }

        const bindServices = [];
        const dialServices = [];

        services && services.forEach( (sr) => {
          sr.roleAttributes && sr.roleAttributes.forEach( (attr) => {
             if (dialServiceAttrs.includes(attr) ) {
               dialServices.push(this.createServiceNode(sr) );
             }
             if (bindServiceAttrs.includes(attr) ) {
                bindServices.push( this.createServiceNode(sr) );
             }
          } );
        });
       if (dialServices.length >0 ) {
          const dialGroup = new Children();
          dialGroup.id = this.createId();
          dialGroup.name = 'Services-Dial';
          dialGroup.children = dialServices;
          servicesArr.push(dialGroup);
       }
       if (bindServices.length >0 ) {
            const bindGroup = new Children();
            bindGroup.id = this.createId();
            bindGroup.name = 'Services-Bind';
            bindGroup.children = bindServices;
            servicesArr.push(bindGroup);
       }
     return servicesArr;


    } // end of find servicesHostedOnEndpoint

   getServicesForPolicy(services, spOb) {
     const servicesFotPolicy = [];
     services && services.forEach( (sr) => {
         const attrs = sr.roleAttributes ? sr.roleAttributes: [];
         attrs.push('@'+spOb.id);
         attrs.find( (atr) => {
            if(spOb.serviceRoles.includes(atr) ){
               const serviceNode = new Service();
               serviceNode.id = this.createId();
               serviceNode.name = sr.name;
               serviceNode.type = 'Service';
             servicesFotPolicy.push(serviceNode);
            }
         });
     });
    return servicesFotPolicy;
   }

    findRawEndpoint(epName, endpoints) {
       return endpoints.find((ep) => ep.name === epName);
    }

  serviceConfigAlias(configs) {
     let intercept = [];
     _.isArray(configs) && configs.forEach( (conf) => {
           let addresses = '';
           let ports = '';
          if (conf.data.addresses) {
             addresses = conf.data.addresses.toString();
          } else {
             addresses = conf.data.address;
          }

          if (_.isArray(conf.data.portRanges) ) {
              conf.data.portRanges.forEach( (portsJson) => {
               for (const key in portsJson) {
                  ports = ports + key +':'+portsJson[key] +' ' ;
               }
                 ports = ports + ';';
             });
          } else {
              ports =  conf.data.port;
          }
          intercept.push(addresses);
          intercept.push(ports);
     });
     return intercept;
  }

  async processServicesForNodeClick(serviceNode, networkGraph, services, uniqId, zitiService) {
     const myPromise = await new Promise( async (resolve, reject) => {
        const wait_promises = [];
        this.uniqId = uniqId;
        const rawServiceObj = services.find((s) => s.name === serviceNode.data.name);
        const attributeswithName = [];

        rawServiceObj.roleAttributes && rawServiceObj.roleAttributes.find((srattr) => {
            attributeswithName.push(srattr);
        });
        const serviceAttributes = new Children();
        serviceAttributes.name = 'Attributes';
        serviceAttributes.type = 'Attributes';
        serviceAttributes.id = this.createId();
        for (let k = 0; k < attributeswithName.length; k++) {
            const attrOb = new Attribute();
            attrOb.id = this.createId();
            attrOb.name = attributeswithName[k];
            attrOb.type = 'Attribute';

            serviceAttributes.children.push(attrOb);
        } // end inner for loop
        if (serviceAttributes.children.length >0 ) {
           serviceAttributes.name = serviceAttributes.name+'('+ serviceAttributes.children.length + ')';
           serviceNode.data.children.push(serviceAttributes);
        }

        let service_configs = [];
        const configs_url = this.getLinkForResource(rawServiceObj, 'configs');
        const pagesize = 500;
        const pagingOb = this.getPagingObject(pagesize);
        const configPromise = await zitiService
         .get(configs_url, pagingOb, [])
         .then((configs) => {
           service_configs = configs && configs.data ? configs.data : [];
           const childs = new Children();
           childs.name = 'Service Configs';
           childs.type = 'Service Configs';
           service_configs.forEach( (cfg) => {
             const obj = new Config();
             obj.name = cfg.name;
             obj.uuid = cfg.uuid;
             obj.data = JSON.stringify(cfg.data);
             childs.children.push(obj);
           } );
           if (childs.children.length >0 ) {
              childs.name = childs.name +'('+childs.children.length + ')';
              serviceNode.data.children.push(childs);
              serviceNode.data.intercept = this.serviceConfigAlias(service_configs);
           }
        });

       wait_promises.push(configPromise);
       const service_edge_router_policies_url = this.getLinkForResource(
         rawServiceObj,
        'service-edge-router-policies'
       );
       let service_routers_urls = [];
       const ser_promse =  await zitiService
             .get(service_edge_router_policies_url.replace('./', ''), pagingOb, [])
             .then( (result) => {
                  result.data.forEach( (serp) => {
                    service_routers_urls.push( this.getLinkForResource(serp,'edge-routers') );
                  } );;
             });
       wait_promises.push(ser_promse);
       let serp_page_Promises = [];
       service_routers_urls.forEach((er_url) => {
          const promse =  zitiService
                .get(er_url.replace('./', ''), pagingOb, []);
                // .then(result => [policy.type, result]);
          serp_page_Promises.push(promse);
       });
       let associatedRouters = [];
       await Promise.all(serp_page_Promises).then( (values:any) => {
         values && values.forEach((res:any) => {
             if (res && res.data.length > 0) {
                res.data.forEach( (er)=> {
                  const erOb = new ERouter();
                        erOb.name =   er.name;
                        er.type = 'Router';
                  associatedRouters.push(erOb);
                });
             }
         })
         const tmp = new Children();
             tmp.name = "Associated Routers(" + associatedRouters.length +')';
             tmp.type = "Routers";
             tmp.children = associatedRouters;
             tmp.id = this.createId();
             serviceNode.data.children.push(tmp);
       });

       const service_policies_url = this.getLinkForResource(
        rawServiceObj,
        'service-policies'
       ).replace('./', ''); // dial, Bind info

       let bindPolicies = [];
       let bindIdnetities = [];
       let dialIdnetities = [];

       const promise2 = await zitiService
       .get(service_policies_url, pagingOb, [])
       .then((policies) => {
         bindPolicies = policies.data;
      });

      const pagePromises = [];
      bindPolicies.forEach(  (policy) => {
         const bindIdentitiesUrl = this.getLinkForResource(
            policy,
            'identities'
          );
          const promse =  zitiService
                .get(bindIdentitiesUrl.replace('./', ''), pagingOb, [])
                .then(result => [policy.type, result]);
          pagePromises.push(promse);
      });
      await Promise.all(pagePromises).then( (values:any) => {
          values && values.forEach((res:any) => {
           if (res && res[1].data.length > 0) {
              res[1].data.forEach((rs) => {
                if(res[0] === 'Bind') {
                 bindIdnetities = this.addItemToArray(bindIdnetities, rs);
                } else if(res[0] === 'Dial'){
                 dialIdnetities = this.addItemToArray(dialIdnetities, rs);
                }
              });
           } else {
               if(res[0] === 'Bind') {
                 bindIdnetities = this.addItemToArray(bindIdnetities, res[1].data);
               } else if(res[0] === 'Dial'){
                 dialIdnetities = this.addItemToArray(dialIdnetities, res[1].data);
               }
           }

          });

           const tmp = new Children();
             tmp.name = "Bind Identities(" + bindIdnetities.length +')';
             tmp.type = "Identities";
             tmp.children = bindIdnetities;
             tmp.id = this.createId();
             serviceNode.data.children.push(tmp);
           const tmpDial = new Children();
             tmpDial.name = "Dial Identities(" + dialIdnetities.length +')';
             tmpDial.type = "Identities";
             tmpDial.children = dialIdnetities;
             tmpDial.id = this.createId();
             serviceNode.data.children.push(tmpDial);
         resolve('this is a promise');
      });
       Promise.all(wait_promises).then( () => { });
    }); // end of mypromise

     networkGraph = d3.hierarchy(networkGraph.data, function (nd) {
        return nd.children;
     });
      return [networkGraph, this.uniqId];
  } // end of processServicesForNodeClick


  async processServicePoliciesForNodeClick(policyNode, networkGraph,  servicePolicies, uniqId, zitiService) {

     const myPromise = await new Promise( async (resolve, reject) => {
        const wait_promises = [];
        this.uniqId = uniqId;
        const rawSPolicy = servicePolicies.find((s) => s.name === policyNode.data.name);
        const childs = new Children();
         childs.name = "Attributes";

        rawSPolicy.serviceRoles && rawSPolicy.serviceRoles.forEach( (ob) => {
          const attr = new Attribute();
            attr.name = ob;
            attr.type = "Service Attribute";
          childs.children.push(attr);
        });
        rawSPolicy.identityRoles && rawSPolicy.identityRoles.forEach( (ob) => {
          const attr = new Attribute();
           attr.name = ob;
           attr.type = "Identity Attribute";
          childs.children.push(attr);
        });
        childs.name = childs.name + '('+ childs.children.length + ')';
         policyNode.data.children.push(childs);

        const pagesize = 500;
        const identities_paging = this.getPagingObject(pagesize);
        const bindIdentitiesUrl = this.getLinkForResource( rawSPolicy, 'identities' );
        const sp_promise = await zitiService.get(bindIdentitiesUrl, identities_paging, [])
       .then((ids) => {
         const childs =new Children()
         childs.name = rawSPolicy.type+ '-Identities';
         childs.id = this.createId();
         ids.data.forEach( (idOb) => {
           childs.children.push(this.createIdentity(idOb) );
         });
         childs.name = childs.name + '(' + childs.children.length+')';
         policyNode.data.children.push(childs);
       });
       wait_promises.push(sp_promise);

       const services_paging = this.getPagingObject(pagesize);
       const bindServicesUrl = this.getLinkForResource( rawSPolicy, 'services' );  // pull services
       const _promise = await zitiService.get(bindServicesUrl, services_paging, [])
       .then((result) => {
         const childs =new Children()
             childs.name = rawSPolicy.type+ '-Services';
         childs.id = this.createId();
         result.data.forEach( (idOb) => {
           const sp = new Service();
            sp.id = idOb.id;
            sp.name = idOb.name;
            sp.type = 'Service';
            childs.children.push(sp);
         });
         childs.name = childs.name + '(' + childs.children.length+')';
         policyNode.data.children.push(childs);
       });

       wait_promises.push(_promise);

        Promise.all(wait_promises).then( () => {
           resolve('resolve.');
        });

     }); // end mypromise
        networkGraph = d3.hierarchy(networkGraph.data, function (nd) {
            return nd.children;
        });

        return [networkGraph, this.uniqId];
    }

   async getServicesForAServicePolicy(policyObject, zitiService, pagesize=500) {
       const childs = [];
       const services_paging = this.getPagingObject(pagesize);
       const bindServicesUrl = this.getLinkForResource( policyObject, 'services' );
       const _promise = await zitiService.get(bindServicesUrl, services_paging, [])
       .then((result) => {
         result.data.forEach( (idOb) => {
           const sp = new Service();
            sp.id = idOb.id;
            sp.name = idOb.name;
            sp.type = 'Service';
            childs.push(sp);
         });
       });
       return [policyObject.type, childs];
   }

   async processEdgeroutersForNodeClick(
        routerNode,
        networkGraph,
        routers,
        uniqId,
        zitiService
    )
    {
     const mainPromise = await new Promise( async (resolve, reject) => {
        const wait_promises = [];
        this.uniqId = uniqId;
        const er = routers.find((s) => s.name === routerNode.data.name);
        const erAttributes = er.roleAttributes? er.roleAttributes: [];

         erAttributes.find((attr) => {
            const att = new Attribute();
            att.id = this.createId();
            att.name = attr;
            att.type = 'Edge Router Attribute';
            routerNode.data.children.push(att);
         });
          const pagesize = 500;
          const services_paging = this.getPagingObject(pagesize);
       const erpoliciesUrl = this.getLinkForResource(er, 'edge-router-policies');
       let erpoliciesForER = [];
       const erpoliciespromise = await zitiService.get(erpoliciesUrl, services_paging, [])
       .then( async (result) => {
          erpoliciesForER = result.data;
          const pages = Math.ceil(result.meta.pagination.totalCount / pagesize);
          const promises = [];
           for (let page = 2; page <= pages; page++) {
              services_paging.page = page;
              const tmp_promise = await zitiService.get(
                               erpoliciesUrl,
                               services_paging,
                               []
                ) .then((pageResult) => {
                  pageResult.data.forEach((serv) => {
                    erpoliciesForER.push(serv);
                  });
                });
              promises.push(tmp_promise);
              wait_promises.push(tmp_promise);
           } // end for loop
           Promise.all(promises).then(() => {
             const erpolChilds = new Children();
             erpolChilds.id = this.createId();
             erpoliciesForER.forEach( (pol) => {
                const policy = new ERPolicy();
                policy.id = this.createId();
                policy.uuid = pol.id;
                policy.name = pol.name;
                policy.type = 'Router Policy';
                policy.isSystem = pol.isSystem;
                policy.semantic = pol.semantic;
                policy.rootNode = 'No';
                erpolChilds.children.push(policy);
             });
               erpolChilds.name = "Router Policies("+ erpolChilds.children.length +')';
               routerNode.data.children.push(erpolChilds);
           });
       });
       wait_promises.push(erpoliciespromise);

       Promise.all(wait_promises).then( () => {
          resolve('this is a promise');
       });
     });
        networkGraph = d3.hierarchy(networkGraph.data, function (nd) {
            return nd.children;
        });
        return [networkGraph, this.uniqId];
   }

    serviceGrouping(servicesChildren, servicestree) {
        const protocolRDPGrp = new Group(
            this.createId(),
            'Services [protocol-RDP]',
            'Services created for RDP protocol'
        );
        const protocolHTTPSGrp = new Group(
            this.createId(),
            'Services [protocol-HTTPS]',
            'Service created for HTTPS protocol'
        );
        const protocolHTTPGrp = new Group(
            this.createId(),
            'Services [protocol-HTTP]',
            'Service created for HTTP protocol'
        );
        const protocolFTPGrp = new Group(
            this.createId(),
            'Services [protocol-FTP]',
            'Service created for FTP protocol'
        );

        const abcdGrp = new Group(this.createId(), 'Services [A-D]', 'Service name starts with A to D');
        const efghGrp = new Group(this.createId(), 'Services [E-H]', 'Service name starts with E to H');
        const ijklGrp = new Group(this.createId(), 'Services [I-L]', 'Service name starts with I to L');
        const mnopGrp = new Group(this.createId(), 'Services [M-P]', 'Service name starts with M to P');
        const qrstGrp = new Group(this.createId(), 'Services [G-T]', 'Service name starts with Q to T');
        const uvwxGrp = new Group(this.createId(), 'Services [U-X]', 'Service name starts with U to X');
        const yzGrp = new Group(this.createId(), 'Services [Y-Z]', 'Service name starts with Y and Z');
        const oneTo9Grp = new Group(this.createId(), 'Services [1-9]', 'Service name starts with 0 to 9');

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
            }
        } // end main for loop

        if (protocolRDPGrp.children.length > 0) {
            protocolRDPGrp.children.sort(function (a, b) {
                return a.name.localeCompare(b.name);
            });
            protocolRDPGrp.name = protocolRDPGrp.name + '(' + protocolRDPGrp.children.length + ')';
            servicesChildren.children.push(protocolRDPGrp);
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

    async processEdgeRouterPoliciesForNodeClick(
        erPolicyNode,
        networkGraph,
        routerPolicies,
        uniqId,
        zitiService
    ) {
       const myPromise = await new Promise(async (resolve, reject) => {
          const wait_promises = [];
          this.uniqId = uniqId;
          const rawERPolicy = routerPolicies.find((s) => s.name === erPolicyNode.data.name);
          const pagesize = 500;

      const er_url = this.getLinkForResource(rawERPolicy, 'edge-routers').replace('./', '');
      let associatedRouters = [];
      const paging = this.getPagingObject(pagesize);
      const erChailds = new Children();
        erChailds.name= 'Associated Routers';
        erChailds.type= 'Associated Routers';
      const associatedRoutersPromise =  await zitiService.get(er_url, paging, [])
           .then( (result) => {
             result.data.forEach( (er) => {
               const tmp = new ERouter();
                   tmp.id = this.createId();
                   tmp.name = er.name;
                   tmp.type = 'Router';
                   tmp.verified = er.isVerified? 'Yes': 'No';
                   tmp.online = er.isOnline? 'Yes': 'No';
                   tmp.disabled = er.disabled? 'Yes': 'No';
                   tmp.rootNode = 'Yes';
                   tmp.tunnelerEnabled = er.tunnelerEnabled? er.tunnelerEnabled:'No';
                   tmp.syncStatus = er.syncStatus? er.syncStatus: 'No';
                   tmp.createdAt = er.createdAt;
                   tmp.updatedAt = er.updatedAt;
                   erChailds.children.push(tmp);
             } );
           erChailds.name = erChailds.name +'('+ erChailds.children.length +')';
           erPolicyNode.data.children.push(erChailds);
      });
          wait_promises.push(associatedRoutersPromise);


          const services_paging = this.getPagingObject(pagesize);
          const url = this.getLinkForResource(rawERPolicy, 'identities');
          let ids = [];
          const idpromise = zitiService.get(url, services_paging, [])
          .then((result) => {
            ids = result.data;
            const pages = Math.ceil(result.meta.pagination.totalCount / pagesize);
            const promises = [];
            for (let page = 2; page <= pages; page++) {
              services_paging.page = page;
              const tmp_promise = zitiService.get(
                               url,
                               services_paging,
                               []
                ) .then((pageResult) => {
                  pageResult.data.forEach((serv) => {
                    ids.push(serv);
                  });
                });
              promises.push(tmp_promise);
              wait_promises.push(tmp_promise);
            } // end for loop
            Promise.all(promises).then(() => {
             const idChilds = new Children();
             idChilds.id = this.createId();
             ids.forEach( (idOb) => {
                idChilds.children.push(this.createIdentity(idOb));
             });
              idChilds.name = "Accessible Identities("+ idChilds.children.length +')';
               erPolicyNode.data.children.push(idChilds);
             });
          });
         wait_promises.push(idpromise);
         Promise.all(wait_promises).then( () => {
             resolve('this is a promise');
         } );

       });

        networkGraph = d3.hierarchy(networkGraph.data, function (nd) {
            return nd.children;
        });

        return [networkGraph, this.uniqId];
    } // end

  async processServiceEdgeRouterPoliciesForNodeClick(
        serviceErPolicyNode,
        networkGraph,
        serviceEdgeRouterPolicies,
        uniqId,
        zitiService
    ) {
       const myPromise = await new Promise((resolve, reject) => {
          this.uniqId = uniqId;
          const wait_promises = [];
          const rawServiceERPolicy = serviceEdgeRouterPolicies.find((s) => s.name === serviceErPolicyNode.data.name);
          const pagesize = 500;
          const services_paging = this.getPagingObject(pagesize);
          const url = this.getLinkForResource(rawServiceERPolicy, 'edge-routers');
          let routers = [];
          const erpromise = zitiService.get(url, services_paging, [])
          .then((result) => {
            routers = result.data;
            const pages = Math.ceil(result.meta.pagination.totalCount / pagesize);
            const promises = [];
            for (let page = 2; page <= pages; page++) {
              services_paging.page = page;
              const tmp_promise = zitiService.get(
                               url,
                               services_paging,
                               []
                ) .then((pageResult) => {
                  pageResult.data.forEach((serv) => {
                    routers.push(serv);
                  });
                });
              promises.push(tmp_promise);
              wait_promises.push(tmp_promise);
            } // end for loop
            Promise.all(promises).then(() => {
             const erChilds = new Children();
             erChilds.id = this.createId();
             routers.forEach( (er) => {
                const idOb = new ERouter();
                idOb.id = this.createId();
                idOb.uuid = er.id;
                idOb.name = er.name;
                idOb.type = 'Edge Router';
                erChilds.children.push(idOb);
             });
               erChilds.name = "EdgeRouters("+ erChilds.children.length +')';
               serviceErPolicyNode.data.children.push(erChilds);
             });
          });
         wait_promises.push(erpromise);

          const services_pagingB = this.getPagingObject(pagesize);

          const urlB = this.getLinkForResource(rawServiceERPolicy, 'services');
          let serArray = [];
          const serpromise = zitiService.get(urlB, services_pagingB, [])
          .then((result) => {
            serArray = result.data;
            const pages = Math.ceil(result.meta.pagination.totalCount / pagesize);
            const promisesB = [];
            for (let page = 2; page <= pages; page++) {
              services_pagingB.page = page;
              const tmp_promiseB = zitiService.get(
                               urlB,
                               services_pagingB,
                               []
                ) .then((pageResult) => {
                  pageResult.data.forEach((serv) => {
                    serArray.push(serv);
                  });
                });
              promisesB.push(tmp_promiseB);
              wait_promises.push(tmp_promiseB);
            } // end for loop
            Promise.all(promisesB).then(() => {
             const srChilds = new Children();
             srChilds.id = this.createId();
             serArray.forEach( (sr) => {
                const srOb = new Service();
                srOb.id = this.createId();
                srOb.uuid = sr.id;
                srOb.name = sr.name;
                srOb.type = 'Service';
                srChilds.children.push(srOb);
             });
              srChilds.name = "Services("+ srChilds.children.length +')';
              serviceErPolicyNode.data.children.push(srChilds);
             });
          });
         wait_promises.push(serpromise);

         Promise.all(wait_promises).then( () => {
            resolve('Done');
         } );

       });

        networkGraph = d3.hierarchy(networkGraph.data, function (nd) {
            return nd.children;
        });
        return [networkGraph, this.uniqId];
    } // end
} // end of class
