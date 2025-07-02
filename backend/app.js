// backend/app.js (ou server.js)
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Importa a instância do banco de dados
const db = require('./database/database');

// Middleware para analisar corpos de requisição JSON
// Isso é essencial para que o Express possa ler os dados enviados no formato JSON
// em requisições POST, PUT, etc.
app.use(express.json());

// Importa as rotas de usuário.
// Ainda vamos criar este arquivo em breve.
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
  // O banco de dados já será conectado quando database.js for importado.
});
