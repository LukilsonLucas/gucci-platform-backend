// backend/routes/users.js

const express = require('express');
const router = express.Router(); // Cria um novo objeto router para lidar com as rotas
const userController = require('../controllers/userController'); // Importa o controlador de usuário

// --- ROTAS DO USUÁRIO ---

// Rota para o cadastro de um novo usuário
router.post('/register', userController.registerUser);

// Rota para o login de usuário
router.post('/login', userController.loginUser);

// Rota para atualizar o perfil do usuário
router.put('/profile', userController.updateProfile);

// Rota para alterar a senha do usuário
router.put('/change-password', userController.changePassword);

// Rota para o usuário realizar a tarefa diária
router.post('/daily-task', userController.dailyTask);

// Rota para o usuário solicitar um depósito
router.post('/request-deposit', userController.requestDeposit);

// Rota para o usuário solicitar um saque
router.post('/request-withdrawal', userController.requestWithdrawal);

// --- ROTAS ADMINISTRATIVAS ---
// (Estas rotas devem ser protegidas no futuro para garantir que apenas admins as acessem)

// Rota para o administrador listar todos os usuários
router.get('/admin/users', userController.adminGetUsers);

// Rota para o administrador listar depósitos pendentes
router.get('/admin/pending-deposits', userController.adminGetPendingDeposits);

// Rota para o administrador aprovar um depósito
router.post('/admin/approve-deposit', userController.adminApproveDeposit);

// Rota para o administrador rejeitar um depósito
router.post('/admin/reject-deposit', userController.adminRejectDeposit);

// Rota para o administrador listar saques pendentes
router.get('/admin/pending-withdrawals', userController.adminGetPendingWithdrawals);

// Rota para o administrador aprovar um saque
router.post('/admin/approve-withdrawal', userController.adminApproveWithdrawal);

// Rota para o administrador rejeitar um saque
router.post('/admin/reject-withdrawal', userController.adminRejectWithdrawal);

// Rota para o administrador atribuir nível a um usuário
router.post('/admin/assign-level', userController.adminAssignLevel);


// Exporta o router para que ele possa ser usado no app.js
module.exports = router;
