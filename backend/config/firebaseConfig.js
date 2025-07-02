// backend/config/firebaseConfig.js

// Importa o Firebase Admin SDK
const admin = require('firebase-admin');

// Verifica se a variável de ambiente FIREBASE_SERVICE_ACCOUNT está definida
// É crucial que esta variável seja configurada no Render.com com o JSON das credenciais
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('Erro: A variável de ambiente FIREBASE_SERVICE_ACCOUNT não está definida.');
  console.error('Por favor, configure-a no Render.com com o conteúdo do seu arquivo JSON de chave privada do Firebase.');
  // Em um ambiente de produção, você pode querer encerrar a aplicação aqui
  // process.exit(1);
}

// Analisa o JSON das credenciais da variável de ambiente
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Inicializa o Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Obtém uma referência para o banco de dados Firestore
const db = admin.firestore();

// Exporta a instância do Firestore para ser usada em outros módulos
module.exports = db;
