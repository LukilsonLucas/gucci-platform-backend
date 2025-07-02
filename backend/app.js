// backend/app.js

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Importa o módulo cors
const userController = require('./controllers/userController');
const adminController = require('./controllers/adminController'); // Novo: Controlador para funções administrativas
const taskController = require('./controllers/taskController'); // Novo: Controlador para tarefas diárias

// Não precisamos importar 'db' ou 'initializeDb' aqui,
// pois a inicialização do Firestore é feita em firebaseConfig.js
// e o 'db' é importado diretamente nos controllers.

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para permitir requisições de diferentes origens (CORS)
// Isso é crucial para que seu frontend (que estará em um domínio diferente)
// possa se comunicar com este backend.
app.use(cors());

// Middleware para analisar corpos de solicitação JSON
app.use(bodyParser.json());

// Rota de cadastro de usuário
app.post('/register', userController.registerUser);

// Rota para realizar uma tarefa diária (para o usuário)
app.post('/user/daily-task', taskController.performDailyTask); // Nova rota

// Rotas Administrativas (requerem autenticação e autorização de administrador)
// Estas rotas precisarão de middleware para verificar se o usuário é um administrador
// (ainda a ser implementado).
app.post('/admin/approve-deposit', adminController.approveDeposit); // Nova rota: Aprovar depósito
app.post('/admin/approve-withdrawal', adminController.approveWithdrawal); // Nova rota: Aprovar saque
app.post('/admin/assign-level', adminController.assignLevel); // Nova rota: Atribuir nível
app.get('/admin/users', adminController.getAllUsers); // Nova rota: Obter todos os usuários (para gestão)

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
