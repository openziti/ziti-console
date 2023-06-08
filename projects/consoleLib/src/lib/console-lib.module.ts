import { NgModule } from '@angular/core';
import {ZacWrapperComponent} from "./zac-wrapper.component";
import {SafePipe} from "./safe.pipe";



@NgModule({
  declarations: [
    ZacWrapperComponent,
    SafePipe
  ],
  imports: [
  ],
  exports: [
    ZacWrapperComponent
  ]
})
export class ConsoleLibModule { }
