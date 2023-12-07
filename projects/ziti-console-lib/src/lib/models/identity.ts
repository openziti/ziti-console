export class Identity {
    name = '';
    type = 'Device';
    appData = {};
    isAdmin = false;
    roleAttributes = [];
    authPolicyId = "default";
    externalId = "";
    defaultHostingCost = 0;
    defaultHostingPrecedence = 'default';
    tags = {};
    enrollment = {
        ott: true
    };
};