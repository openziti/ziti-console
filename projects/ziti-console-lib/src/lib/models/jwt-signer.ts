export class JwtSigner {
    name: string = '';
    audience: string = '';
    issuer: string = '';
    certPem: string = '';
    claimsProperty: string = '';
    enabled: boolean = true;
    useExternalId: boolean = false;
    externalAuthUrl: string = '';
    kid: string = '';
    jwksEndpoint: string = undefined;
    tags: any = {};
};