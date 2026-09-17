// ============================================================
// Gam — Frontend vanilla JS
// Conecta ao backend Node.js (server.js) na mesma origem.
// ============================================================

const API = "";
let tab = "login";
let loading = false;

const $ = (id) => document.getElementById(id);

const TAB_LABELS = {
  login: {
    title: "Bem-vindo de volta",
    sub: "Faça login para continuar",
    btn: "Entrar"
  },
  register: {
    title: "Crie sua conta",
    sub: "Seus dados serão salvos no Google Sheets",
    btn: "Pronto"
  },
  forgot: {
    title: "Recuperação de acesso",
    sub: "Enviaremos uma nova senha para seu e-mail",
    btn: "Enviar Nova Senha"
  }
};

function init() {
  $("auth-form").addEventListener("submit", handleSubmit);
  $("senha").addEventListener("input", updateReqs);
  $("toggle-pass").addEventListener("click", togglePassword);
  $("logout-btn").addEventListener("click", logout);

  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => setTab(button.dataset.tab));
  });

  if (localStorage.getItem("gam_token")) {
    showPainel();
  } else {
    showAuth();
    setTab("login");
  }
}

function setTab(id) {
  if (!TAB_LABELS[id]) return;
  tab = id;

  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === id);
  });

  const label = TAB_LABELS[id];
  $("form-title").textContent = label.title;
  $("form-sub").textContent = label.sub;
  $("btn-text").textContent = label.btn;

  $("senha-field").classList.toggle("hidden", id === "forgot");
  $("confirm-field").classList.toggle("hidden", id !== "register");
  $("reqs").classList.toggle("hidden", id !== "register");

  $("error-box").classList.add("hidden");
  $("success-box").classList.add("hidden");
  $("senha").value = "";
  $("confirmar").value = "";
  $("senha").required = id !== "forgot";
  $("confirmar").required = id === "register";

  renderLinks();
  updateReqs();
  $("email").focus();
}

function renderLinks() {
  const el = $("links");

  if (tab === "login") {
    el.innerHTML = `
      <a href="#" data-action="forgot">Esqueci minha senha</a>
      <div class="sub">Não tem uma conta? <a href="#" data-action="register">Cadastre-se</a></div>`;
  } else if (tab === "register") {
    el.innerHTML = `Já possui conta? <a href="#" data-action="login">Voltar ao Login</a>`;
  } else {
    el.innerHTML = `<a href="#" data-action="login">Voltar ao Login</a>`;
  }

  el.querySelectorAll("[data-action]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      setTab(link.dataset.action);
    });
  });
}

function updateReqs() {
  if (tab !== "register") return;

  const value = $("senha").value;
  const requirements = {
    length: value.length >= 8,
    upper: /[A-Z]/.test(value),
    num: /[0-9]/.test(value)
  };

  document.querySelectorAll("#reqs li").forEach((li) => {
    li.classList.toggle("ok", Boolean(requirements[li.dataset.req]));
  });
}

function togglePassword() {
  const input = $("senha");
  const icon = $("toggle-pass i");
  const showing = input.type === "text";
  input.type = showing ? "password" : "text";
  icon.className = showing ? "bx bx-show" : "bx bx-hide";
  $("toggle-pass").setAttribute("aria-label", showing ? "Mostrar senha" : "Ocultar senha");
}

async function handleSubmit(event) {
  event.preventDefault();
  if (loading) return;

  hideMessages();

  const email = $("email").value.trim();
  const senha = $("senha").value;
  const confirmar = $("confirmar").value;

  if (!email) return showError("Informe seu e-mail.");

  if (tab !== "forgot" && !senha) {
    return showError("Informe sua senha.");
  }

  if (tab === "register") {
    if (senha.length < 8 || !/[A-Z]/.test(senha) || !/[0-9]/.test(senha)) {
      return showError("A senha não atende aos requisitos de segurança.");
    }
    if (senha !== confirmar) {
      return showError("As senhas não coincidem.");
    }
  }

  setLoading(true);
  showSync("syncing");

  const endpoint = tab === "login"
    ? "/api/login"
    : tab === "register"
      ? "/api/cadastrar"
      : "/api/recuperar-senha";

  const body = tab === "forgot" ? { email } : { email, senha };

  try {
    const response = await fetch(API + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      showSync("idle");
      return showError(data.erro || "Erro ao processar a solicitação.");
    }

    if (tab === "login") {
      if (!data.token) {
        showSync("idle");
        return showError("O servidor não retornou o token de acesso.");
      }

      localStorage.setItem("gam_token", data.token);
      localStorage.setItem("gam_email", data.email || email);
      showSync("synced");
      setTimeout(showPainel, 450);
    } else if (tab === "register") {
      showSync("synced");
      showSuccess("Conta criada com sucesso! Faça login para continuar.");
      setTimeout(() => setTab("login"), 900);
    } else {
      showSync("synced");
      showSuccess(data.mensagem || "Se o e-mail existir, uma nova senha foi enviada.");
      $("email").value = "";
    }
  } catch (error) {
    console.error(error);
    showSync("idle");
    showError("Não foi possível conectar ao servidor. Verifique se o server.js está rodando.");
  } finally {
    setLoading(false);
    setTimeout(() => showSync("idle"), 2500);
  }
}

function setLoading(value) {
  loading = value;
  $("submit-btn").disabled = value;
  $("btn-text").textContent = value ? "Aguarde..." : TAB_LABELS[tab].btn;
}

function hideMessages() {
  $("error-box").classList.add("hidden");
  $("success-box").classList.add("hidden");
}

function showError(message) {
  const element = $("error-box");
  element.textContent = message;
  element.classList.remove("hidden");
}

function showSuccess(message) {
  const element = $("success-box");
  element.textContent = message;
  element.classList.remove("hidden");
}

function showSync(state) {
  const element = $("sync-toast");

  if (state === "idle") {
    element.classList.add("hidden");
    return;
  }

  element.classList.remove("hidden");
  element.classList.toggle("synced", state === "synced");
  element.innerHTML = state === "syncing"
    ? `<span class="spinner"></span> Sincronizando com o Google Sheets...`
    : `✓ Sincronizado com o Google Sheets`;
}

function showAuth() {
  $("auth-screen").classList.remove("hidden");
  $("painel-screen").classList.add("hidden");
}

function showPainel() {
  $("auth-screen").classList.add("hidden");
  $("painel-screen").classList.remove("hidden");
  $("user-email").innerHTML = `<i class="bx bx-envelope"></i> ${escapeHtml(localStorage.getItem("gam_email") || "")}`;
}

function logout() {
  localStorage.removeItem("gam_token");
  localStorage.removeItem("gam_email");
  showAuth();
  setTab("login");
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", init);
