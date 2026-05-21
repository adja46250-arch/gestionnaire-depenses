// ==============================
// REMPLACE CES DEUX VALEURS !
// ==============================
const SUPABASE_URL = 'https://liocndowhpsmvtdyozuc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpb2NuZG93aHBzbXZ0ZHlvenVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjk5MDYsImV4cCI6MjA5NDk0NTkwNn0.6tH9lrd6WuBwyRWIagYh0xcI50YbxWA1ebOPrgMxZYA';
// ==============================

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- AUTH ---
function showTab(tab) {
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'register' && i === 1));
  });
}

async function register() {
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const msg = document.getElementById('auth-message');
  const { error } = await sb.auth.signUp({ email, password });
  if (error) { msg.textContent = error.message; }
  else { msg.className = 'message success'; msg.textContent = 'Compte créé ! Vérifiez votre email puis connectez-vous.'; }
}

async function login() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const msg = document.getElementById('auth-message');
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { msg.textContent = 'Email ou mot de passe incorrect.'; }
  else { afficherAppli(); }
}

async function logout() {
  await sb.auth.signOut();
  document.getElementById('main-page').style.display = 'none';
  document.getElementById('auth-page').style.display = 'block';
}

// --- AFFICHAGE ---
async function afficherAppli() {
  document.getElementById('auth-page').style.display = 'none';
  document.getElementById('main-page').style.display = 'block';
  await chargerTransactions();
}

// --- TRANSACTIONS ---
async function chargerTransactions() {
  const { data: { user } } = await sb.auth.getUser();
  const { data } = await sb.from('transactions').select('*')
    .eq('user_id', user.id).order('created_at', { ascending: false });

  const liste = document.getElementById('transactions-list');
  if (!data || data.length === 0) {
    liste.innerHTML = '<p class="vide">Aucune transaction pour l\'instant.</p>';
    updateSolde([]);
    return;
  }
  updateSolde(data);
  liste.innerHTML = data.map(t => `
    <div class="transaction">
      <div class="trans-info">
        <div class="trans-titre">${t.titre}</div>
        <div class="trans-cat">${t.categorie} • ${new Date(t.created_at).toLocaleDateString('fr-FR')}</div>
      </div>
      <div class="trans-right">
        <span class="trans-montant ${t.type}">
          ${t.type === 'revenu' ? '+' : '-'}${Number(t.montant).toLocaleString('fr-FR')} FCFA
        </span>
        <button class="btn-delete" onclick="supprimer('${t.id}')">×</button>
      </div>
    </div>
  `).join('');
}

function updateSolde(transactions) {
  const revenus = transactions.filter(t => t.type === 'revenu').reduce((s, t) => s + Number(t.montant), 0);
  const depenses = transactions.filter(t => t.type === 'depense').reduce((s, t) => s + Number(t.montant), 0);
  const solde = revenus - depenses;
  document.getElementById('solde').textContent = solde.toLocaleString('fr-FR') + ' FCFA';
  document.getElementById('total-revenus').textContent = revenus.toLocaleString('fr-FR') + ' FCFA';
  document.getElementById('total-depenses').textContent = depenses.toLocaleString('fr-FR') + ' FCFA';
}

async function ajouterTransaction() {
  const titre = document.getElementById('titre').value.trim();
  const montant = parseFloat(document.getElementById('montant').value);
  const type = document.getElementById('type').value;
  const categorie = document.getElementById('categorie').value;
  const msg = document.getElementById('form-message');

  if (!titre || !montant) { msg.textContent = 'Remplis tous les champs !'; return; }

  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from('transactions').insert([{ user_id: user.id, titre, montant, type, categorie }]);

  if (error) { msg.textContent = 'Erreur lors de l\'ajout.'; }
  else {
    msg.className = 'message success'; msg.textContent = 'Transaction ajoutée !';
    document.getElementById('titre').value = '';
    document.getElementById('montant').value = '';
    setTimeout(() => { msg.textContent = ''; msg.className = 'message'; }, 2000);
    await chargerTransactions();
  }
}

async function supprimer(id) {
  await sb.from('transactions').delete().eq('id', id);
  await chargerTransactions();
}

// --- DÉMARRAGE ---
sb.auth.onAuthStateChange((event, session) => {
  if (session) afficherAppli();
});