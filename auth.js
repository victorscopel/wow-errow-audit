// ══════════════════════════════════════════════════════════
//  GUILDAUDIT — auth.js
//  Battle.net OAuth + JWT permission system
// ══════════════════════════════════════════════════════════

function initAuth() {
    var params = new URLSearchParams(window.location.search);
    var token = params.get('token');
    if (token) {
        localStorage.setItem('ga_jwt', token);
        window.history.replaceState({}, '', window.location.pathname);
    }
    var err = params.get('auth_error');
    if (err) {
        window.history.replaceState({}, '', window.location.pathname);
        setTimeout(function () { notify('Login error: ' + err); }, 500);
    }
    applyPermissions();
}

function getUser() {
    var jwt = localStorage.getItem('ga_jwt');
    if (!jwt) return null;
    try {
        var parts = jwt.split('.');
        if (parts.length !== 3) return null;
        var payload = JSON.parse(atob(parts[1]));
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            localStorage.removeItem('ga_jwt');
            return null;
        }
        return payload;
    } catch (e) {
        localStorage.removeItem('ga_jwt');
        return null;
    }
}

function applyPermissions() {
    var user = getUser();
    var perm = user ? (user.perm || 'guest') : 'guest';
    window._perm = perm;

    document.body.classList.remove('is-admin', 'is-officer');
    if (perm === 'admin') document.body.classList.add('is-admin');
    if (perm === 'officer') document.body.classList.add('is-officer');
    if (perm === 'admin') document.body.classList.add('is-officer');

    var loginBtn = document.getElementById('btn-login');
    var userInfo = document.getElementById('user-info');
    if (loginBtn && userInfo) {
        if (user) {
            loginBtn.style.display = 'none';
            userInfo.style.display = 'flex';
            var nameEl = document.getElementById('user-battletag');
            if (nameEl) nameEl.textContent = user.battletag || '?';
            var permEl = document.getElementById('user-perm');
            if (permEl) {
                permEl.textContent = perm;
                permEl.className = 'perm-badge perm-' + perm;
            }
        } else {
            loginBtn.style.display = '';
            userInfo.style.display = 'none';
        }
    }
}

function loginBattleNet() {
    var api = JSON.parse(localStorage.getItem('ga_api') || '{}');
    var proxy = api.proxy || 'https://midnight.victorscopel.workers.dev';
    var workerUrl = proxy.replace(/\/+$/, '');
    window.location.href = workerUrl + '/auth/login';
}

function logoutBattleNet() {
    localStorage.removeItem('ga_jwt');
    window.location.reload();
}
