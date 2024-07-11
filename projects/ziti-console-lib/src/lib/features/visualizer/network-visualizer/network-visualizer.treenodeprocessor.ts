import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import _ from 'lodash';
import { ServicePolicy, Attribute, Children, Identity, ERouter, ERPolicy, Group, Service } from './network-visualizer.helper';

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
        rawEpAttributes.push('@' + rawEp.name);
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
      const services_url = this.getLinkForResource(rawEp, 'service-policies').replace('./', '');

      const pagesize = 500;
      const services_paging = this.getPagingObject(pagesize);

       const firstPromise =  await zitiService
              .get(services_url, services_paging, [])
              .then( async (result) => {
                identityServicePolicies = result.data;
                  const pages = Math.ceil(result.meta.pagination.totalCount / pagesize);
                  const promises = [];
                  for (let page = 2; page <= pages; page++) {
                    services_paging.page = page;
                    const tmp_promise = await zitiService
                      .get(
                        services_url,
                        services_paging,
                        []
                      )
                      .then((pageResult) => {
                        pageResult.data.forEach((serv) => {
                          identityServicePolicies.push(serv);
                        });
                      });
                    promises.push(tmp_promise);
                    wait_promises.push(tmp_promise);
                  }
                  Promise.all(promises).then( () => {
                    const sub_promises = [];
                    identityServicePolicies.find( async (isp) => {
                      const pagingOb = this.getPagingObject(pagesize);
                      const ser_url = this.getLinkForResource(isp, 'services').replace('./', '');
                       const tmpPromise = await zitiService
                           .get(ser_url, pagingOb, [])
                           .then((result) => {
                               const tmp_services = [];
                                 result.data.find( (re) => {
                                     const serv = new Service();
                                       serv.id = this.createId();
                                       serv.name = re.name;
                                       serv.type = 'Service';
                                       //  tmp_services.push(serv);
                                      if (isp.type === 'Dial') {
                                          dialServices.children.push(serv);
                                       } else {
                                          bindServices.children.push(serv);
                                      }

                                 } );

                           });
                         sub_promises.push(tmpPromise);
                         wait_promises.push(tmpPromise);

                    }); // loop
                      Promise.all(sub_promises).then(() => {
                        if(bindServices.children.length>0) {
                           bindServices.name = 'Bind-Services('+bindServices.children.length+')';
                           identityNode.data.children.push(bindServices);
                        }
                        if(dialServices.children.length>0) {
                           dialServices.name = 'Dial-Services('+dialServices.children.length+')';
                           identityNode.data.children.push(dialServices);
                        }
                      });
                  });
              });
      wait_promises.push(firstPromise);
      Promise.all(wait_promises).then( () => {
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

  addItemToArray(bindIdnetities, ob) {
    if (!bindIdnetities.find((item) => item.uuid === ob.id)) {
       const epOb = new Identity();
        epOb.id = this.createId();
        epOb.uuid = ob.id;
        epOb.name = ob.name;
        epOb.online = ob.hasApiSession === true ? 'Yes' : 'No';
        epOb.type = 'Identity';
        epOb.status = ob.os !== null ? 'Registered' : 'Not Registered';
        epOb.os = ob.os;

      bindIdnetities.push(epOb);
    }
    return bindIdnetities;
  }

  getLinkForResource(ob, resource) {
    return ob['_links'][resource]['href'];
  }

   //Bind Dial Services
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

  async processServicesForNodeClick(serviceNode, networkGraph, services, uniqId, zitiService) {
     const myPromise = await new Promise( async (resolve, reject) => {
        const wait_promises = [];
        this.uniqId = uniqId;
        const rawServiceObj = services.find((s) => s.name === serviceNode.data.name);

        const attributeswithName = [];
        attributeswithName.push('@' + rawServiceObj.name);
        rawServiceObj.roleAttributes && rawServiceObj.roleAttributes.find((srattr) => {
            attributeswithName.push(srattr);
        });
        const serviceAttributes = new Children();
        serviceAttributes.type = 'ServiceAttributes';
        serviceAttributes.id = this.createId();
        for (let k = 0; k < attributeswithName.length; k++) {
            const attrOb = new Attribute();
            attrOb.id = this.createId();
            attrOb.name = attributeswithName[k];
            attrOb.type = 'Service Attribute';

            serviceAttributes.children.push(attrOb);
        } // end inner for loop
        if (serviceAttributes.children.length >0 ) {
           serviceAttributes.name = 'Service Attributes('+ serviceAttributes.children.length + ')';
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
        });
       wait_promises.push(configPromise);
       const service_edge_router_policies_url = this.getLinkForResource(
         rawServiceObj,
        'service-edge-router-policies'
       );
       const service_policies_url = this.getLinkForResource(
        rawServiceObj,
        'service-policies'
       ).replace('./', ''); // dial, Bind info

       let bindPolicies = [];
       let bindIdnetities = [];
       const promise2 = await zitiService
       .get(service_policies_url, pagingOb, [])
       .then((policies) => {
         const identityPromises = [];
         policies.data.forEach( async (policy) => {
          if (policy.type === 'Bind')  {
            const bindIdentitiesUrl = this.getLinkForResource(
              policy,
              'identities'
            );

             const promse = await zitiService
              .get(bindIdentitiesUrl.replace('./', ''), pagingOb, [])
              .then((res) => {
                if (res && res.data.length > 0) {
                  res.data.forEach((rs) => {
                    this.addItemToArray(bindIdnetities, rs);
                  });
                } else {
                  this.addItemToArray(bindIdnetities, res.data);
                }

               });
              identityPromises.push(promse);
              wait_promises.push(promse);
            }
        });
        Promise.all(identityPromises).then(() => {
            const tmp = new Children();
             tmp.name = "Bind Identities(" + bindIdnetities.length +')';
             tmp.type = "Identities";
             tmp.children = bindIdnetities;
             tmp.id = this.createId();
             serviceNode.data.children.push(tmp);
        });
      });

       wait_promises.push(promise2);
       Promise.all(wait_promises).then( () => {
         resolve('this is a promise');
       });
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
          const pagesize = 500;
          const services_paging = this.getPagingObject(pagesize);
       const bindIdentitiesUrl = this.getLinkForResource( rawSPolicy, 'identities' );
       const sp_promise = await zitiService.get(bindIdentitiesUrl, services_paging, [])
       .then((ids) => {
         const childs =new Children()
             childs.name = rawSPolicy.type+ 'Identities';
         childs.id = this.createId();
         ids.data.forEach( (idOb) => {
           const ep = new Identity();
            ep.id = idOb.id;
            ep.name = idOb.name;
            ep.type = 'Identity';
            childs.children.push(ep);
         });
         childs.name = childs.name + '(' + childs.children.length+')';
         policyNode.data.children.push(childs);
       });
       wait_promises.push(sp_promise);
        Promise.all(wait_promises).then( () => {
           resolve('resolve.');
        });

     }); // end mypromise
        networkGraph = d3.hierarchy(networkGraph.data, function (nd) {
            return nd.children;
        });

        return [networkGraph, this.uniqId];
    }

   async processEdgeroutersForNodeClick(
        edgerouterNode,
        networkGraph,
        edgerouters,
        uniqId,
        zitiService
    )
    {
     const mainPromise = await new Promise( async (resolve, reject) => {
        const wait_promises = [];
        this.uniqId = uniqId;
        const er = edgerouters.find((s) => s.name === edgerouterNode.data.name);
        const erAttributes = er.roleAttributes? er.roleAttributes: [];

         erAttributes.find((attr) => {
            const att = new Attribute();
            att.id = this.createId();
            att.name = attr;
            att.type = 'Edge Router Attribute';
            edgerouterNode.data.children.push(att);
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
                erpolChilds.children.push(policy);
             });
               erpolChilds.name = "Edge Router Policies("+ erpolChilds.children.length +')';
               edgerouterNode.data.children.push(erpolChilds);
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
        edgeRouterPolicies,
        uniqId,
        zitiService
    ) {
       const myPromise = await new Promise((resolve, reject) => {
          const wait_promises = [];
          this.uniqId = uniqId;
          const rawERPolicy = edgeRouterPolicies.find((s) => s.name === erPolicyNode.data.name);
          const pagesize = 500;
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
             ids.forEach( (er) => {
                const idOb = new Identity();
                idOb.id = this.createId();
                idOb.uuid = er.id;
                idOb.name = er.name;
                idOb.type = 'Identity';
                idChilds.children.push(idOb);
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
            resolve('this is a promise');
         } );

       });

        networkGraph = d3.hierarchy(networkGraph.data, function (nd) {
            return nd.children;
        });
        return [networkGraph, this.uniqId];
    } // end
} // end of class
