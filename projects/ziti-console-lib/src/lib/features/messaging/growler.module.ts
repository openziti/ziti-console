import { NgModule } from '@angular/core';
import {GrowlerComponent} from "./growler.component";
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";

@NgModule({
    imports: [CommonModule,FormsModule],
    declarations: [GrowlerComponent],
    exports: [GrowlerComponent],
})
export class GrowlerModule {}
