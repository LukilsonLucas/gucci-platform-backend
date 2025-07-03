// backend/app.js
const express = require('express');
const cors = require('cors'); // Importa o pacote cors
const app = express();
const port = process.env.PORT || 10000; // Usar porta 10000 conforme o Render.com

// Importa a instância do banco de dados Firestore
// Certifique-se de que este caminho está correto e que firebaseConfig.js exporta 'db'
const db = require('./config/firebaseConfig');

// Middleware para analisar corpos de requisição JSON
app.use(express.json());

// Middleware CORS para permitir requisições do seu frontend
// Isso é crucial para que o frontend (hospedado em um domínio diferente) possa se comunicar com o backend
app.use(cors());

// Importa as rotas de usuário.
const userRoutes = require('./routes/users');

// Usa as rotas de usuário.
// Todas as rotas definidas em 'users.js' serão prefixadas com '/api/users'.
app.use('/api/users', userRoutes);

// Rota de teste simples para a raiz
app.get('/', (req, res) => {
  res.send('Backend da Plataforma GUCCI está funcionando!');
});

// Inicia o servidor na porta especificada
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
