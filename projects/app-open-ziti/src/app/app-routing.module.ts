import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {PageNotFoundComponent} from "./page-not-found/page-not-found.component";
import {authenticationGuard} from "./authentication.guard";
import {ZacWrapperComponent} from "../../../consoleLib/src/lib/zac-wrapper.component";

const routes: Routes = [
  {
    path: '',
    redirectTo: 'ziti-dashboard',
    pathMatch: 'full'
  },
  {
    path: 'ziti-dashboard',
    component: ZacWrapperComponent,
    canActivate: [authenticationGuard],
  },
  {
    path: 'ziti-identities',
    component: ZacWrapperComponent,
    canActivate: [authenticationGuard],
  },
  {
    path: 'ziti-jwt-signers',
    component: ZacWrapperComponent,
    canActivate: [authenticationGuard],
  },
  {
    path: 'ziti-services',
    component: ZacWrapperComponent,
    canActivate: [authenticationGuard],
  },
  {
    path: 'ziti-routers',
    component: ZacWrapperComponent,
    canActivate: [authenticationGuard],
  },
  {
    path: 'ziti-transit-routers',
    component: ZacWrapperComponent,
    canActivate: [authenticationGuard],
  },
  {
    path: 'ziti-configs',
    component: ZacWrapperComponent,
    canActivate: [authenticationGuard],
  },
  {
    path: 'ziti-recipes',
    component: ZacWrapperComponent,
    canActivate: [authenticationGuard],
  },
  {
    path: 'ziti-terminators',
    component: ZacWrapperComponent,
    canActivate: [authenticationGuard],
  },
  {
    path: 'ziti-service-policies',
    component: ZacWrapperComponent,
  },
  {
    path: 'ziti-router-policies',
    component: ZacWrapperComponent,
    canActivate: [authenticationGuard],
  },
  {
    path: 'ziti-service-router-policies',
    component: ZacWrapperComponent,
    canActivate: [authenticationGuard],
  },
  {
    path: 'ziti-auth-policies',
    component: ZacWrapperComponent,
    canActivate: [authenticationGuard],
  },
  {
    path: 'ziti-posture-checks',
    component: ZacWrapperComponent,
    canActivate: [authenticationGuard],
  },
  {
    path: 'ziti-certificate-authorities',
    component: ZacWrapperComponent,
    canActivate: [authenticationGuard],
  },
  {
    path: 'ziti-organization',
    component: ZacWrapperComponent,
    canActivate: [authenticationGuard],
  },
  {
    path: 'ziti-profile',
    component: ZacWrapperComponent,
    canActivate: [authenticationGuard],
  },
  {
    path: 'ziti-servers',
    component: ZacWrapperComponent,
    canActivate: [authenticationGuard],
  },
  {
    path: 'ziti-sessions',
    component: ZacWrapperComponent,
    canActivate: [authenticationGuard],
  },
  {
    path: 'ziti-settings',
    component: ZacWrapperComponent,
    canActivate: [authenticationGuard],
  },
  {
    path: 'ziti-config-types',
    component: ZacWrapperComponent,
    canActivate: [authenticationGuard],
  },
  {
    path: 'ziti-login',
    component: ZacWrapperComponent,
  },
  {
    path: '**',
    component: PageNotFoundComponent,
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes,
    {enableTracing: true})],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
