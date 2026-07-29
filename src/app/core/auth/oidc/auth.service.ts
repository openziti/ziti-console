if (auth.isAuthedWithToken(token)) return false; // token based auth
else if (auth.isAuthedWithBearer()) return false; // bearer auth
return true;