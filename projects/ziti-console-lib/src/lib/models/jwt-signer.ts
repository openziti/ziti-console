export class JwtSigner {
    name: string = '';
    audience: string = '';
    issuer: string = '';
    clientId: string = '';
    claimsProperty: string = '';
    enabled: boolean = true;
    useExternalId: boolean = false;
    externalAuthUrl: string = '';
    kid: string = '';
    scopes: string[] = [];
    jwksEndpoint: string = undefined;
    certPem: string = undefined;
    tags: any = {};
    targetToken: string = 'ACCESS';
};