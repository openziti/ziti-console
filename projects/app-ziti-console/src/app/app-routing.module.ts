import {NgModule} from '@angular/core';
import {RouterModule, Routes, mapToCanActivate} from '@angular/router';
import {PageNotFoundComponent} from "./page-not-found/page-not-found.component";
import {LoginComponent} from "./login/login.component";
import {
  ConfigurationsPageComponent,
  ZacWrapperComponent,
  IdentitiesPageComponent,
  DeactivateGuardService,
  EdgeRoutersPageComponent,
  ServicesPageComponent
} from "ziti-console-lib";
import {environment} from "./environments/environment";
import {URLS} from "./app-urls.constants";
import {AuthenticationGuard} from "./guards/authentication.guard";

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'login',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'attributes',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'identities',
    component: IdentitiesPageComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    canDeactivate: [DeactivateGuardService],
  },
  {
    path: 'jwt-signers',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'services',
    component: ServicesPageComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'routers',
    component: EdgeRoutersPageComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'transit-routers',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'config-types',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'configs',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'recipies',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'terminators',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'service-policies',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'router-policies',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'service-policies',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'auth-policies',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'certificate-authorities',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'service-router-policies',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'posture-checks',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'recipes',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'organization',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'profile',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'servers',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'sessions',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'api-sessions',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'settings',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
  },
  {
    path: 'custom-fields',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
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
