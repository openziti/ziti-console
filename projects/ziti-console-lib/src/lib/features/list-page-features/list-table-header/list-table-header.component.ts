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

import {Component, EventEmitter, Input, Output} from '@angular/core';

/**
 * Header for the new list-table pages: an icon tile + title + one-line subtitle
 * (with an optional info affordance) on the left, and a primary "Create ..." action
 * on the right, over an optional tab strip. Emits the same `add` / `delete` actions
 * as {@link ListPageHeaderComponent} so pages can swap headers without changing their
 * handlers. Project the page's icon into the tile with a `header-icon` attribute.
 */
@Component({
    selector: 'lib-list-table-header',
    templateUrl: './list-table-header.component.html',
    styleUrls: ['./list-table-header.component.scss'],
    standalone: false
})
export class ListTableHeaderComponent {
    @Input() title = '';
    @Input() subtitle = '';
    /** Label for the primary create button, e.g. "Create Identity". */
    @Input() createLabel = 'Create';
    /** Optional short helper text shown behind the (i) affordance next to the title. */
    @Input() infoText = '';
    @Input() tabs: any[] = [];
    @Input() showAdd = true;
    /** Hide the create control even when showAdd is true. */
    @Input() blockCreate = false;
    /** Hide the bulk-delete control shown when rows are selected. */
    @Input() blockDelete = false;
    /** When true (default) tabs navigate via routerLink and highlight by matching the
     *  URL path. Set false for a consumer that owns navigation (e.g. query-param tabs):
     *  tabs then only emit `tabClicked`, and the active one is driven by `activeTab`. */
    @Input() tabsUseRouter = true;
    /** Active tab when `tabsUseRouter` is false. Matched by identity or by the tab's
     *  `id` / `value` / `url` / `label`. */
    @Input() activeTab: any = null;

    @Output() actionClicked = new EventEmitter<string>();
    @Output() tabClicked = new EventEmitter<any>();

    clickAction(value: string) {
        this.actionClicked.emit(value);
    }

    onTabClick(tab: any) {
        this.tabClicked.emit(tab);
    }

    tabSelected(tab: any): boolean {
        if (!this.tabsUseRouter) {
            return this.tabMatchesActive(tab);
        }
        if (!tab?.url) {
            return false;
        }
        const parsedUrl = new URL(window.location.href);
        let path = parsedUrl.pathname;
        if (document.baseURI) {
            const base = new URL(document.baseURI).pathname;
            if (path.startsWith(base)) {
                path = path.slice(base.length);
            }
        }
        let tabUrl = tab.url;
        if (tab.url.startsWith('/')) {
            tabUrl = tab.url.slice(1);
        }
        if (path.startsWith('/')) {
            path = path.slice(1);
        }
        return tabUrl === path;
    }

    private tabMatchesActive(tab: any): boolean {
        const active = this.activeTab;
        if (active == null) {
            return false;
        }
        if (active === tab) {
            return true;
        }
        return active === tab?.id || active === tab?.value || active === tab?.url || active === tab?.label;
    }
}
