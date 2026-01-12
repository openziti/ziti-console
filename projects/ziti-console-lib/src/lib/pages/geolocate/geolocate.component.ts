import {Component, OnInit, OnDestroy, Inject} from '@angular/core';
import {ZITI_DATA_SERVICE, ZitiDataService} from '../../services/ziti-data.service';
import { Subscription } from 'rxjs';
import {GrowlerService} from "../../features/messaging/growler.service";

const { L } = window as any;

@Component({
    selector: 'lib-geolocate',
    templateUrl: './geolocate.component.html',
    styleUrls: ['./geolocate.component.scss'],
    standalone: false
})
export class GeolocateComponent implements OnInit, OnDestroy {
  isLoading = false;
  map: any;
  pageTitle = 'Dashboard';
  totalIdentities = 0;
  totalServices = 0;
  totalConfigs = 0;
  totalEdgeRouters = 0;
  totalServicePolicies = 0;
  totalSessions = 0;
  showVisualizer = false;

  markers = [];

  private subscription = new Subscription();

  edgeRoutersInit = false;
  identitiesInit = false;

  constructor(
      @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
      private growlerService: GrowlerService,
  ) {}

  ngOnInit(): void {
    this.map = L.map('MainMap', { zoomControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; NetFoundry Inc.'
    }).addTo(this.map);
    this.map.setView(new L.LatLng(41.850033, -87.6500523), 4);

    this.loadEntityCounts();
    this.checkVisualizerFeature();
    this.loadMapData();
  }

  loadEntityCounts() {
    this.isLoading = true;
    const paging = {
      searchOn: 'name',
      filter: '',
      total: 1,
      page: 1,
      sort: 'name',
      order: 'asc'
    };
    const summaryPromise = this.zitiService.get('summary', paging, []);

    summaryPromise.then((result: any) => {
      const data = result?.data || [];
      this.totalIdentities = data['identities'];
      this.totalEdgeRouters = data['routers.edge'];
      this.totalServices = data['services'];
      this.totalConfigs = data['configs'];
      this.totalServicePolicies = data['servicePolicies'];
      this.totalSessions = data['sessions'];
    }).finally(() => {
      this.isLoading = false;
    });
  }

  loadMapData() {
    this.markers = [];
    const paging = {
      searchOn: 'name',
      filter: '',
      total: 1000,
      page: 1,
      sort: 'name',
      order: 'asc'
    };
    const identitiesPromise = this.zitiService.get('identities', paging, []).then((result) => {
      this.identitiesInit = true;
      this.addMarkers(result?.data, 'identity');
    });
    const routersPromise = this.zitiService.get('routers', paging, []);
    const edgeRoutersPromise = this.zitiService.get('edge-routers', paging, [])
    Promise.all([edgeRoutersPromise, routersPromise]).then((results) => {
      this.edgeRoutersInit = true;
      const routers = results[0].data || [];
      const edgeRouters = results[1].data || [];
      const rows = [...routers, ...edgeRouters];
      this.addMarkers(rows, 'routers');
    });
  }

  addMarkers(data: any[], type: string) {
    const iconUrl = type === 'identity' ? '/assets/svgs/identity-marker.svg' : '/assets/svgs/router-marker.svg';
    const icon = L.icon({
      iconUrl,
      iconRetinaUrl: iconUrl,
      shadowUrl: '/assets/scripts/components/leaflet/images/marker-shadow.png',
      iconSize: [40, 60],
      iconAnchor: [20, 54],
      popupAnchor: [0, -50],
      tooltipAnchor: [16, -28],
      shadowSize: [62, 62]
    });

    const markers = [];
    for (const item of data) {
      if (item.tags?.geolocation) {
        const [lat, lng] = item.tags.geolocation.split(',');
        if (!isNaN(lat) && !isNaN(lng)) {
          const marker = L.marker([lat, lng], { icon }).addTo(this.map).bindPopup(item.name);
          markers.push(marker);
        }
      }
    }
    this.markers = [...this.markers, ...markers]
    if (this.edgeRoutersInit && this.identitiesInit && markers.length > 0) {
      const group = new L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds());
    }
  }

  checkVisualizerFeature() {
    const urlParams = new URLSearchParams(window.location.search);
    this.showVisualizer = urlParams.get('feature') === 'visualizer';
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
