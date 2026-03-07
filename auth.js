// ══════════════════════════════════════════════════════════
//  GUILDAUDIT — auth.js
//  Battle.net OAuth + JWT permission system (multi-guild)
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

function hasPerm(required) {
    var p = window._perm || 'guest';
    if (required === 'officer') return p === 'officer' || p === 'admin';
    if (required === 'admin')   return p === 'admin';
    return true;
}

function applyPermissions() {
    var user = getUser();
    var perm = user ? (user.perm || 'guest') : 'guest';
    window._perm = perm;

    document.body.classList.remove('is-admin', 'is-officer');
    if (perm === 'admin')   document.body.classList.add('is-admin', 'is-officer');
    if (perm === 'officer') document.body.classList.add('is-officer');

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
    var cfg = getAPICfg();
    var guildParam = cfg.region + ':' + cfg.realm + ':' + cfg.guild;
    // APP_URL in the worker already points to the GH Pages root with repo path
    window.location.href = cfg.workerBase + '/auth/login?guild=' + encodeURIComponent(guildParam);
}

function logoutBattleNet() {
    localStorage.removeItem('ga_jwt');
    window.location.reload();
}

function getHomeUrl() {
    var cfg = getAPICfg();
    return (cfg.basePath || '') + '/';
}
