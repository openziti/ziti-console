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

import {Injectable, Inject} from '@angular/core';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {Resolver} from "@stoplight/json-ref-resolver";
import {JsonEditorOptions} from "ang-jsoneditor";

@Injectable({
    providedIn: 'root'
})
export class ConfigurationService {
    private configTypes: any[] = [];

    constructor(@Inject(ZITI_DATA_SERVICE) private dataService: ZitiDataService) {
    }

    async getSchema(schemaType: string): Promise<any> {
        if (!schemaType) return Promise.resolve();
        for (let idx = 0; idx < this.configTypes.length; idx++) {
            if(this.configTypes[idx].name === schemaType)
                return this.configTypes[idx].schema;
        }
    }

    getConfigTypes() {
        return this.dataService.get('config-types', {}, [])
        .then(async (body: any) => {
            if (body.error) throw body.error;
            const promises: Promise<any>[] = [];
            const resolver = new Resolver();
            body.data.map( (row: any) => {
                const schema = row.schema;
                promises.push(resolver.resolve(schema, {}).then(s => {
                    row.schema = s.result;
                    this.configTypes.push(row);
                }))
            });
            return Promise.all(promises).then(() => this.configTypes);
        });
    }
    initJsonEditorOptions() {
        const editorOptions = new JsonEditorOptions();
        editorOptions.modes = ['code', 'tree'];
        editorOptions.mode = 'code';
        editorOptions.enableTransform = false;
        return editorOptions
    }
}
