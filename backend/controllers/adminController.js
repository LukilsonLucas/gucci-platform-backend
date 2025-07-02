    // backend/controllers/adminController.js

    const db = require('../config/firebaseConfig');

    const usersCollection = db.collection('users');

    // Middleware de autenticação e autorização (simplificado para demonstração)
    // Em um ambiente de produção, VOCÊ DEVE IMPLEMENTAR UM SISTEMA ROBUSTO
    // DE AUTENTICAÇÃO E AUTORIZAÇÃO (ex: JWT com roles).
    // Por enquanto, este middleware é um placeholder.
    const isAdmin = async (req, res, next) => {
      // Para fins de teste, vamos permitir temporariamente o acesso.
      // Em produção, você precisaria verificar um token de autenticação
      // e o papel de administrador do usuário.
      // Exemplo:
      // if (!req.user || !req.user.isAdmin) { // Assumindo que req.user é populado por um middleware de autenticação
      //   return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem realizar esta ação.' });
      // }
      next(); // Permite que a requisição continue
    };

    // Função para aprovar um depósito
    exports.approveDeposit = [isAdmin, async (req, res) => {
      const { userId, amount } = req.body;

      if (!userId || !amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: 'ID do usuário e valor do depósito válidos são obrigatórios.' });
      }

      try {
        const userRef = usersCollection.doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const currentTotalAccumulated = userDoc.data().total_accumulated || 0;
        const newTotalAccumulated = currentTotalAccumulated + amount;

        await userRef.update({
          total_accumulated: newTotalAccumulated
        });

        res.status(200).json({ message: `Depósito de ${amount} Kz aprovado para o usuário ${userId}. Novo saldo: ${newTotalAccumulated} Kz.` });
      } catch (error) {
        console.error('Erro ao aprovar depósito:', error.message);
        res.status(500).json({ message: 'Erro interno do servidor ao aprovar depósito.' });
      }
    }];

    // Função para aprovar um saque
    exports.approveWithdrawal = [isAdmin, async (req, res) => {
      const { userId, amount } = req.body;
      const MIN_WITHDRAWAL = 1500;

      if (!userId || !amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: 'ID do usuário e valor do saque válidos são obrigatórios.' });
      }

      if (amount < MIN_WITHDRAWAL) {
        return res.status(400).json({ message: `O valor mínimo para saque é de ${MIN_WITHDRAWAL} Kz.` });
      }

      try {
        const userRef = usersCollection.doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const userData = userDoc.data();

        if (userData.is_active === 0) { // Verifica se o nível está ativo
          return res.status(403).json({ message: 'O nível do usuário não está ativo. Não é possível aprovar saque.' });
        }

        if (userData.total_accumulated < amount) {
          return res.status(400).json({ message: 'Saldo insuficiente do usuário para aprovar o saque.' });
        }

        const newTotalAccumulated = currentTotalAccumulated - amount;

        await userRef.update({
          total_accumulated: newTotalAccumulated
        });

        res.status(200).json({ message: `Saque de ${amount} Kz aprovado para o usuário ${userId}. Novo saldo: ${newTotalAccumulated} Kz.` });
      } catch (error) {
        console.error('Erro ao aprovar saque:', error.message);
        res.status(500).json({ message: 'Erro interno do servidor ao aprovar saque.' });
      }
    }];

    // Função para atribuir um nível a um usuário e opcionalmente torná-lo admin
    exports.assignLevel = [isAdmin, async (req, res) => {
      const { userId, level, is_admin } = req.body; // Adicionado is_admin

      if (!userId || typeof level !== 'number' || level < 0) {
        return res.status(400).json({ message: 'ID do usuário e nível válido são obrigatórios.' });
      }

      try {
        const userRef = usersCollection.doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const updateData = { level: level };
        if (typeof is_admin === 'boolean') {
          updateData.is_admin = is_admin;
        }
        // Se o nível for maior que 0, consideramos o nível como ativo
        if (level > 0) {
          updateData.is_active = 1;
        } else {
          updateData.is_active = 0;
        }


        await userRef.update(updateData);

        res.status(200).json({ message: `Nível ${level} e status de admin (${is_admin}) atribuídos ao usuário ${userId} com sucesso.` });
      } catch (error) {
        console.error('Erro ao atribuir nível:', error.message);
        res.status(500).json({ message: 'Erro interno do servidor ao atribuir nível.' });
      }
    }];

    // Função para obter todos os usuários (útil para o painel de administração)
    exports.getAllUsers = [isAdmin, async (req, res) => {
      try {
        const usersSnapshot = await usersCollection.get();
        const users = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          password: '***' // Não enviar a senha criptografada para o frontend
        }));

        res.status(200).json(users);
      } catch (error) {
        console.error('Erro ao obter todos os usuários:', error.message);
        res.status(500).json({ message: 'Erro interno do servidor ao obter usuários.' });
      }
    }];
    