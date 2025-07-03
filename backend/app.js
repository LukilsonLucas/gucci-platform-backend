// backend/app.js

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Importa o módulo cors
const userController = require('./controllers/userController'); // Importa o userController
// const adminController = require('./controllers/adminController'); // Removido, funções de admin movidas para userController

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para permitir requisições de diferentes origens (CORS)
app.use(cors());

// Middleware para analisar corpos de solicitação JSON
app.use(bodyParser.json());

// --- Rotas de Usuário ---
app.post('/api/users/register', userController.registerUser);
app.post('/api/users/login', userController.loginUser);
app.put('/api/users/profile', userController.updateProfile);
app.put('/api/users/change-password', userController.changePassword);
app.post('/api/users/daily-task', userController.dailyTask);
app.post('/api/users/request-deposit', userController.requestDeposit);
app.post('/api/users/request-withdrawal', userController.requestWithdrawal);
// NOVA ROTA: Para buscar histórico de saques aprovados de um usuário
app.get('/api/users/approved-withdrawals', userController.getApprovedWithdrawals);


// --- Rotas Administrativas (protegidas pelo middleware isAdmin no controller) ---
// Nota: O middleware isAdmin dentro de userController.js (ou um novo adminController.js)
// deve ser responsável por verificar se o usuário tem permissão de administrador.
app.get('/api/users/admin/users', userController.adminGetUsers); // Listar todos os usuários
app.get('/api/users/admin/pending-deposits', userController.adminGetPendingDeposits); // Listar depósitos pendentes
app.post('/api/users/admin/approve-deposit', userController.adminApproveDeposit); // Aprovar depósito
app.post('/api/users/admin/reject-deposit', userController.adminRejectDeposit); // Rejeitar depósito
app.get('/api/users/admin/pending-withdrawals', userController.adminGetPendingWithdrawals); // Listar saques pendentes
app.post('/api/users/admin/approve-withdrawal', userController.adminApproveWithdrawal); // Aprovar saque
app.post('/api/users/admin/reject-withdrawal', userController.adminRejectWithdrawal); // Rejeitar saque
app.post('/api/users/admin/assign-level', userController.adminAssignLevel); // Atribuir nível e status admin

// Rota de teste simples para verificar se o servidor está funcionando
app.get('/', (req, res) => {
  res.send('Backend da plataforma Gucci está online e funcionando!');
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
