const SUPABASE_URL = 'https://liocndowhpsmvtdyozuc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpb2NuZG93aHBzbXZ0ZHlvenVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjk5MDYsImV4cCI6MjA5NDk0NTkwNn0.6tH9lrd6WuBwyRWIagYh0xcI50YbxWA1ebOPrgMxZYA';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

let typeSelectionne = 'revenu';

// ---- ONGLETS AUTH ----
function showTab(tab) {
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('tab-login').className = 'tab' + (tab === 'login' ? ' active' : '');
  document.getElementById('tab-register').className = 'tab' + (tab === 'register' ? ' active' : '');
}

// ---- INSCRIPTION ----
async function register() {
  const prenom = document.getElementById('reg-prenom').value.trim();
  const nom = document.getElementById('reg-nom').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const msg = document.getElementById('auth-msg');

  if (!prenom || !nom || !email || !password) {
    msg.textContent = 'Veuillez remplir tous les champs.';
    return;
  }

  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { prenom, nom } }
  });

  if (error) {
    msg.textContent = error.message;
  } else {
    msg.className = 'msg success';
    msg.textContent = 'Compte créé ! Vérifiez votre email puis connectez-vous.';
  }
}

// ---- CONNEXION ----
async function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const msg = document.getElementById('auth-msg');

  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    msg.textContent = 'Email ou mot de passe incorrect.';
  } else {
    afficherApp(data.user);
  }
}

// ---- DÉCONNEXION ----
async function logout() {
  await sb.auth.signOut();
  document.getElementById('main-page').style.display = 'none';
  document.getElementById('auth-page').style.display = 'flex';
}

// ---- AFFICHER L'APP ----
function afficherApp(user) {
  document.getElementById('auth-page').style.display = 'none';
  document.getElementById('main-page').style.display = 'block';

  const prenom = user.user_metadata?.prenom || '';
  const nom = user.user_metadata?.nom || '';
  const nomComplet = (prenom + ' ' + nom).trim() || user.email;
  const initiales = (prenom[0] || '') + (nom[0] || '') || '?';

  document.getElementById('user-name').textContent = nomComplet;
  document.getElementById('user-avatar').textContent = initiales.toUpperCase();

  const mois = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  document.getElementById('solde-mois').textContent = mois.charAt(0).toUpperCase() + mois.slice(1);

  chargerTransactions(user.id);
}

// ---- TYPE DE TRANSACTION ----
function setType(type) {
  typeSelectionne = type;
  const btnR = document.getElementById('btn-revenu');
  const btnD = document.getElementById('btn-depense');
  btnR.className = 'type-btn' + (type === 'revenu' ? ' active-green' : '');
  btnD.className = 'type-btn' + (type === 'depense' ? ' active-red' : '');
}

// ---- AJOUTER TRANSACTION ----
async function ajouterTransaction() {
  const titre = document.getElementById('titre').value.trim();
  const montant = parseFloat(document.getElementById('montant').value);
  const categorie = document.getElementById('categorie').value;
  const msg = document.getElementById('form-msg');

  if (!titre || !montant || montant <= 0) {
    msg.className = 'msg';
    msg.textContent = 'Remplis bien la description et le montant.';
    return;
  }

  const { data: { user } } = await sb.auth.getUser();

  const { error } = await sb.from('transactions').insert([{
    user_id: user.id,
    titre,
    montant,
    type: typeSelectionne,
    categorie
  }]);

  if (error) {
    msg.className = 'msg';
    msg.textContent = 'Erreur : ' + error.message;
  } else {
    msg.className = 'msg success';
    msg.textContent = 'Transaction ajoutée avec succès !';
    document.getElementById('titre').value = '';
    document.getElementById('montant').value = '';
    setTimeout(() => { msg.textContent = ''; }, 2500);
    chargerTransactions(user.id);
  }
}

// ---- CHARGER TRANSACTIONS ----
async function chargerTransactions(userId) {
  const { data, error } = await sb
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) { console.error(error); return; }

  // Calcul solde
  let revenus = 0, depenses = 0;
  (data || []).forEach(t => {
    if (t.type === 'revenu') revenus += Number(t.montant);
    else depenses += Number(t.montant);
  });
  const solde = revenus - depenses;

  document.getElementById('solde').textContent = solde.toLocaleString('fr-FR') + ' FCFA';
  document.getElementById('total-revenus').textContent = revenus.toLocaleString('fr-FR') + ' FCFA';
  document.getElementById('total-depenses').textContent = depenses.toLocaleString('fr-FR') + ' FCFA';

  // Affichage liste
  const liste = document.getElementById('liste');
  if (!data || data.length === 0) {
    liste.innerHTML = '<p class="vide">Aucune transaction pour l\'instant.<br>Ajoutez votre premier revenu ou dépense !</p>';
    return;
  }

  const icones = {
    Salaire: '💼', Alimentation: '🍽️', Transport: '🚗',
    Loisirs: '🎉', Santé: '🏥', Logement: '🏠', Autre: '📦'
  };

  liste.innerHTML = data.map(t => `
    <div class="trans-item">
      <div class="trans-icon ${t.type === 'revenu' ? 'green-bg' : 'red-bg'}">
        ${icones[t.categorie] || '📦'}
      </div>
      <div class="trans-info">
        <div class="trans-name">${t.titre}</div>
        <div class="trans-cat">${t.categorie} · ${new Date(t.created_at).toLocaleDateString('fr-FR')}</div>
      </div>
      <div class="trans-right">
        <span class="trans-amount ${t.type === 'revenu' ? 'green' : 'red'}">
          ${t.type === 'revenu' ? '+' : '-'}${Number(t.montant).toLocaleString('fr-FR')}
        </span>
        <button class="btn-del" onclick="supprimer('${t.id}')" title="Supprimer">×</button>
      </div>
    </div>
  `).join('');
}

// ---- SUPPRIMER ----
async function supprimer(id) {
  if (!confirm('Supprimer cette transaction ?')) return;
  const { data: { user } } = await sb.auth.getUser();
  await sb.from('transactions').delete().eq('id', id);
  chargerTransactions(user.id);
}

// ---- DÉMARRAGE ----
sb.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    afficherApp(session.user);
  }
});
