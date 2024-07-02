export class ServicePolicy {
    name = '';
    serviceRoles: any[] = [];
    identityRoles: any[] = [];
    postureCheckRoles: any[] = [];
    semantic = 'AnyOf';
    type = 'Bind';
};