export class AuthPolicy {
    name: string = '';
    id: string = '';
    primary: any = {
        cert: {
            allowed: false,
            allowExpiredCerts: false,
        },
        extJwt: {
            allowed: false,
            allowedSigners: []
        },
        updb: {
            allowed: false,
            lockoutDurationMinutes: 0,
            maxAttempts: 5,
            minPasswordLength: 5,
            requireMixedCase: false,
            requireNumberChar: false,
            requireSpecialChar: false
        }
    };
    secondary: any = {
        requireTotp: false,
        requireExtJwtSigner: undefined
    };
    tags: any = {}
}