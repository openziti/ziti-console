export class PostureCheck {
    name = '';
    id: string;
    typeId = '';
    roleAttributes: any[] = [];
    domains: any[] = []
    macAddresses: any[] = [];
    operatingSystems: any[] = [];
    process: any = {
        hashes: [],
        osType: '',
        path: '',
        signerFingerprint: ''
    };
    timeoutSeconds: number = 0;
    tags: any = {};
};
