// GAM — Autenticação online com Supabase
const SUPABASE_URL = "https://bwodvtclltwvjioocxds.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_3am6xS-TaS81v4EboLXyQQ_AeJRj2wF";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const ADMIN_EMAIL = "kauafigueiro1901@gmail.com";
let tab = "login";
let loading = false;
const $ = (id) => document.getElementById(id);

const TAB_LABELS = {
  login: { title: "Bem-vindo de volta", sub: "Faça login para continuar", btn: "Entrar" },
  register: { title: "Crie sua conta", sub: "Cadastre-se para acessar a GAM", btn: "Criar conta" },
  forgot: { title: "Recuperação de acesso", sub: "Enviaremos um link para seu e-mail", btn: "Enviar link" }
};

async function init() {
  $("auth-form").addEventListener("submit", handleSubmit);
  $("senha").addEventListener("input", updateReqs);
  $("toggle-pass").addEventListener("click", togglePassword);
  $("logout-btn").addEventListener("click", logout);
  document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => setTab(button.dataset.tab)));

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    localStorage.setItem("gam_token", session.access_token);
    localStorage.setItem("gam_email", session.user.email || "");
    showPainel(session.user.email);
  } else {
    showAuth();
    setTab("login");
  }

  supabaseClient.auth.onAuthStateChange((_event, sessionData) => {
    if (sessionData) {
      localStorage.setItem("gam_token", sessionData.access_token);
      localStorage.setItem("gam_email", sessionData.user.email || "");
    }
  });
}

function setTab(id) {
  if (!TAB_LABELS[id]) return;
  tab = id;
  document.querySelectorAll(".tab").forEach((button) => button.classList.toggle("active", button.dataset.tab === id));
  const label = TAB_LABELS[id];
  $("form-title").textContent = label.title;
  $("form-sub").textContent = label.sub;
  $("btn-text").textContent = label.btn;
  $("senha-field").classList.toggle("hidden", id === "forgot");
  $("confirm-field").classList.toggle("hidden", id !== "register");
  $("reqs").classList.toggle("hidden", id !== "register");
  hideMessages();
  $("senha").value = "";
  $("confirmar").value = "";
  $("senha").required = id !== "forgot";
  $("confirmar").required = id === "register";
  renderLinks();
  updateReqs();
}

function renderLinks() {
  const el = $("links");
  if (tab === "login") {
    el.innerHTML = '<a href="#" data-action="forgot">Esqueci minha senha</a><div class="sub">Não tem uma conta? <a href="#" data-action="register">Cadastre-se</a></div>';
  } else if (tab === "register") {
    el.innerHTML = 'Já possui conta? <a href="#" data-action="login">Voltar ao Login</a>';
  } else {
    el.innerHTML = '<a href="#" data-action="login">Voltar ao Login</a>';
  }
  el.querySelectorAll("[data-action]").forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    setTab(link.dataset.action);
  }));
}

function updateReqs() {
  if (tab !== "register") return;
  const value = $("senha").value;
  const requirements = { length: value.length >= 8, upper: /[A-Z]/.test(value), num: /[0-9]/.test(value) };
  document.querySelectorAll("#reqs li").forEach((li) => li.classList.toggle("ok", Boolean(requirements[li.dataset.req])));
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
  const email = $("email").value.trim().toLowerCase();
  const senha = $("senha").value;
  const confirmar = $("confirmar").value;
  if (!email) return showError("Informe seu e-mail.");
  if (tab !== "forgot" && !senha) return showError("Informe sua senha.");
  if (tab === "register") {
    if (senha.length < 8 || !/[A-Z]/.test(senha) || !/[0-9]/.test(senha)) return showError("A senha precisa ter 8 caracteres, uma letra maiúscula e um número.");
    if (senha !== confirmar) return showError("As senhas não coincidem.");
  }

  setLoading(true);
  showSync("syncing");
  try {
    let result;
    if (tab === "register") {
      result = await supabaseClient.auth.signUp({ email, password: senha, options: { emailRedirectTo: window.location.origin + window.location.pathname } });
      if (result.error) throw result.error;
      showSync("synced");
      showSuccess(result.data.session ? "Conta criada!" : "Conta criada. Confira seu e-mail para confirmar o cadastro.");
      setTimeout(() => setTab("login"), 1800);
    } else if (tab === "login") {
      result = await supabaseClient.auth.signInWithPassword({ email, password: senha });
      if (result.error) throw result.error;
      const session = result.data.session;
      localStorage.setItem("gam_token", session.access_token);
      localStorage.setItem("gam_email", session.user.email || email);
      showSync("synced");
      setTimeout(() => showPainel(session.user.email || email), 350);
    } else {
      result = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
      if (result.error) throw result.error;
      showSync("synced");
      showSuccess("Se o e-mail estiver cadastrado, você receberá um link de recuperação.");
      $("email").value = "";
    }
  } catch (error) {
    console.error(error);
    showSync("idle");
    showError(traduzirErro(error));
  } finally {
    setLoading(false);
    setTimeout(() => showSync("idle"), 2800);
  }
}

function traduzirErro(error) {
  const message = String(error?.message || "");
  if (/Invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
  if (/User already registered/i.test(message)) return "Este e-mail já está cadastrado.";
  if (/Email not confirmed/i.test(message)) return "Confirme seu e-mail antes de entrar.";
  if (/Password should be at least/i.test(message)) return "A senha precisa ter pelo menos 8 caracteres.";
  return "Não foi possível concluir. Confira os dados e tente novamente.";
}

function setLoading(value) {
  loading = value;
  $("submit-btn").disabled = value;
  $("btn-text").textContent = value ? "Aguarde..." : TAB_LABELS[tab].btn;
}
function hideMessages() { $("error-box").classList.add("hidden"); $("success-box").classList.add("hidden"); }
function showError(message) { $("error-box").textContent = message; $("error-box").classList.remove("hidden"); }
function showSuccess(message) { $("success-box").textContent = message; $("success-box").classList.remove("hidden"); }
function showSync(state) {
  const element = $("sync-toast");
  if (state === "idle") return element.classList.add("hidden");
  element.classList.remove("hidden");
  element.classList.toggle("synced", state === "synced");
  element.innerHTML = state === "syncing" ? '<span class="spinner"></span> Conectando com a GAM...' : '✓ Operação concluída';
}
function showAuth() { $("auth-screen").classList.remove("hidden"); $("painel-screen").classList.add("hidden"); }
function showPainel(email) {
  // O painel inicial mantém a identidade visual e oferece acesso ao sistema gestor.
  $("auth-screen").classList.add("hidden");
  $("painel-screen").classList.remove("hidden");
  $("user-email").innerHTML = '<i class="bx bx-envelope"></i> ' + escapeHtml(email || localStorage.getItem("gam_email") || "");
  const card = document.querySelector(".painel-card");
  if (card && !$("go-gestor")) {
    const button = document.createElement("button");
    button.id = "go-gestor";
    button.className = "btn-primary";
    button.type = "button";
    button.textContent = "Acessar sistema GAM";
    button.addEventListener("click", () => window.location.href = "gestor.html");
    card.appendChild(button);
  }
}
async function logout() {
  await supabaseClient.auth.signOut();
  localStorage.removeItem("gam_token");
  localStorage.removeItem("gam_email");
  showAuth();
  setTab("login");
}
function escapeHtml(value) { const div = document.createElement("div"); div.textContent = value; return div.innerHTML; }
document.addEventListener("DOMContentLoaded", init);
