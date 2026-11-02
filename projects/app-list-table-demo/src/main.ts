import {bootstrapApplication} from '@angular/platform-browser';
import {provideAnimations} from '@angular/platform-browser/animations';
import {provideRouter} from '@angular/router';

import {AppComponent} from './app/app.component';

// Standalone bootstrap: the only providers the table needs are animations (Material datepicker /
// tooltip) and a Router (its DataTableFilterService reflects filters into the URL). No library
// NgModule and none of its heavy peers are referenced, so the bundler drops them.
bootstrapApplication(AppComponent, {
    providers: [provideAnimations(), provideRouter([])],
}).catch(err => console.error(err));
