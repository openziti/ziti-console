import {Component, EventEmitter, Inject, Output} from '@angular/core';
import {ProjectableForm} from "../projectable-forms/projectable-form.class";
import {SETTINGS_SERVICE, SettingsService} from "../../services/settings.service";
import {SERVICE_EXTENSION_SERVICE, ServiceFormService} from "../projectable-forms/service/service-form.service";
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../services/ziti-data.service";
import {GrowlerService} from "../messaging/growler.service";
import {ExtensionService} from "../extendable/extensions-noop.service";

@Component({
  selector: 'lib-card-list',
  templateUrl: './card-list.component.html',
  styleUrls: ['./card-list.component.scss']
})
export class CardListComponent extends ProjectableForm {
  formData: any = {};

  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Output() selected: EventEmitter<any> = new EventEmitter<any>();

  constructor(
      @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
      public svc: ServiceFormService,
      @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
      growlerService: GrowlerService,
      @Inject(SERVICE_EXTENSION_SERVICE) private extService: ExtensionService
  ) {
    super(growlerService);
  }
  clear(): void {
  }

  save(): void {
  }

  cardSelected(type) {
    this.selected.emit(type)
  }
}
