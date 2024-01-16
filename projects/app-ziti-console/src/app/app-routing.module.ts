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
    component: ServicesPageComponent,
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
