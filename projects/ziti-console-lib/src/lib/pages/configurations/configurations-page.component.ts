import {Component, OnInit} from '@angular/core';
import {DataTableFilterService} from "../../features/data-table/data-table-filter.service";
import {ConfigurationsPageService} from "./configurations-page.service";
import {TabNameService} from "../../services/tab-name.service";
import {ListPageComponent} from "../../shared/list-page-component.class";
import {CallbackResults} from "../../features/list-page-features/list-page-form/list-page-form.component";
import {SettingsService} from "../../services/settings.service";

@Component({
    selector: 'lib-configurations',
    templateUrl: './configurations-page.component.html',
    styleUrls: ['./configurations-page.component.scss']
})
export class ConfigurationsPageComponent extends ListPageComponent implements OnInit {
    title = 'Configuration Management'
    tabs: { url: string, label: string }[] ;
    formTitle = '';
    formSubtitle = '';
    isLoading: boolean;
    showEditForm = false;
    showButtons = false;
    private schema: any;

    constructor(
        svc: ConfigurationsPageService,
        filterService: DataTableFilterService,
        private tabNames: TabNameService,
    ) {
        super(filterService, svc);
    }

    override ngOnInit() {
        this.tabs = this.tabNames.getTabs('services');
        this.svc.refreshData = this.refreshData;
        super.ngOnInit();
    }

    headerActionClicked(action: string) {
        switch (action) {
            case 'add':
                this.openUpdate();
                break;
            case 'delete':
                this.openBulkDelete()
                break;
            default:
        }
    }

    itemUpdate() {

    }

    tableAction($event: { action: string; item?: any }) {

    }

    private openUpdate(model?: any) {
        if (!model) {
            this.formTitle = 'Create Configuration'
            this.formSubtitle = 'Add a New Configuration by completing this form';
        } else {
            this.formTitle = 'Edit Configuration'
            this.formSubtitle = 'Change Configuration details';
        }
        this.showEditForm = true;
    }

    private openBulkDelete() {

    }

    viewButtons(state: boolean) {
        this.showButtons = state;
    }

    validate = (formData: any): Promise<CallbackResults> => {
        return this.svc.validate(formData, this.schema);
    }

    onSchemaChange(schema: any) {
        this.schema = schema;
    }

}
