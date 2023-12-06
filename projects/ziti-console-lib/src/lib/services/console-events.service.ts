import {EventEmitter, Injectable} from "@angular/core";

// @ts-ignore
const {app, growler, $} = window;

@Injectable({
    providedIn: 'root'
})
export class ConsoleEventsService {

    refreshData: EventEmitter<any> = new EventEmitter<any>();
    openSideModal: EventEmitter<any> =  new EventEmitter<any>();
    closeSideModal: EventEmitter<any> =  new EventEmitter<any>();

    constructor() {}

    enableZACEvents() {
        $("#IdentityDownload").click(app.download);
        $("#AlertButton").click(growler.toggle);
        $("#NotificationMenuClose").click(() => {
            $("#NotificationsMenu").removeClass("open");
        });
        $("#DoneIdButton").click(app.idReset);
        $("#DoneServiceButton").click(app.idReset);
        $("#InlineAddIdentityButton").click(app.showInlineId);
        $("#InlineAddServiceButton").click(app.showInlineService);
    }
}