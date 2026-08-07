const response = await fetch('/auth/oidc', options);
const token = await response.json();
