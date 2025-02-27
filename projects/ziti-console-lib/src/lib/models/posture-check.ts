export class PostureCheck {
    name = '';
    id: string;
    typeId = '';
    semantic: string = 'AllOf'
    roleAttributes: any[] = [];
    domains: any[] = []
    macAddresses: any[] = [];
    operatingSystems: any[] = [];
    processes: any[] = [{
        hashes: [],
        osType: '',
        path: '',
        signerFingerprints: []
    }];
    process: any = {
        hashes: [],
        osType: '',
        path: '',
        signerFingerprint: ''
    };
    timeoutSeconds: number = 0;
    tags: any = {};
};
