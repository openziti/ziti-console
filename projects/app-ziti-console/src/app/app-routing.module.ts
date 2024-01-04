import {NgModule} from '@angular/core';
import {RouterModule, Routes, mapToCanActivate} from '@angular/router';
import {PageNotFoundComponent} from "./page-not-found/page-not-found.component";
import {LoginComponent} from "./login/login.component";
import {
  ConfigurationsPageComponent,
  ZacWrapperComponent,
  IdentitiesPageComponent,
  DeactivateGuardService,
  EdgeRoutersPageComponent
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
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'attributes',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'identities',
    component: IdentitiesPageComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    canDeactivate: [DeactivateGuardService],
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'jwt-signers',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'services',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'routers',
    component: EdgeRoutersPageComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'transit-routers',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'config-types',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'configs',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'recipies',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'terminators',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'service-policies',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'router-policies',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'service-policies',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'auth-policies',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'certificate-authorities',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'service-router-policies',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'posture-checks',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'recipes',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'organization',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'profile',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'servers',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'sessions',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'api-sessions',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'settings',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'custom-fields',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: '**',
    component: PageNotFoundComponent,
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes,
      {enableTracing: true, onSameUrlNavigation: 'reload'})],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
