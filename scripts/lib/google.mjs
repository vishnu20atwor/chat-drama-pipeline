// One refresh-token exchange, shared by upload.mjs and geo.mjs. The token's
// scopes are whatever the consent flow granted when it was issued — adding a
// scope to the consent screen later does not upgrade an existing token.
export const accessToken = async () => {
  const {YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN} = process.env;
  for (const [k, v] of Object.entries({YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN})) {
    if (!v) throw new Error(`${k} is not set`);
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      client_id: YT_CLIENT_ID,
      client_secret: YT_CLIENT_SECRET,
      refresh_token: YT_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    // invalid_grant is the one that actually happens, and the generic message
    // gives no clue what to do. Google revokes a refresh token when the account
    // password changes, when access is withdrawn at myaccount.google.com, or
    // when it was issued while the OAuth app was still in Testing status -
    // those expire after seven days no matter what.
    if (/invalid_grant/.test(body)) {
      throw new Error(
        'YT_REFRESH_TOKEN is dead (invalid_grant). Mint a new one at ' +
          'developers.google.com/oauthplayground with the youtube.upload and ' +
          'youtube.force-ssl scopes, then replace the YT_REFRESH_TOKEN secret.'
      );
    }
    throw new Error(`token refresh failed: ${body}`);
  }
  return (await res.json()).access_token;
};

export const gapi = async (token, url, init = {}) => {
  const res = await fetch(url, {
    ...init,
    headers: {authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init.headers || {})},
  });
  const body = await res.text();
  if (!res.ok) {
    const err = new Error(`${res.status} ${url.split('?')[0]}: ${body}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body ? JSON.parse(body) : {};
};
