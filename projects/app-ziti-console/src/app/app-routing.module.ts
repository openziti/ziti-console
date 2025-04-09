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
  ConfigTypeFormComponent,
  ConfigTypesPageComponent,
  ZacWrapperComponent,
  IdentitiesPageComponent,
  DeactivateGuardService,
  EdgeRoutersPageComponent,
  ServicesPageComponent,
  ServicePoliciesPageComponent,
  NetworkVisualizerComponent,
  EdgeRouterPoliciesPageComponent,
  IdentityFormComponent,
  EdgeRouterFormComponent,
  CardListComponent,
  ServiceFormComponent,
  SimpleServiceComponent,
  ConfigurationFormComponent,
  ServicePolicyFormComponent,
  EdgeRouterPolicyFormComponent,
  ServiceEdgeRouterPoliciesPageComponent,
  ServiceEdgeRouterPolicyFormComponent,
  TerminatorsPageComponent,
  TerminatorFormComponent,
  JwtSignersPageComponent,
  JwtSignerFormComponent,
  AuthPoliciesPageComponent,
  AuthPolicyFormComponent,
  CertificateAuthoritiesPageComponent,
  CertificateAuthorityFormComponent,
  VerifyCertificateComponent,
  PostureChecksPageComponent,
  PostureCheckFormComponent,
  TransitRoutersPageComponent,
  TransitRouterFormComponent,
  SessionsPageComponent,
  APISessionsPageComponent,
  SessionFormComponent,
  APISessionFormComponent
} from "ziti-console-lib";
import {environment} from "./environments/environment";
import {URLS} from "./app-urls.constants";
import {AuthenticationGuard} from "./guards/authentication.guard";
import {CallbackComponent} from "./login/callback.component";

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
    path: 'callback',
    component: CallbackComponent
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
    path: 'identities/:id',
    component: IdentityFormComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    canDeactivate: [DeactivateGuardService],
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'jwt-signers',
    component: JwtSignersPageComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    canDeactivate: [DeactivateGuardService],
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'jwt-signers/:id',
    component: JwtSignerFormComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    canDeactivate: [DeactivateGuardService],
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'jwt-signers/:id/test-auth',
    component: JwtSignerFormComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    canDeactivate: [DeactivateGuardService],
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'auth-policies',
    component: AuthPoliciesPageComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    canDeactivate: [DeactivateGuardService],
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'auth-policies/:id',
    component: AuthPolicyFormComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    canDeactivate: [DeactivateGuardService],
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'services',
    component: ServicesPageComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'services/simple',
    component: SimpleServiceComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'services/select',
    component: CardListComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'services/advanced',
    redirectTo: 'services/advanced/create',
    pathMatch: 'full'
  },
  {
    path: 'services/advanced/:id',
    component: ServiceFormComponent,
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
    path: 'routers/:id',
    component: EdgeRouterFormComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    canDeactivate: [DeactivateGuardService],
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'transit-routers',
    component: TransitRoutersPageComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    canDeactivate: [DeactivateGuardService],
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'transit-routers/:id',
    component: TransitRouterFormComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    canDeactivate: [DeactivateGuardService],
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'configs',
    component: ConfigurationsPageComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    canDeactivate: [DeactivateGuardService],
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'configs/:id',
    component: ConfigurationFormComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    canDeactivate: [DeactivateGuardService],
    runGuardsAndResolvers: 'always',
  },
  {
      path: 'config-types',
      component: ConfigTypesPageComponent,
      canActivate: mapToCanActivate([AuthenticationGuard]),
      canDeactivate: [DeactivateGuardService],
      runGuardsAndResolvers: 'always',
  },
  {
      path: 'config-types/:id',
      component: ConfigTypeFormComponent,
      canActivate: mapToCanActivate([AuthenticationGuard]),
      canDeactivate: [DeactivateGuardService],
      runGuardsAndResolvers: 'always',
  },
  {
    path: 'terminators',
    component: TerminatorsPageComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    canDeactivate: [DeactivateGuardService],
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'terminators/:id',
    component: TerminatorFormComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    canDeactivate: [DeactivateGuardService],
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
    path: 'terminators/:id',
    component: ZacWrapperComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'service-policies',
    component: ServicePoliciesPageComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'service-policies/:id',
    component: ServicePolicyFormComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'router-policies',
    component: EdgeRouterPoliciesPageComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'router-policies/:id',
    component: EdgeRouterPolicyFormComponent,
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
    component: CertificateAuthoritiesPageComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'certificate-authorities/:id',
    component: CertificateAuthorityFormComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    canDeactivate: [DeactivateGuardService],
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'certificate-authorities/:id/verify',
    component: VerifyCertificateComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    canDeactivate: [DeactivateGuardService],
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'service-router-policies',
    component: ServiceEdgeRouterPoliciesPageComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'service-router-policies/:id',
    component: ServiceEdgeRouterPolicyFormComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'posture-checks',
    component: PostureChecksPageComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'posture-checks/:id',
    component: PostureCheckFormComponent,
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
    path: 'network-visualizer',
    component: NetworkVisualizerComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'sessions',
    component: SessionsPageComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'sessions/:id',
    component: SessionFormComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'api-sessions',
    component: APISessionsPageComponent,
    canActivate: mapToCanActivate([AuthenticationGuard]),
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'api-sessions/:id',
    component: APISessionFormComponent,
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
