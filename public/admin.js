/**
 * Admin Dashboard — Doe por Eles
 * Login, lista de doações, métricas (somente leitura)
 */

(function () {
  'use strict';

  var API = '/api/admin';
  var TOKEN_KEY = 'admin_token';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function api(path, options) {
    options = options || {};
    var headers = options.headers || {};
    headers['Content-Type'] = 'application/json';
    var token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(API + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
  }

  function formatBRL(centavos) {
    var reais = (centavos || 0) / 100;
    return reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function formatDate(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    return d.toLocaleString('pt-BR');
  }

  var loginView = document.getElementById('login-view');
  var dashboardView = document.getElementById('dashboard-view');
  var loginForm = document.getElementById('login-form');
  var loginError = document.getElementById('login-error');
  var loginBtn = document.getElementById('login-btn');
  var logoutBtn = document.getElementById('logout-btn');
  var donationsTbody = document.getElementById('donations-tbody');
  var donationsLoading = document.getElementById('donations-loading');
  var donationsError = document.getElementById('donations-error');

  var chartInstance = null;

  function showLogin() {
    loginView.hidden = false;
    dashboardView.hidden = true;
  }
  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    loadStats();
    loadDonations();
  }

  function setLoading(loading) {
    loginBtn.disabled = loading;
    loginBtn.textContent = loading ? 'Entrando...' : 'Entrar';
  }

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    loginError.hidden = true;
    var email = document.getElementById('email').value.trim();
    var password = document.getElementById('password').value;
    if (!email || !password) {
      loginError.textContent = 'Preencha email e senha.';
      loginError.hidden = false;
      return;
    }
    setLoading(true);
    try {
      var res = await api('/login', {
        method: 'POST',
        body: { email: email, password: password }
      });
      var data = await res.json();
      if (!res.ok) {
        loginError.textContent = data.error || 'Erro ao entrar.';
        loginError.hidden = false;
        return;
      }
      setToken(data.token);
      showDashboard();
    } catch (err) {
      loginError.textContent = 'Erro de conexão. Tente novamente.';
      loginError.hidden = false;
    } finally {
      setLoading(false);
    }
  });

  logoutBtn.addEventListener('click', function () {
    removeToken();
    showLogin();
  });

  var donations = [];
  var stats = { total_confirmed: 0, total_refunded: 0, amount_confirmed: 0, goal: 0 };

  function renderMetricsFromStats() {
    document.getElementById('metric-total').textContent = formatBRL(stats.amount_confirmed);
    document.getElementById('metric-count').textContent = stats.total_confirmed;
    document.getElementById('metric-refunded').textContent = stats.total_refunded;
    document.getElementById('metric-goal').textContent = formatBRL(stats.goal);
  }

  function renderChart() {
    var canvas = document.getElementById('chart-donations');
    if (!canvas || !window.Chart) return;
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Confirmadas', 'Estornadas'],
        datasets: [{
          label: 'Quantidade',
          data: [stats.total_confirmed, stats.total_refunded],
          backgroundColor: ['#2e7d32', '#c62828'],
          borderColor: ['#1b5e20', '#b71c1c'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  async function loadStats() {
    var wrap = document.getElementById('metrics-wrap');
    var loading = document.getElementById('stats-loading');
    var errEl = document.getElementById('stats-error');
    if (wrap) wrap.style.opacity = '0.5';
    if (loading) loading.hidden = false;
    if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
    try {
      var res = await api('/stats');
      if (res.status === 401) {
        removeToken();
        showLogin();
        return;
      }
      var data;
      try {
        data = await res.json();
      } catch (parseErr) {
        throw new Error('Resposta inválida do servidor');
      }
      if (!res.ok) {
        if (errEl) {
          errEl.textContent = (data && data.error) ? data.error : 'Não foi possível carregar as métricas. Tente novamente.';
          errEl.hidden = false;
        }
        return;
      }
      stats = {
        total_confirmed: data.total_confirmed || 0,
        total_refunded: data.total_refunded || 0,
        amount_confirmed: data.amount_confirmed || 0,
        goal: data.goal || 0
      };
      renderMetricsFromStats();
      renderChart();
    } catch (err) {
      if (errEl) {
        errEl.textContent = err.message || 'Não foi possível conectar. Verifique sua internet e tente novamente.';
        errEl.hidden = false;
      }
    } finally {
      if (loading) loading.hidden = true;
      if (wrap) wrap.style.opacity = '1';
    }
  }

  function renderTable() {
    if (donations.length === 0) {
      donationsTbody.innerHTML = '<tr><td colspan="4">Nenhuma doação encontrada.</td></tr>';
      return;
    }
    donationsTbody.innerHTML = donations.map(function (d) {
      var statusClass = d.status === 'refunded' ? 'status-refunded' : 'status-confirmed';
      var statusLabel = d.status === 'refunded' ? 'Estornada' : 'Confirmada';
      return '<tr data-id="' + d.id + '">' +
        '<td>' + d.id + '</td>' +
        '<td>' + formatBRL(d.amount) + '</td>' +
        '<td><span class="status-badge ' + statusClass + '">' + statusLabel + '</span></td>' +
        '<td>' + formatDate(d.created_at) + '</td></tr>';
    }).join('');
  }

  async function loadDonations() {
    donationsLoading.hidden = false;
    donationsError.hidden = true;
    donationsError.textContent = '';
    try {
      var res = await api('/donations');
      if (res.status === 401) {
        removeToken();
        showLogin();
        return;
      }
      var data;
      try {
        data = await res.json();
      } catch (parseErr) {
        throw new Error('Resposta inválida do servidor');
      }
      if (!res.ok) {
        donationsError.textContent = (data && data.error) ? data.error : 'Não foi possível carregar as doações. Tente novamente.';
        donationsError.hidden = false;
        return;
      }
      donations = data.donations || [];
      renderTable();
    } catch (err) {
      donationsError.textContent = err.message || 'Não foi possível conectar. Verifique sua internet e tente novamente.';
      donationsError.hidden = false;
    } finally {
      donationsLoading.hidden = true;
    }
  }

  if (getToken()) {
    showDashboard();
  } else {
    showLogin();
  }
})();
