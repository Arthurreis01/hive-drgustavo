// Inicializa Firebase com suas credenciais
const firebaseConfig = {
  apiKey: "AIzaSyAfg1wkI8y0ivoFvnawMVo3rNuvWyePUEs",
  authDomain: "drgustavo-b8f6f.firebaseapp.com",
  projectId: "drgustavo-b8f6f",
  storageBucket: "drgustavo-b8f6f.firebasestorage.app",
  messagingSenderId: "334453414199",
  appId: "1:334453414199:web:fcb8cc766a33bb41bae2b2",
  measurementId: "G-4ELGD1RRLR"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Elementos do DOM
const loginForm     = document.getElementById('loginForm');
const emailInput    = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const errorMessage  = document.getElementById('errorMessage');

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  errorMessage.textContent = '';

  const email = emailInput.value.trim();
  const pass  = passwordInput.value;

  try {
    await auth.signInWithEmailAndPassword(email, pass);
    // Redirecione para sua página principal após o login
    window.location.href = 'app.html';
  } catch (err) {
    // Mensagens de erro amigáveis
    const code = err.code || '';
    if (code === 'auth/invalid-email') {
      errorMessage.textContent = 'E-mail inválido.';
    } else if (code === 'auth/user-not-found') {
      errorMessage.textContent = 'Usuário não encontrado.';
    } else if (code === 'auth/wrong-password') {
      errorMessage.textContent = 'Senha incorreta.';
    } else {
      errorMessage.textContent = 'Falha no login. Tente novamente.';
    }
  }
});
