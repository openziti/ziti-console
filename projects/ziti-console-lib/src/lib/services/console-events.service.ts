import {EventEmitter, Injectable} from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class ConsoleEventsService {

    openSideModal: EventEmitter<any> =  new EventEmitter<any>();
    closeSideModal: EventEmitter<any> =  new EventEmitter<any>();

    constructor() {}
}