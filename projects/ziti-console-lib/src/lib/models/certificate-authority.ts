export class CertificateAuthority {
    name: string = '';
    id: string = '';
    isAutoCaEnrollmentEnabled: boolean = false;
    isOttCaEnrollmentEnabled: boolean = false;
    identityRoles: any[] = [];
    identityNameFormat: string = '';
    isAuthEnabled: boolean = false;
    certPem: string = '';
    externalIdClaim: any = undefined;
    tags: any = {};
    verificationToke: string = '';
}