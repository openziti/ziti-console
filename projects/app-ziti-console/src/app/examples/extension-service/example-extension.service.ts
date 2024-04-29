import {EventEmitter, Injectable} from '@angular/core';
import {ExtensionService} from "ziti-console-lib";
import {BehaviorSubject} from "rxjs";

@Injectable({ providedIn: 'root' })
export class ExampleExtensionService implements ExtensionService {

    moreActions = [
        {label: 'Example Action', action: 'more-action', callback: this.executeMoreAction.bind(this)},
    ]
    listActions = [
        {label: 'Example Action', action: 'list-action', callback: this.executeListAction.bind(this)},
    ]
    closeAfterSave: boolean;
    closed: EventEmitter<any>;
    formDataChanged: BehaviorSubject<any>;

    extendAfterViewInits(extentionPoints: any): void {
        // This function will execute after the edit form is initialized
        // Uncomment the alert below to see when this function is called
        //alert('ExampleExtensionService "extendAfterViewInits()" function executed');
    }

    formDataSaved(data: any): Promise<any> {
        // This function will execute before form data is saved in order to do check if extension data is valid
        // Uncomment the alert below to see when this function is called
        // alert('ExampleExtensionService "formDataSaved()" function executed');
        return Promise.resolve(undefined);
    }

    updateFormData(data: any): void {
        // This function will pass in a reference to the root data model of the entity being edited
        // Uncomment the alert below to see when this function is called
        // alert('ExampleExtensionService "updateFormData()" function executed');
    }

    validateData(): Promise<any> {
        // This function will execute before form data is saved in order to do check if extension data is valid
        // Uncomment the alert below to see when this function is called
        // alert('ExampleExtensionService "validateData()" function executed');
        return Promise.resolve(undefined);
    }

    executeMoreAction() {
        alert('Example action executed from "More Actions" drop down');
    }

    executeListAction() {
        alert('Example action executed from list page menu items');
    }
}