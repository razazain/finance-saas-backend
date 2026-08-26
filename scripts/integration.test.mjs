import assert from 'assert';

const BASE = 'http://localhost:5000';

const log = (name, ok, data) => {
  console.log(`== ${name} : ${ok ? 'OK' : 'FAIL'}`);
  if (!ok) console.log(data);
};

const parseSetCookie = (headers, name) => {
  const sc = headers.get('set-cookie');
  if (!sc) return null;
  // set-cookie may contain multiple cookies separated by comma; find cookie name
  const parts = sc.split(',').map(s => s.trim());
  for (const p of parts) {
    if (p.startsWith(name + '=')) {
      return p.split(';')[0].split('=')[1];
    }
  }
  return null;
};

const run = async () => {
  try {
    // Health
    const h = await fetch(BASE + '/health');
    const hjson = await h.json();
    log('/health', h.status === 200 && hjson.success, hjson);

    // Register (unique email)
    const ts = Date.now();
    const email = `test+${ts}@example.com`;
    const regRes = await fetch(BASE + '/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Integration Test',
        email,
        password: 'TestPass123!',
        businessName: `TestBiz ${ts}`
      })
    });

    const regJson = await regRes.json();

    if (regRes.status === 201) {
      log('register', true, regJson);
    } else if (regRes.status === 409) {
      log('register (exists)', true, regJson);
    } else {
      log('register', false, regJson);
    }

    // Login
    const loginRes = await fetch(BASE + '/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'TestPass123!' })
    });

    const loginJson = await loginRes.json();
    log('login', loginRes.status === 200 && loginJson.data?.accessToken, loginJson);

    const accessToken = loginJson.data?.accessToken;
    const rawSetCookie = loginRes.headers.get('set-cookie');
    // get cookie value
    let refreshTokenCookie = null;
    if (rawSetCookie) {
      const m = rawSetCookie.match(/refreshToken=([^;]+)/);
      if (m) refreshTokenCookie = `refreshToken=${m[1]}`;
    }

    // Refresh
    const refreshRes = await fetch(BASE + '/api/v1/auth/refresh', {
      method: 'POST',
      headers: refreshTokenCookie ? { Cookie: refreshTokenCookie } : {}
    });

    const refreshJson = await refreshRes.json();
    log('refresh', refreshRes.status === 200 && refreshJson.data?.accessToken, refreshJson);

    // Logout
    const logoutRes = await fetch(BASE + '/api/v1/auth/logout', {
      method: 'POST',
      headers: refreshTokenCookie ? { Cookie: refreshTokenCookie } : {}
    });
    const logoutJson = await logoutRes.json();
    log('logout', logoutRes.status === 200 && logoutJson.success === true, logoutJson);

    // Use login access token to create a user
    if (!accessToken) {
      console.log('Skipping user tests because no access token');
      process.exit(0);
    }

    const createUserRes = await fetch(BASE + '/api/v1/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        name: 'Employee One',
        email: `emp+${ts}@example.com`,
        password: 'EmployeePass1!',
        role: 'employee'
      })
    });

    const createUserJson = await createUserRes.json();
    log('create user', createUserRes.status === 201, createUserJson);

    // List users
    const listRes = await fetch(BASE + '/api/v1/users', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const listJson = await listRes.json();
    log('list users', listRes.status === 200, listJson);

    // If created user, attempt update
    const newUserId = createUserJson.data?.user?.id;
    if (newUserId) {
      const patchRes = await fetch(BASE + `/api/v1/users/${newUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ name: 'Employee One Edited' })
      });
      const patchJson = await patchRes.json();
      log('update user', patchRes.status === 200, patchJson);

      const statusRes = await fetch(BASE + `/api/v1/users/${newUserId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ isActive: false })
      });
      const statusJson = await statusRes.json();
      log('update user status', statusRes.status === 200, statusJson);
    }

    console.log('Integration tests completed');
    process.exit(0);
  } catch (err) {
    console.error('Test runner error', err);
    process.exit(2);
  }
};

run();
