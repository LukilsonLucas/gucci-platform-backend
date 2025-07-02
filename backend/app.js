    // backend/app.js

    const express = require('express');
    const bodyParser = require('body-parser');
    const cors = require('cors'); // Importa o módulo cors
    const userController = require('./controllers/userController');
    const adminController = require('./controllers/adminController'); // Controlador para funções administrativas
    const taskController = require('./controllers/taskController'); // Controlador para tarefas diárias

    const app = express();
    const PORT = process.env.PORT || 3000;

    // Middleware para permitir requisições de diferentes origens (CORS)
    app.use(cors());

    // Middleware para analisar corpos de solicitação JSON
    app.use(bodyParser.json());

    // Rotas de Usuário
    app.post('/register', userController.registerUser);
    app.post('/login', userController.loginUser); // Nova rota: Login de usuário
    app.post('/user/daily-task', taskController.performDailyTask);
    app.post('/user/request-withdrawal', userController.requestWithdrawal); // Nova rota: Usuário solicita saque
    app.put('/user/profile', userController.updateUserProfile); // Nova rota: Usuário atualiza perfil
    app.post('/user/record-investment', userController.recordInvestment); // Nova rota: Registrar investimento para bônus de convite

    // Rotas Administrativas (requerem autenticação e autorização de administrador)
    // Em um sistema real, adicione middleware de autenticação/autorização aqui.
    app.post('/admin/approve-deposit', adminController.approveDeposit);
    app.post('/admin/approve-withdrawal', adminController.approveWithdrawal);
    app.post('/admin/assign-level', adminController.assignLevel);
    app.get('/admin/users', adminController.getAllUsers);

    // Rota de teste simples para verificar se o servidor está funcionando
    app.get('/', (req, res) => {
      res.send('Backend da plataforma Gucci está online e funcionando!');
    });

    // Inicia o servidor
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
    