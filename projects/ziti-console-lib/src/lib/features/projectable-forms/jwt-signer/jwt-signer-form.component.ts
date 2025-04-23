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

import {
    Component, ElementRef,
    EventEmitter, Inject,
    Input,
    OnDestroy,
    OnInit, Output,
    ViewChild,
} from '@angular/core';
import {JwtSignerFormService} from "./jwt-signer-form.service";
import {SchemaService} from "../../../services/schema.service";
import {ProjectableForm} from "../projectable-form.class";
import {GrowlerService} from "../../messaging/growler.service";
import {ExtensionService, SHAREDZ_EXTENSION} from "../../extendable/extensions-noop.service";

import semver from 'semver';
import {cloneDeep, defer, delay, forOwn, get, keys, invert, invoke, isEmpty, isNil, unset, trim} from 'lodash';
import {GrowlerModel} from "../../messaging/growler.model";
import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {ActivatedRoute, Router} from "@angular/router";
import {JwtSigner} from "../../../models/jwt-signer";
import {Location} from "@angular/common";
import {ValidationService} from "../../../services/validation.service";
import {OAuthErrorEvent, OAuthService} from "angular-oauth2-oidc";
import {LoginServiceClass, ZAC_LOGIN_SERVICE} from "../../../services/login-service.class";
import {AuthService} from "../../../services/auth.service";
import {HttpClient} from "@angular/common/http";

@Component({
    selector: 'lib-configuration',
    templateUrl: './jwt-signer-form.component.html',
    styleUrls: ['./jwt-signer-form.component.scss']
})
export class JwtSignerFormComponent extends ProjectableForm implements OnInit, OnDestroy {

    @Input() override formData: any = {};
    @Input() override errors: any = {};
    @Output() close: EventEmitter<void> = new EventEmitter<void>();

    formView = 'simple';
    options: any[] = [];
    isEditing = !isEmpty(this.formData.id);
    formDataInvalid = false;
    editMode = false;
    items: any = [];
    settings: any = {};
    fileSelectOpening = false;
    signatureMethod = "JWKS_ENDPOINT";
    oauthLoading = false;
    configKey = 'oauth_test_callback_config';
    tokenTypeKey = 'oauth_test_callback_token_type';
    oidcVerified = false;
    oidcErrorMessageSource;
    oidcErrorMessageDetail;
    oidcErrorMessageDetail2;
    oidcErrorMessageDetail3;
    jwksValidationError;
    oidcAuthTokenClaims;
    oidcClaims;
    overrideFormData;
    override usePreviousLocation = false
    override entityType = 'external-jwt-signers';
    override entityClass = JwtSigner;

    @ViewChild('fileSelect') filterInput: ElementRef;
    @ViewChild('oidcVerification') oidcVerification: ElementRef;

    constructor(
        public svc: JwtSignerFormService,
        private schemaSvc: SchemaService,
        growlerService: GrowlerService,
        @Inject(SHAREDZ_EXTENSION) extService: ExtensionService,
        @Inject(SETTINGS_SERVICE) protected override settingsService: SettingsService,
        @Inject(ZITI_DATA_SERVICE) override zitiService: ZitiDataService,
        protected override router: Router,
        protected override route: ActivatedRoute,
        location: Location,
        private validationService: ValidationService,
        private authService: AuthService,
        private oauthService: OAuthService,
        private http: HttpClient,
        @Inject(ZAC_LOGIN_SERVICE) private loginService: LoginServiceClass,

    ) {
        super(growlerService, extService, zitiService, router, route, location, settingsService);
    }

    override ngOnInit(): void {
        super.ngOnInit();
        this.settingsService.settingsChange.subscribe((results:any) => {
            this.settings = results;
        });
        if (window.location.href.indexOf('test-auth') > 0) {
            this.handleOAuthCallback();
        } else {
            this.authService.resetOAuthService(this.configKey, this.tokenTypeKey);
        }
    }

    override ngAfterViewInit() {
        super.ngAfterViewInit(true);
        defer(() => {
            this.scrollContainer?.nativeElement.scrollTo(0,  this.scrollContainer?.nativeElement.scrollHeight);
        });
    }

    protected override entityUpdated() {
        super.entityUpdated();
        if (!isEmpty(this.overrideFormData)) {
            this.formData = this.overrideFormData;
            this.overrideFormData = undefined;
        }
    }

    ngOnDestroy(): void {
        this.clearForm();
    }

    headerActionRequested(event) {
        switch(event.name) {
            case 'save':
                this.save(event);
                break;
            case 'close':
                this.returnToListPage();
                break;
            case 'toggle-view':
                this.formView = event.data;
                break;
        }
    }

    checkExternalIdToggle() {
        if (isEmpty(this.formData.claimsProperty)) {
            this.formData.useExternalId = false;
        } else {
            this.formData.useExternalId = true;
        }
    }

    override clear() {
        this.formData.configTypeId = '';
        this.clearForm();
    }

    clearForm() {
        this.items.forEach((item: any) => {
            if (item?.component) item.component.destroy();
        });
        this.errors = {};
        this.items = [];
        this.formData = {};
        if (this.subscription) this.subscription.unsubscribe();
    }

    async save(event?: any) {
        if(!this.validate()) {
            return;
        }
        const tagVals = this.getTagValues();
        if (!isEmpty(tagVals)) {
            forOwn(tagVals, (value, key) => {
                this.formData.tags[key] = value;
            });
        }
        const apiData = this.apiData;
        this.isLoading = true;
        this.svc.save(apiData).then((result) => {
            if (this.isModal) {
                this.closeModal(true, true);
                return;
            }
            this.initData = this.formData;
            this._dataChange = false;
            this.returnToListPage();
        }).finally(() => {
            this.isLoading = false;
        });
    }

    validate() {
        this.errors = {};
        const labels = [];
        const growlers = [];
        if (isEmpty(this.formData.name)) {
            this.errors.name = true;
            labels.push('Name');
        }
        if (isEmpty(this.formData.issuer)) {
            this.errors.issuer = true;
            labels.push('Issuer');
        }
        if (isEmpty(this.formData.certPem) && isEmpty(this.formData.jwksEndpoint)) {
            this.errors.certPem = true;
            this.errors.jwksEndpoint = true;
            labels.push('Cert PEM or JWKS Endpoint');
        }
        if (this.formData.useExternalId && isEmpty(this.formData.claimsProperty)) {
            this.errors.claimsProperty = true;
            labels.push('Claims Property');
        }
        if (!isEmpty(this.errors)) {
            let missingFields = labels.join(', ');
            growlers.push(new GrowlerModel(
                'error',
                'Invalid',
                `Missing Form Data`,
                `Please enter a value for the highlighted fields: ${missingFields}`,
            ));
        }
        if (!isEmpty(growlers)) {
            growlers.forEach((growlerData) => {
                this.growlerService.show(growlerData);
            });
            return isEmpty(this.errors);
        }
        if (this.signatureMethod === 'JWKS_ENDPOINT') {
            if (isEmpty(this.formData.jwksEndpoint)) {
                this.errors.jwksEndpoint = true;
                growlers.push(new GrowlerModel(
                    'error',
                    'Invalid',
                    `Missing JWKS Endpoint`,
                    `Please enter a URI for the JWKS Endpoint.`,
                ));
            } else if (!this.validationService.isValidURI(this.formData.jwksEndpoint)) {
                this.errors.jwksEndpoint = true;
                growlers.push(new GrowlerModel(
                    'error',
                    'Invalid',
                    `JWKS Endpoint Invalid`,
                    `The value you have entered for the JWKS Endpoint field is invalid. Please check your input and try again.`,
                ));
            }
        } else if (this.signatureMethod === 'CERT_PEM') {
            if (isEmpty(this.formData.certPem)) {
                this.errors.certPem = true;
                growlers.push(new GrowlerModel(
                    'error',
                    'Invalid',
                    `Missing Cert PEM`,
                    `Please enter a URI for the JWKS Endpoint.`,
                ));
            } else if (!this.validationService.isValidPEM(this.formData.certPem?.trim())) {
                this.errors.certPem = true;
                growlers.push(new GrowlerModel(
                    'error',
                    'Invalid',
                    `Cert PEM Invalid`,
                    `The Cert PEM you entered is invalid. Please check your input and try again.`,
                ));
            }
        }

        growlers.forEach((growlerData) => {
            this.growlerService.show(growlerData);
        });
        return isEmpty(this.errors);
    }

    get showTokenType() {
        return !isEmpty(this.settingsService?.zitiSemver) && semver.gte(this.settingsService?.zitiSemver, '1.4.0');
    }

    get targetToken() {
        if (this.formData && !this.formData.targetToken) {
            this.formData.targetToken = 'ACCESS';
            this.initData = cloneDeep(this.formData);
        }
        return this.formData.targetToken;
    }

    set targetToken(val) {
        if (!this.formData) {
            return;
        }
        this.formData.targetToken = val;
    }

    get apiCallURL() {
        return this.settings.selectedEdgeController + '/edge/management/v1/external-jwt-signers' + (this.formData.id ? `/${this.formData.id}` : '');
    }

    get apiData(): any {
        const data: any = {
            name: this.formData.name || '',
            audience: this.formData.audience || '',
            issuer: this.formData.issuer || '',
            clientId: this.formData.clientId || '',
            certPem: this.formData.certPem || '',
            claimsProperty: this.formData.claimsProperty || '',
            enabled: this.formData.enabled,
            useExternalId: this.formData.useExternalId,
            kid: this.formData.kid || '',
            externalAuthUrl: this.formData.externalAuthUrl || '',
            scopes: this.formData.scopes || [],
            tags: this.formData.tags || {}
        };
        if (!isEmpty(this.formData.jwksEndpoint)) {
            data.jwksEndpoint = this.formData.jwksEndpoint;
        }
        if (!isEmpty(this.formData.targetToken) && this.showTokenType) {
            data.targetToken = this.formData.targetToken;
        }
        if (!isEmpty(this.formData.id)) {
            data.id = this.formData.id;
        }
        if (this.formData.id) {
            data.id = this.formData.id;
        }
        if (this.signatureMethod === 'JWKS_ENDPOINT') {
            data.certPem = undefined;
        } else {
            data.jwksEndpoint = undefined;
        }
        this._apiData = data;
        return this._apiData;
    }

    _apiData: any = {};
    set apiData(data) {
        this._apiData = data;
    }

    dataChanged(event) {
        this._apiData = cloneDeep(this.apiData);
    }

    toggleEnabled() {
        this.formData.enabled = !this.formData.enabled;
    }

    toggleUseExternalId() {
        this.formData.useExternalId = !this.formData.useExternalId;
        if (!this.formData.useExternalId) {
            this.errors.claimsProperty = false;
        }
    }

    trimWhitespaceScopes() {
        this.formData.scopes = this.formData?.scopes.map(trim);
    }

    radioKeyDownHandler(event: any) {
        switch (event.key) {
            case 'ArrowLeft':
                this.signatureMethod = 'JWKS_ENDPOINT';
                break;
            case 'ArrowRight':
                this.signatureMethod = 'CERT_PEM';
                break;
            default:
                break;
        }
    }

    selectSignatureMethod(method) {
        this.signatureMethod = method;
    }

    openFileSelect(event: any) {
        this.filterInput.nativeElement.click();
        this.fileSelectOpening = true;
        delay(() => {
            this.fileSelectOpening = false;
        }, 1000);
    }

    selectPemFile(event: any) {
        const file: File = event?.target?.files[0];

        if (file) {
            const fileReader = new FileReader();
            fileReader.onload = (fileLoadedEvent) => {
                const textFromSelectedFile: any = fileLoadedEvent.target?.result;
                if (!this.validationService.isValidPEM(textFromSelectedFile?.trim())) {
                    this.errors.certPem = true;
                    const growlerData = new GrowlerModel(
                        'error',
                        'Invalid',
                        `Cert PEM Invalid`,
                        `The file selected for the Cert PEM field is invalid. Please check your input and try again.`,
                    );
                    this.growlerService.show(growlerData);
                    this.formData.certPem = 'Invalid PEM. Please select or enter a valid PEM certificate.';
                } else {
                    unset(this.errors, 'certPem');
                    this.formData.certPem = textFromSelectedFile;
                }
            };
            fileReader.readAsText(file, "UTF-8");
        }
    }

    apiActionRequested(action) {
        switch (action.id) {
            case 'cli':
                this.copyCLICommand();
                break;
            case 'curl':
                this.copyCURLCommand();
                break;
        }
    }

    copyCLICommand() {
        const command = `ziti edge ${this.formData.id ? 'update' : 'create'} ext-jwt-signer ${this.formData.id ? `'${this.formData.id}'` : ''} ${this.formData.id ? '--name' : ''} '${this.formData.name}' ${this.formData.id ? '--issuer' : ''} '${this.formData.issuer}' --audience '${this.formData.audience}' --cert-pem '${this.formData.certPem}' --claims-property '${this.formData.claimsProperty}' --external-auth-url '${this.formData.externalAuthUrl}' --kid '${this.formData.kid}'`;

        navigator.clipboard.writeText(command);
        const growlerData = new GrowlerModel(
            'success',
            'Success',
            `Text Copied`,
            `CLI command copied to clipboard`,
        );
        this.growlerService.show(growlerData);
    }

    copyCURLCommand() {
        const command = `curl '${this.apiCallURL}' \\
    ${this.formData.id ? '--request PATCH \\' : '\\'}
    -H 'accept: application/json' \\
    -H 'content-type: application/json' \\
    -H 'zt-session: ${this.settings.session.id}' \\
    --data-raw '${JSON.stringify(this.apiData)}'`;

        navigator.clipboard.writeText(command);
        const growlerData = new GrowlerModel(
            'success',
            'Success',
            `Text Copied`,
            `CURL command copied to clipboard`,
        );
        this.growlerService.show(growlerData);
    }

    scopesOnKeyup(event: any) {
        const key = event.key?.toLowerCase();
        if (key === " " || key === 'enter') {
            event.preventDefault();
            event.stopPropagation();
            const element = event.target as HTMLElement;
            element.blur();
            element.focus();
        }
        defer(() => {
            this.trimWhitespaceScopes();
        })
    }

    get callbackURL() {
        return window.location.origin + (this.baseHref + this.loginService.callbackRoute).replace('//', '/');
    }

    copyCallbackURL() {
        navigator.clipboard.writeText(this.callbackURL);
        this.growlerService.show(
            new GrowlerModel('success', 'Success', 'Copied to clipboard', 'JWT based auth domain has been copied to your clipboard')
        );
    }

    async testOIDCAuthentication() {
        this.oauthLoading = true;
        this.oidcAuthTokenClaims = undefined;
        this.oidcErrorMessageSource = undefined;
        this.oidcErrorMessageDetail = undefined;
        this.oidcErrorMessageDetail2 = undefined;
        this.oidcErrorMessageDetail3 = undefined;
        this.jwksValidationError = undefined;
        const jwksValid = await this.testJWKS();
        if (!jwksValid) {
            this.oidcVerified = false;
            this.oauthLoading = false
            return;
        }
        const callbackParams = `${this.loginService.callbackRoute}?redirectRoute=jwt-signers/${this.formData.id}/test-auth`;
        localStorage.setItem('oidc_callback_test_config', JSON.stringify(this.formData));
        this.authService.configureOAuth(this.formData, callbackParams).then((result) => {
            if (result.success) {
                delay(() => {
                    this.oauthLoading = false;
                }, 4000);
            } else {
                delay(() => {
                    this.oidcErrorMessageDetail = result.message;
                    this.oidcErrorMessageSource = 'OAuth Configuration Error';
                    if (this.jwksValidationError) {
                        this.oidcErrorMessageDetail2 = this.jwksValidationError;
                    }
                    this.oauthLoading = false;
                    this.oidcVerified = false;
                }, 700);

            }
        });
    }

    handleOAuthCallback() {
        this.showMore = true;
        const errorMessageDetail = this.route.snapshot.queryParamMap.get('oidcAuthErrorMessageDetail');
        const errorMessageSource = this.route.snapshot.queryParamMap.get('oidcAuthErrorMessageSource');
        const oidcAuthTokenClaims = this.route.snapshot.queryParamMap.get('oidcAuthTokenClaims');
        const result = this.route.snapshot.queryParamMap.get('oidcAuthResult');
        const formData = localStorage.getItem('oidc_callback_test_config');
        if (!isEmpty(formData)) {
            this.overrideFormData = JSON.parse(formData);
        }
        if (result === 'success') {
            this.oidcVerified = true;
            if (oidcAuthTokenClaims) {
                this.oidcAuthTokenClaims = JSON.parse(oidcAuthTokenClaims);
            }
        } else {
            this.oidcErrorMessageDetail = errorMessageDetail;
            this.oidcErrorMessageSource = errorMessageSource;
            if (oidcAuthTokenClaims) {
                this.oidcAuthTokenClaims = JSON.parse(oidcAuthTokenClaims);
                this.oidcErrorMessageDetail3 = 'Check the list of auth token claims below to confirm if your provider is returning the correct details.'
                this.validateTokenClaims(this.oidcAuthTokenClaims, this.overrideFormData);
            }
        }
    }

    validateTokenClaims(token, formData) {
        if (!token.aud) {
            this.errors.audience = true;
            this.oidcErrorMessageDetail2 = 'Audience is missing from token claims'
        } else {
            let audError = true;
            token.aud.forEach((audItem) => {
                if (audItem === formData.audience) {
                    audError = false;
                }
            });
            if (audError) {
                this.errors.audience = true;
                this.oidcErrorMessageDetail2 = 'Audience in token does not match External JWT Signer configuration.'
            }
        }
    }

    async testJWKS() {
        this.errors.jwksEndpoint = false;
        try {
            const response: any = await this.http.get(this.formData.jwksEndpoint).toPromise().catch((error) => {
                this.oidcErrorMessageSource = 'JWKS Endpoint Error';
                this.oidcErrorMessageDetail = `HTTP error returned. Status: ${error.status}. Message: ${error.message}`;
                this.errors.jwksEndpoint = true;
                return false;
            });
            if (response) {
                // Basic structural validation
                if (!response?.keys || !Array.isArray(response?.keys)) {
                    this.oidcErrorMessageSource = 'JWKS Endpoint Error';
                    this.oidcErrorMessageDetail = `Invalid JWKS: "keys" property missing or not an array`;
                    this.errors.jwksEndpoint = true;
                } else {
                    const logError: any = get(this.oauthService, 'logger.error');
                    this.oauthService['logger'].error = (...args) => {
                        this.jwksValidationError = '';
                        args.forEach((arg) => {
                            this.jwksValidationError += arg + ' ';
                        });
                        logError.apply(this, args);
                    }
                    const result = invoke(this.oauthService, 'validateDiscoveryDocument', response);
                }
            }
        } catch (error: any) {
            this.oidcErrorMessageSource = 'JWKS Endpoint Error';
            this.oidcErrorMessageDetail = `${error.message}`;
            this.errors.jwksEndpoint = true;
        }
        const growlerData = new GrowlerModel(
            'error',
            'Invalid',
            this.oidcErrorMessageSource,
            this.oidcErrorMessageDetail,
        );
        if (this.errors.jwksEndpoint) {
            this.growlerService.show(growlerData);
        }
        return !this.errors.jwksEndpoint;
    }
}
