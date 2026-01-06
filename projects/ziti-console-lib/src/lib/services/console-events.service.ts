import {EventEmitter, Injectable} from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class ConsoleEventsService {

    refreshData: EventEmitter<any> = new EventEmitter<any>();
    openSideModal: EventEmitter<any> =  new EventEmitter<any>();
    closeSideModal: EventEmitter<any> =  new EventEmitter<any>();

    constructor() {}

    enableZACEvents() {

    }
}
