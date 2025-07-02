// backend/controllers/adminController.js

const db = require('../config/firebaseConfig');

// Referência para a coleção 'users' no Firestore
const usersCollection = db.collection('users');

// Middleware de autenticação e autorização (simplificado para demonstração)
// Em um ambiente de produção, você usaria um sistema de autenticação mais robusto
// com tokens JWT e verificação de papéis (ex: 'admin').
// Por enquanto, vamos assumir que um campo 'is_admin: true' no Firestore define um administrador.
const isAdmin = async (req, res, next) => {
  // Para fins de teste e demonstração, vamos permitir temporariamente
  // que qualquer requisição acesse, mas em produção VOCÊ DEVE IMPLEMENTAR
  // UM SISTEMA DE AUTENTICAÇÃO E AUTORIZAÇÃO ROBUSTO.
  // Exemplo de como seria (requer um sistema de login e sessão/token):
  // const userId = req.user.uid; // Assumindo que o ID do usuário está no token de autenticação
  // const userDoc = await usersCollection.doc(userId).get();
  // if (!userDoc.exists || !userDoc.data().is_admin) {
  //   return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem realizar esta ação.' });
  // }
  next(); // Permite que a requisição continue para a próxima função
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
  const MIN_WITHDRAWAL = 1500; // Saque mínimo em Kz

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

    const currentTotalAccumulated = userDoc.data().total_accumulated || 0;

    if (currentTotalAccumulated < amount) {
      return res.status(400).json({ message: 'Saldo insuficiente para realizar o saque.' });
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

// Função para atribuir um nível a um usuário
exports.assignLevel = [isAdmin, async (req, res) => {
  const { userId, level } = req.body;

  if (!userId || typeof level !== 'number' || level < 0) {
    return res.status(400).json({ message: 'ID do usuário e nível válido são obrigatórios.' });
  }

  try {
    const userRef = usersCollection.doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    await userRef.update({
      level: level
    });

    res.status(200).json({ message: `Nível ${level} atribuído ao usuário ${userId} com sucesso.` });
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
