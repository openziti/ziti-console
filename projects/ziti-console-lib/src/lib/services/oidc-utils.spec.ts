import {randomUrlSafeString, pkceChallengeS256, decodeJwtPayload, jwtExpMs, jwtIatMs} from './oidc-utils';

describe('oidc-utils', () => {
    describe('pkceChallengeS256', () => {
        it('produces the RFC 7636 appendix B challenge for the reference verifier', async () => {
            const challenge = await pkceChallengeS256('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk');
            expect(challenge).toEqual('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
        });
    });

    describe('randomUrlSafeString', () => {
        it('produces url-safe values of sufficient entropy', () => {
            const value = randomUrlSafeString();
            expect(value).toMatch(/^[A-Za-z0-9\-_]+$/);
            expect(value.length).toBeGreaterThanOrEqual(43); // 32 bytes base64url
            expect(randomUrlSafeString()).not.toEqual(value);
        });
    });

    describe('jwt decoding', () => {
        const makeJwt = (payload: any) =>
            `${btoa(JSON.stringify({alg: 'RS256'}))}.${btoa(JSON.stringify(payload))}.fakesig`;

        it('decodes a payload and extracts exp/iat in milliseconds', () => {
            const token = makeJwt({exp: 1700000000, iat: 1699998200, sub: 'admin'});
            expect(decodeJwtPayload(token)?.sub).toEqual('admin');
            expect(jwtExpMs(token)).toEqual(1700000000000);
            expect(jwtIatMs(token)).toEqual(1699998200000);
        });

        it('returns null/undefined for malformed or opaque tokens', () => {
            expect(decodeJwtPayload('not-a-jwt')).toBeNull();
            expect(decodeJwtPayload('')).toBeNull();
            expect(jwtExpMs('opaque-token')).toBeUndefined();
            expect(jwtExpMs(makeJwt({sub: 'no-exp'}))).toBeUndefined();
        });
    });
});
