/*
    Copyright NetFoundry Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

import {APP_INITIALIZER, InjectionToken, Injector, NgModule} from '@angular/core';
import {ZacWrapperComponent} from "./features/wrappers/zac-wrapper.component";
import {SafePipe} from "./safe.pipe";
import {HttpClientModule, HttpClient} from "@angular/common/http";
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {ZacRoutingModule} from "./zac-routing.module";
import {ExtendableComponent} from "./features/extendable/extendable.component";
import {ExtensionsNoopService, SHAREDZ_EXTENSION} from "./features/extendable/extensions-noop.service";
import {StringInputComponent} from './features/dynamic-widgets/string/string-input.component';
import {NumberInputComponent} from './features/dynamic-widgets/number/number-input.component';
import {BooleanToggleInputComponent} from './features/dynamic-widgets/boolean/boolean-toggle-input.component';
import {ObjectComponent} from './features/dynamic-widgets/object/object.component';
import {SelectorInputComponent} from './features/dynamic-widgets/selector/selector-input.component';
import {CheckboxListInputComponent} from './features/dynamic-widgets/checkbox-list/checkbox-list-input.component';
import {TextListInputComponent} from "./features/dynamic-widgets/text-list/text-list-input.component";
import {ChipsModule} from "primeng/chips";
import {DropdownModule} from 'primeng/dropdown';
import {CalendarModule} from 'primeng/calendar';
import {QRCodeModule} from 'angularx-qrcode';
import {
    ProtocolAddressPortInputComponent
} from './features/dynamic-widgets/protocol-address-port/protocol-address-port-input.component';
import {SideToolbarComponent} from './features/sidebars/side-toolbar/side-toolbar.component';
import {SideNavbarComponent} from './features/sidebars/side-navbar/side-navbar.component';
import {SideBannerComponent} from './features/sidebars/side-banner/side-banner.component';
import {PasswordInputComponent} from './features/dynamic-widgets/password/password-input.component';
import {ConfigurationsPageComponent} from './pages/configurations/configurations-page.component';
import {ListPageHeaderComponent} from './features/list-page-features/list-page-header/list-page-header.component';
import {RegularPageHeaderComponent} from './features/regular-page-features/regular-page-header/regular-page-header.component';
import {MatDialogModule} from "@angular/material/dialog";
import {MatRadioModule} from '@angular/material/radio';
import {TerminatorFormComponent} from "./features/projectable-forms/terminator/terminator-form.component";
import {ListPageFormComponent} from './features/list-page-features/list-page-form/list-page-form.component';
import {DataTableComponent} from "./features/data-table/data-table.component";
import {TableCellSelectComponent} from "./features/data-table/cells/table-cell-select/table-cell-select.component";
import {TableColumnSelectComponent} from "./features/data-table/column-headers/table-column-select/table-column-select.component";
import {TableCellMenuComponent} from "./features/data-table/cells/table-cell-menu/table-cell-menu.component";
import {TableColumnMenuComponent} from "./features/data-table/column-headers/table-column-menu/table-column-menu.component";
import {TableColumnDefaultComponent} from "./features/data-table/column-headers/table-column-default/table-column-default.component";
import {TableColumnFilterComponent} from "./features/data-table/column-headers/table-column-filter/table-column-filter.component";
import {HiddenColumnsBarComponent} from "./features/data-table/table-hidden-columns-bar/hidden-columns-bar.component";
import {FilterBarComponent} from "./features/data-table/table-filter-bar/filter-bar.component";
import {AgGridModule} from "ag-grid-angular";
import {ImportPageComponent} from "./pages/import/import-page.component";
import {ExportPageComponent} from "./pages/export/export-page.component";
import {IdentitiesPageComponent} from "./pages/identities/identities-page.component";
import {EdgeRoutersPageComponent} from "./pages/edge-routers/edge-routers-page.component";
import {TransitRoutersPageComponent} from "./pages/transit-routers/transit-routers-page.component";
import {ServicesPageComponent} from "./pages/services/services-page.component";
import {ZITI_NAVIGATOR} from "./ziti-console.constants";
import { GrowlerComponent } from './features/messaging/growler.component';
import { ConfirmComponent } from './features/confirm/confirm.component';
import {onAppInit} from "./app.initializer";
import {ClickOutsideModule} from "ng-click-outside";
import {NgJsonEditorModule} from "ang-jsoneditor";
import {LottieModule} from "ngx-lottie";
import { NoItemsComponent } from './features/no-items/no-items.component';
import { SideModalComponent } from './features/side-modal/side-modal.component';
import { IdentityFormComponent } from "./features/projectable-forms/identity/identity-form.component";
import { FormHeaderComponent } from './features/projectable-forms/form-header/form-header.component';
import { FormFieldContainerComponent } from './features/projectable-forms/form-field-container/form-field-container.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PreviewListComponent } from './features/preview-list/preview-list.component';
import {LoadingIndicatorComponent} from "./features/loading-indicator/loading-indicator.component";
import { FormFieldToggleComponent } from './features/projectable-forms/form-field-toggle/form-field-toggle.component';
import { JsonViewComponent } from './features/json-view/json-view.component';
import { TagSelectorComponent } from './features/tag-selector/tag-selector.component';
import { QrCodeComponent } from './features/qr-code/qr-code.component';
import { TableCellTokenComponent } from './features/data-table/cells/table-cell-token/table-cell-token.component';
import {GrowlerModule} from "./features/messaging/growler.module";
import {OSTooltipComponent} from './features/data-table/tooltips/os-tooltip.component'
import {SDKTooltipComponent} from "./features/data-table/tooltips/sdk-tooltip.component";
import { OverridesComponent } from './features/overrides/overrides.component';
import { ResetEnrollmentComponent } from './features/reset-enrollment/reset-enrollment.component';
import {IdentityServicePathComponent} from "./features/visualizer/identity-service-path/identity-service-path.component";
import {NetworkVisualizerComponent} from "./features/visualizer/network-visualizer/network-visualizer.component";
import { CustomTagsComponent } from './features/custom-tags/custom-tags.component';
import {EdgeRouterFormComponent} from "./features/projectable-forms/edge-router/edge-router-form.component";
import {TransitRouterFormComponent} from "./features/projectable-forms/transit-router/transit-router-form.component";

import {ServiceFormComponent} from "./features/projectable-forms/service/service-form.component";
import { PortRangesComponent } from './features/dynamic-widgets/port-ranges/port-ranges.component';
import { ForwardingConfigComponent } from './features/dynamic-widgets/forwarding-config/forwarding-config.component';
import { CardListComponent } from './features/card-list/card-list.component';
import { SimpleServiceComponent } from './features/projectable-forms/service/simple-service/simple-service.component';
import { CardComponent } from './features/card/card.component';
import { CreationSummaryDialogComponent } from './features/creation-summary-dialog/creation-summary-dialog.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ConfigEditorComponent } from './features/config-editor/config-editor.component';
import { EdgeRouterPoliciesPageComponent } from './pages/edge-router-policies/edge-router-policies-page.component';
import { ServicePoliciesPageComponent } from './pages/service-policies/service-policies-page.component';
import { ServicePolicyFormComponent } from './features/projectable-forms/service-policy/service-policy-form.component';
import { EdgeRouterPolicyFormComponent } from './features/projectable-forms/edge-router-policy/edge-router-policy-form.component';
import { MultiActionButtonComponent } from './features/multi-action-button/multi-action-button.component';
import { TableCellNameComponent } from './features/data-table/cells/table-cell-name/table-cell-name.component';
import { ServiceEdgeRouterPoliciesPageComponent } from './pages/service-edge-router-policies/service-edge-router-policies-page.component';
import { ServiceEdgeRouterPolicyFormComponent } from './features/projectable-forms/service-edge-router-policy/service-edge-router-policy-form.component';
import {TerminatorsPageComponent} from "./pages/terminators/terminators-page.component";
import {ConfigurationFormComponent} from "./features/projectable-forms/configuration/configuration-form.component";
import {JwtSignersPageComponent} from "./pages/jwt-signers/jwt-signers-page.component";
import {JwtSignerFormComponent} from "./features/projectable-forms/jwt-signer/jwt-signer-form.component";
import {AuthPoliciesPageComponent} from "./pages/auth-policies/auth-policies-page.component";
import {AuthPolicyFormComponent} from "./features/projectable-forms/auth-policy/auth-policy-form.component";
import {CertificateAuthoritiesPageComponent} from "./pages/certificate-authorities/certificate-authorities-page.component";
import {PreviewSelectionsComponent} from "./features/preview-selections/preview-selections.component";
import {CertificateAuthorityFormComponent} from "./features/projectable-forms/certificate-authority/certificate-authority-form.component";
import {
    VerifyCertificateComponent
} from "./features/projectable-forms/certificate-authority/verify-certificate/verify-certificate.component";
import {LoginDialogComponent} from "./features/login/login-dialog.component";
import {ConfigTypesPageComponent} from "./pages/config-types/config-types-page.component";
import {ConfigTypeFormComponent} from "./features/projectable-forms/config-type/config-type-form.component";
import {PostureChecksPageComponent} from "./pages/posture-checks/posture-checks-page.component";
import {PostureCheckFormComponent} from "./features/projectable-forms/posture-check/posture-check-form.component";
import {SessionsPageComponent} from "./pages/sessions/sessions-page.component";
import {SessionFormComponent} from "./features/projectable-forms/session/session-form.component";
import {APISessionsPageComponent} from "./pages/api-sessions/api-sessions-page.component";
import {APISessionFormComponent} from "./features/projectable-forms/api-session/api-session-form.component";
import {CallbackComponent} from "./pages/callback/callback.component";

export function playerFactory() {
    return import(/* webpackChunkName: 'lottie-web' */ 'lottie-web');
}

@NgModule({
    declarations: [
        ZacWrapperComponent,
        SafePipe,
        ExtendableComponent,
        StringInputComponent,
        NumberInputComponent,
        BooleanToggleInputComponent,
        ObjectComponent,
        SelectorInputComponent,
        TextListInputComponent,
        CheckboxListInputComponent,
        ProtocolAddressPortInputComponent,
        SideToolbarComponent,
        SideNavbarComponent,
        SideBannerComponent,
        PasswordInputComponent,
        TerminatorFormComponent,
        ConfigurationsPageComponent,
        ConfigTypesPageComponent,
        ConfigTypeFormComponent,
        ListPageHeaderComponent,
        RegularPageHeaderComponent,
        FilterBarComponent,
        ListPageFormComponent,
        ImportPageComponent,
        ExportPageComponent,
        IdentitiesPageComponent,
        EdgeRoutersPageComponent,
        TransitRoutersPageComponent,
        DataTableComponent,
        TableCellSelectComponent,
        TableColumnSelectComponent,
        TableCellMenuComponent,
        TableColumnMenuComponent,
        TableColumnDefaultComponent,
        TableColumnFilterComponent,
        IdentityFormComponent,
        EdgeRouterFormComponent,
        TransitRouterFormComponent,
        HiddenColumnsBarComponent,
        FilterBarComponent,
        ExtendableComponent,
        ConfirmComponent,
        NoItemsComponent,
        SideModalComponent,
        FormHeaderComponent,
        FormFieldContainerComponent,
        PreviewListComponent,
        LoadingIndicatorComponent,
        FormFieldToggleComponent,
        JsonViewComponent,
        TagSelectorComponent,
        QrCodeComponent,
        TableCellTokenComponent,
        OSTooltipComponent,
        SDKTooltipComponent,
        OverridesComponent,
        ResetEnrollmentComponent,
        IdentityServicePathComponent,
        NetworkVisualizerComponent,
        CustomTagsComponent,
        ServicesPageComponent,
        ServiceFormComponent,
        PortRangesComponent,
        ForwardingConfigComponent,
        CardListComponent,
        SimpleServiceComponent,
        CardComponent,
        CreationSummaryDialogComponent,
        ConfigEditorComponent,
        ServicePoliciesPageComponent,
        ServicePolicyFormComponent,
        EdgeRouterPoliciesPageComponent,
        EdgeRouterPolicyFormComponent,
        MultiActionButtonComponent,
        TableCellNameComponent,
        ServiceEdgeRouterPoliciesPageComponent,
        ServiceEdgeRouterPolicyFormComponent,
        TerminatorsPageComponent,
        TerminatorFormComponent,
        ConfigurationFormComponent,
        JwtSignersPageComponent,
        JwtSignerFormComponent,
        AuthPoliciesPageComponent,
        AuthPolicyFormComponent,
        PreviewSelectionsComponent,
        CertificateAuthoritiesPageComponent,
        CertificateAuthorityFormComponent,
        VerifyCertificateComponent,
        LoginDialogComponent,
        PostureChecksPageComponent,
        PostureCheckFormComponent,
        SessionsPageComponent,
        SessionFormComponent,
        APISessionsPageComponent,
        APISessionFormComponent,
        CallbackComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatRadioModule,
        HttpClientModule,
        ZacRoutingModule,
        ChipsModule,
        CalendarModule,
        AgGridModule,
        QRCodeModule,
        ClickOutsideModule,
        NgJsonEditorModule,
        MatTooltipModule,
        MatAutocompleteModule,
        LottieModule.forRoot({player: playerFactory}),
        DropdownModule
    ],
    exports: [
        ZacWrapperComponent,
        ExtendableComponent,
        SideToolbarComponent,
        SideNavbarComponent,
        SideBannerComponent,
        StringInputComponent,
        SelectorInputComponent,
        PasswordInputComponent,
        NumberInputComponent,
        BooleanToggleInputComponent,
        ObjectComponent,
        TextListInputComponent,
        IdentityServicePathComponent,
        NetworkVisualizerComponent,
        CheckboxListInputComponent,
        ProtocolAddressPortInputComponent,
        ConfigurationsPageComponent,
        ConfigurationFormComponent,
        ConfigTypesPageComponent,
        ConfigTypeFormComponent,
        EdgeRouterFormComponent,
        TransitRouterFormComponent,
        IdentitiesPageComponent,
        ImportPageComponent,
        ExportPageComponent,
        EdgeRoutersPageComponent,
        TransitRoutersPageComponent,
        ServicesPageComponent,
        ZacRoutingModule,
        SideModalComponent,
        IdentityFormComponent,
        LoadingIndicatorComponent,
        GrowlerModule,
        FormFieldContainerComponent,
        FormFieldToggleComponent,
        ServiceFormComponent,
        ServicePoliciesPageComponent,
        ServicePolicyFormComponent,
        EdgeRouterPoliciesPageComponent,
        TerminatorsPageComponent,
        TerminatorFormComponent,
        JwtSignersPageComponent,
        JwtSignerFormComponent,
        AuthPoliciesPageComponent,
        AuthPolicyFormComponent,
        LoginDialogComponent,
        PostureChecksPageComponent,
        PostureCheckFormComponent,
        SessionsPageComponent,
        SessionFormComponent,
        APISessionsPageComponent,
        APISessionFormComponent,
        CallbackComponent
    ],
    providers: [
        {provide: SHAREDZ_EXTENSION, useClass: ExtensionsNoopService},
        {provide: ZITI_NAVIGATOR, useValue: {}},
        {
            provide: APP_INITIALIZER,
            useFactory: onAppInit,
            deps: [Injector],
            multi: true
        },
    ],
})
export class OpenZitiConsoleLibModule {
}
