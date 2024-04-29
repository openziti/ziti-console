import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import { MatDialogModule } from '@angular/material/dialog';
//import { CalendarModule } from 'primeng/calendar';
import { MatNativeDateModule } from '@angular/material/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { IdentityServicePathComponent } from './identity-service-path.component';

@NgModule({
    declarations: [IdentityServicePathComponent],
    exports: [IdentityServicePathComponent],
    imports: [
        MatButtonModule,
        MatIconModule,
        CalendarModule,
        CommonModule,
        FormsModule,
        UiLoaderModule,
        RouterModule,
        MatSelectModule,
        MatInputModule,
        MatDialogModule,
        MatAutocompleteModule,
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        ReactiveFormsModule,
        MatDatepickerModule,
        MatNativeDateModule,
    ],
})
export class IdentityServicePathModule {}
