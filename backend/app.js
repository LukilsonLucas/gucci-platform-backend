// backend/app.js

const express = require('express');
const bodyParser = require('body-parser');
const userController = require('./controllers/userController');

// Não precisamos importar 'db' ou 'initializeDb' aqui,
// pois a inicialização do Firestore é feita em firebaseConfig.js
// e o 'db' é importado diretamente nos controllers.
// const db = require('./database/database'); // REMOVA OU COMENTE ESTA LINHA
// const { initializeDb } = require('./database/database'); // REMOVA OU COMENTE ESTA LINHA

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para analisar corpos de solicitação JSON
app.use(bodyParser.json());

// Rota de cadastro de usuário
app.post('/register', userController.registerUser);

// Rota de teste simples para verificar se o servidor está funcionando
app.get('/', (req, res) => {
  res.send('Backend da plataforma Gucci está online e funcionando!');
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Não precisamos mais chamar initializeDb() aqui,
// pois o Firestore é inicializado automaticamente via firebaseConfig.js
// ao ser importado pelos controllers.
// initializeDb(); // REMOVA OU COMENTE ESTA LINHA
