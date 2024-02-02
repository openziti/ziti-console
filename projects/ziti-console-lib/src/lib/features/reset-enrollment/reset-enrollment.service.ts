import {Inject, Injectable} from "@angular/core";
import {isEmpty} from "lodash";
import moment from "moment/moment";
import {GrowlerModel} from "../messaging/growler.model";
import {GrowlerService} from "../messaging/growler.service";
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../services/ziti-data.service";

@Injectable({
    providedIn: 'root'
})
export class ResetEnrollmentService {

    constructor(
        private growlerService: GrowlerService,
        @Inject(ZITI_DATA_SERVICE) private dataService: ZitiDataService,
    ) {
    }

    resetEnrollment(identity, dateVal) {
        let id = identity?.authenticators?.cert?.id || identity?.authenticators?.updb?.id;
        const dateObj: any = moment(dateVal);
        return this.dataService.resetEnrollment(id, dateObj).then(() => {
            const growlerData = new GrowlerModel(
                'success',
                'Success',
                `Enrollment Reset`,
                `Successfully reset enrollment token`,
            );
            this.growlerService.show(growlerData);
            return true;
        }).catch((error) => {
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Reset Failed`,
                `Failed to reset enrollment token`,
            );
            this.growlerService.show(growlerData);
            return false;
        });
    }

    reissueEnrollment(identity, dateVal) {
        let id = identity?.enrollment?.id;
        if(!isEmpty(identity?.enrollment?.ott)) {
            id = identity?.enrollment?.ott.id;
        } else if(!isEmpty(identity?.enrollment?.ottca)) {
            id = identity?.enrollment?.ottca.id;
        } else if (!isEmpty(identity?.enrollment?.updb)) {
            id = identity?.enrollment?.updb.id;
        }
        const dateObj: any = moment(dateVal);
        return this.dataService.reissueEnrollment(id, dateObj).then(() => {
            const growlerData = new GrowlerModel(
                'success',
                'Success',
                `Enrollment Token Reissues`,
                `Successfully reissued enrollment token`,
            );
            this.growlerService.show(growlerData);
            return true;
        }).catch((error) => {
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Reissue Failed`,
                `Failed to reissues enrollment token`,
            );
            this.growlerService.show(growlerData);
            return false;
        });
    }
}