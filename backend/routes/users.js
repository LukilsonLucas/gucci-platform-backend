// backend/routes/users.js

const express = require('express');
const router = express.Router(); // Cria um novo objeto router para lidar com as rotas
const userController = require('../controllers/userController'); // Importa o controlador de usuário

// Rota para o cadastro de um novo usuário
// Quando uma requisição POST é feita para '/api/users/register',
// a função 'registerUser' do userController será executada.
router.post('/register', userController.registerUser);

// NOVA ROTA: Rota para alterar a senha do usuário
// Quando uma requisição PUT é feita para '/api/users/change-password',
// a função 'changePassword' do userController será executada.
router.put('/change-password', userController.changePassword);

// Exporta o router para que ele possa ser usado no app.js
module.exports = router;
