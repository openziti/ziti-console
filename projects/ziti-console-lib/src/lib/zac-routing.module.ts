import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ZacWrapperComponent} from "./features/wrappers/zac-wrapper.component";

const routes: Routes = [
    {
        path: '',
        component: ZacWrapperComponent,
    },
];

@NgModule({
    declarations: [],
    exports: [RouterModule],
    imports: [RouterModule.forChild(routes)],
})
export class ZacRoutingModule {
}
