import {
    Component,
    ComponentRef,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit, Output,
    ViewChild,
    ViewContainerRef
} from '@angular/core';
import {ConfigurationService} from "./configuration.service";
import {Subscription} from "rxjs";
import {SchemaService} from "../../../services/schema.service";
import {ProjectableForm} from "../projectable-form.class";
import {JsonEditorComponent, JsonEditorOptions} from 'ang-jsoneditor';
import _ from "lodash";


@Component({
    selector: 'lib-configuration',
    templateUrl: './configuration-form.component.html',
    styleUrls: ['./configuration-form.component.scss']
})
export class ConfigurationFormComponent extends ProjectableForm implements OnInit, OnDestroy {
    @ViewChild("dynamicform", {read: ViewContainerRef}) dynamicForm!: ViewContainerRef;
    @ViewChild(JsonEditorComponent, {static: false}) editor!: JsonEditorComponent;

    @Input() override formData: any = {};
    @Input() override errors: any = {};
    @Output() currentSchema = new EventEmitter<any>();
    @Output() showButtons = new EventEmitter<boolean>();
    @Output() close: EventEmitter<void> = new EventEmitter<void>();

    options: string[] = [];

    lColorArray = [
        'black',
        'white',
        'white',
    ]

    bColorArray = [
        '#33aaff',
        '#fafafa',
        '#33aaff',
    ]

    configType: string = '';
    editMode = false;
    items: any = [];
    subscription = new Subscription()
    editorOptions: JsonEditorOptions;
    jsonData: any;
    onChangeDebounced = _.debounce(this.onJsonChange.bind(this), 400);
    private schema: any;
    private readOnly: false;

    constructor(private svc: ConfigurationService,
                private schemaSvc: SchemaService) {
        super();
    }

    async createForm() {
        this.clearForm();
        if (this.configType && this.dynamicForm) {
           this.schema = await this.svc.getSchema(this.configType);
            if (this.schema) {
                this.currentSchema.emit(this.schema);
                this.render(this.schema);
            }
        }
    }

    ngOnDestroy(): void {
        this.clearForm();
    }

     override clear() {
        this.configType = '';
        this.clearForm();
    }

    clearForm() {
        this.showButtons.emit(false);
        this.items.forEach((item: any) => {
            if (item?.component) item.component.destroy();
        });
        this.errors = {};
        this.items = [];
        this.formData = {};
        if (this.subscription) this.subscription.unsubscribe();
    }

    render(schema: any) {
        if (schema.properties) {
            this.items = this.schemaSvc.render(schema, this.dynamicForm, this.lColorArray, this.bColorArray);
            for (let obj of this.items) {
                const cRef = obj.component;
                cRef.instance.errors = this.errors;
                if (cRef?.instance.valueChange) {
                    const pName: string[]  = cRef.instance.parentage;
                    let parentKey;
                    if(pName) parentKey = pName.join('.');
                    if (parentKey && !this.formData[parentKey]) this.formData[parentKey] = {};
                    this.subscription.add(
                        cRef.instance.valueChange.subscribe((val: any) => {
                            this.setFormValue(cRef, val);
                        }));
                }
            }

            this.showButtons.emit(this.items.length > 0);
        }
    }

    ngOnInit(): void {
        this.editorOptions = this.svc.initJsonEditorOptions();
        this.editorOptions.schema = this.schema;
        this.editorOptions.onEditable = () => !this.readOnly;
        (<any>this.editorOptions).onBlur = this.onJsonChange.bind(this);
        this.svc.getConfigTypes()
            .then(recs => {
                this.options = recs.map(r => r.name).sort();
            })
    }



    private setFormValue(cRef: ComponentRef<any>, val: any) {
        const pName = cRef.instance.parentage;
        const fName = cRef.instance.fieldName;
        if (pName && !this.formData[pName]) this.formData[pName] = {};
        if(fName === 'pap') {
            this.setSpecialFormValue(cRef, val, pName);
        } else {
            if (pName && !this.formData[pName]) this.formData[pName][fName] = val;
            else this.formData[fName] = val;
        }
    }

    private setSpecialFormValue(cRef: ComponentRef<any>, val: any, pName) {
        const lPrefix = cRef.instance.labelPrefix
        if (val.protocol) {
            const fieldName = lPrefix ? lPrefix.trim().toLowerCase() + 'protocol' : 'protocol'
            if (pName && !this.formData[pName]) this.formData[pName][fieldName] = val;
            else this.formData[fieldName] = val;
        }
        if (val.address) {
            const fieldName = lPrefix ? lPrefix.trim().toLowerCase() + 'address' : 'address'
            if (pName && !this.formData[pName]) this.formData[pName][fieldName] = val;
            else this.formData[fieldName] = val;
        }
        if (val.port) {
            const fieldName = lPrefix ? lPrefix.trim().toLowerCase() + 'port' : 'port'
            if (pName && !this.formData[pName]) this.formData[pName][fieldName] = val;
            else this.formData[fieldName] = val;
        }
    }

    onJsonChange() {

    }

    onJsonChangeDebounced() {

    }

    save(): void {
    }

}
