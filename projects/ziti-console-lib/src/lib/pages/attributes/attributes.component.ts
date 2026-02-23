import {Component, OnInit, OnDestroy, Inject} from '@angular/core';
import { ZitiDataService, ZITI_DATA_SERVICE } from '../../services/ziti-data.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'lib-attributes',
    templateUrl: './attributes.component.html',
    styleUrls: ['./attributes.component.scss'],
    standalone: false
})
export class AttributesComponent implements OnInit, OnDestroy {
  attributes: any[] = [];
  identities: any[] = [];
  services: any[] = [];
  edgeRouters: any[] = [];
  postureChecks: any[] = [];
  identityAttributes: any[] = [];
  edgeRouterAttributes: any[] = [];
  serviceAttributes: any[] = [];
  selectedAttribute: any = null;

  private subscription = new Subscription();

  constructor(
    @Inject(ZITI_DATA_SERVICE) private zitiDataService: ZitiDataService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
      const promises: Promise<any>[] = [];
      promises.push(this.zitiDataService.get('identities', {}, []).then(data => {
          this.identities = data?.data || [];
      }));
      promises.push(this.zitiDataService.get('services', {}, []).then(data => {
          this.services = data?.data || [];
      }));
      promises.push(this.zitiDataService.get('edge-routers', {}, []).then(data => {
          this.edgeRouters = data?.data || [];
      }));
      promises.push(this.zitiDataService.get('posture-checks', {}, []).then(data => {
          this.postureChecks = data?.data || [];
      }));
      promises.push(this.zitiDataService.get('identity-role-attributes', {}, []).then(data => {
          this.identityAttributes = data?.data || [];
      }));
      promises.push(this.zitiDataService.get('edge-router-role-attributes', {}, []).then(data => {
          this.edgeRouterAttributes = data?.data || [];
      }));
      promises.push(this.zitiDataService.get('service-role-attributes', {}, []).then(data => {
          this.serviceAttributes = data?.data || [];
      }));
      Promise.all(promises).then(() => {
          this.attributesLoaded();
      });
  }

  attributesLoaded() {
      this.attributes = [];
      const attributes = [...this.identityAttributes, ...this.serviceAttributes, ...this.edgeRouterAttributes];
      attributes.forEach(attr => {
          this.attributes.push({
              name: attr,
              identities: this.countOccurrences(this.identities, attr),
              services: this.countOccurrences(this.services, attr),
              postureChecks: this.countOccurrences(this.postureChecks, attr),
              routers: this.countOccurrences(this.edgeRouters, attr)
          })
      });
  }

  calculateAttributes() {
    const allAttributes = new Set<string>();
    [...this.identityAttributes, ...this.serviceAttributes, ...this.edgeRouterAttributes].forEach(item => {
      item.roleAttributes?.forEach(attr => allAttributes.add(attr));
    });

    this.attributes = Array.from(allAttributes).map(attr => ({
      name: attr,
      identities: this.countOccurrences(this.identities, attr),
      services: this.countOccurrences(this.services, attr),
      routers: this.countOccurrences(this.edgeRouters, attr),
      postureChecks: this.countOccurrences(this.postureChecks, attr)
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  countOccurrences(items: any[], attribute: string): number {
    return items.filter(item => item.roleAttributes?.includes(attribute)).length;
  }

  getAssociatedItems(items: any[], attribute: string): string {
    return items.filter(item => item.roleAttributes?.includes(attribute)).map(item => `<li>${item.name}</li>`).join('');
  }

  editAttribute(attributeName: string) {
    this.selectedAttribute = this.attributes.find(attr => attr.name === attributeName);
  }

  closeModal() {
    this.selectedAttribute = null;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
