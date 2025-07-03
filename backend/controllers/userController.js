// backend/controllers/userController.js
const bcrypt = require('bcrypt'); // Importa a biblioteca bcrypt para hash de senhas
const db = require('../config/firebaseConfig'); // IMPORTA A INSTÂNCIA DO FIRESTORE
const admin = require('firebase-admin'); // Importa o admin para usar FieldValue

// Função para registrar um novo usuário
exports.registerUser = async (req, res) => {
  const { phone_number, password, confirm_password, invited_by_link } = req.body;

  // Validação básica
  if (!phone_number || !password || !confirm_password) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }

  if (password !== confirm_password) {
    return res.status(400).json({ message: 'A senha e a confirmação de senha não coincidem.' });
  }

  try {
    // Verifica se o número de telefone já existe no Firestore
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('phone_number', '==', phone_number).get();

    if (!snapshot.empty) {
      return res.status(409).json({ message: 'Número de telefone já cadastrado.' });
    }

    // Gera o hash da senha antes de salvar no banco de dados
    const hashedPassword = await bcrypt.hash(password, 10); // 10 é o saltRounds

    // Geração de um link de convite único
    const invite_link = Math.random().toString(36).substring(2, 15);

    // Insere o novo usuário no banco de dados Firestore
    const newUserRef = await usersRef.add({
      phone_number: phone_number,
      password: hashedPassword,
      level: 0,
      total_accumulated: 0, // Inicia com 0, só acumula ganhos de tarefas/convites
      daily_task_earning: 0,
      total_invite_earning: 0,
      total_withdrawn: 0, // Total de saques aprovados
      invite_link: invite_link,
      name: null,
      bank: null,
      iban: null,
      is_active: 0, // 0 = inativo, 1 = ativo
      is_admin: 0, // 0 = não admin, 1 = admin
      last_task_date: null,
      last_withdrawal_date: null, // Campo para controlar o último saque diário
      invited_by: invited_by_link || null // Salva quem o convidou, se houver
    });

    res.status(201).json({ message: 'Usuário registrado com sucesso!', userId: newUserRef.id });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao registrar usuário.' });
  }
};

// Função para login de usuário
exports.loginUser = async (req, res) => {
  const { phone_number, password } = req.body;

  if (!phone_number || !password) {
    return res.status(400).json({ message: 'Número de telefone e senha são obrigatórios.' });
  }

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('phone_number', '==', phone_number).limit(1).get();

    if (snapshot.empty) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    // Compara a senha fornecida com o hash armazenado
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    // Login bem-sucedido, retorna dados do usuário (excluindo a senha)
    const userData = { id: userDoc.id, ...user };
    delete userData.password; // Remove a senha antes de enviar para o frontend
    res.status(200).json({ message: 'Login bem-sucedido!', ...userData });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao fazer login.' });
  }
};

// Função para atualizar o perfil do usuário
exports.updateProfile = async (req, res) => {
  const { userId, name, bank, iban } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'ID do usuário é obrigatório.' });
  }

  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({ name, bank, iban });
    res.status(200).json({ message: 'Perfil atualizado com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao atualizar perfil.' });
  }
};

// Função para alterar a senha do usuário
exports.changePassword = async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;

  if (!userId || !oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const user = userDoc.data();

    // Verifica se a senha antiga fornecida corresponde ao hash armazenado
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Senha antiga incorreta.' });
    }

    // Gera o hash da nova senha
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Atualiza a senha no banco de dados
    await userRef.update({ password: hashedNewPassword });
    res.status(200).json({ message: 'Senha alterada com sucesso!' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao alterar senha.' });
  }
};

// Função para registrar tarefa diária
exports.dailyTask = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'ID do usuário é obrigatório.' });
  }

  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const user = userDoc.data();

    if (user.is_active === 0) {
      return res.status(403).json({ message: 'Seu nível não está ativo. Você não pode realizar tarefas.' });
    }

    const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    const lastTaskDate = user.last_task_date ? new Date(user.last_task_date).toISOString().split('T')[0] : null;

    if (lastTaskDate === today) {
      return res.status(400).json({ message: 'Você já realizou a tarefa diária hoje. Volte amanhã!' });
    }

    // Mapeamento de ganhos por nível (deve ser o mesmo do frontend)
    const LEVEL_EARNINGS = {
      0: 50,
      1: 1500,
      2: 3000,
      3: 4500,
      4: 6000,
      5: 10000,
    };
    const earning = LEVEL_EARNINGS[user.level] || LEVEL_EARNINGS[0]; // Garante um valor padrão

    // Atualiza total_accumulated e daily_task_earning usando FieldValue.increment
    await userRef.update({
      total_accumulated: admin.firestore.FieldValue.increment(earning),
      daily_task_earning: admin.firestore.FieldValue.increment(earning),
      last_task_date: today
    });

    res.status(200).json({
      message: `Tarefa diária concluída! Você ganhou ${earning} Kz.`,
      newTotalAccumulated: user.total_accumulated + earning, // Retorna o valor atualizado para o frontend
      newDailyTaskEarning: user.daily_task_earning + earning, // Retorna o valor atualizado para o frontend
    });
  } catch (error) {
    console.error('Erro ao registrar tarefa diária:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao registrar tarefa diária.' });
  }
};

// Função para o usuário solicitar um depósito
exports.requestDeposit = async (req, res) => {
  const { userId, amount, clientName, bankDetails, proofUrl } = req.body;

  if (!userId || typeof amount !== 'number' || amount <= 0 || !clientName || !bankDetails || !proofUrl) {
    return res.status(400).json({ message: 'Todos os campos de depósito são obrigatórios.' });
  }

  try {
    // Adiciona o pedido de depósito à coleção 'pending_deposits'
    const depositRef = await db.collection('pending_deposits').add({
      userId,
      amount,
      clientName,
      bankDetails, // Pode ser um objeto com banco, iban, etc.
      proofUrl,
      status: 'pending', // 'pending', 'approved', 'rejected'
      timestamp: new Date().toISOString()
    });
    res.status(201).json({ message: 'Solicitação de recarga enviada com sucesso! Aguardando aprovação do administrador.', depositId: depositRef.id });
  } catch (error) {
    console.error('Erro ao solicitar depósito:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao solicitar depósito.' });
  }
};

// Função para o usuário solicitar um saque
exports.requestWithdrawal = async (req, res) => {
  const { userId, amount, bankAccountDetails } = req.body; // bankAccountDetails deve conter nome, banco, iban

  const MIN_WITHDRAWAL = 1500;

  if (!userId || typeof amount !== 'number' || amount < MIN_WITHDRAWAL || !bankAccountDetails || !bankAccountDetails.name || !bankAccountDetails.bank || !bankAccountDetails.iban) {
    return res.status(400).json({ message: `Todos os campos de saque são obrigatórios e o valor mínimo é ${MIN_WITHDRAWAL} Kz.` });
  }

  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    const user = userDoc.data();

    // Validação: Saldo suficiente
    if (user.total_accumulated < amount) {
      return res.status(400).json({ message: 'Saldo insuficiente para solicitar o saque.' });
    }

    // Validação: Saque apenas uma vez por dia
    const today = new Date().toISOString().split('T')[0];
    const lastWithdrawalDate = user.last_withdrawal_date ? new Date(user.last_withdrawal_date).toISOString().split('T')[0] : null;

    if (lastWithdrawalDate === today) {
      return res.status(400).json({ message: 'Você já solicitou um saque hoje. Por favor, aguarde até amanhã.' });
    }

    // Adiciona o pedido de saque à coleção 'pending_withdrawals'
    const withdrawalRef = await db.collection('pending_withdrawals').add({
      userId,
      amount,
      bankAccountDetails,
      status: 'pending', // 'pending', 'approved', 'rejected'
      timestamp: new Date().toISOString()
    });

    // Atualiza a data do último saque do usuário
    // A data do último saque é atualizada AQUI, no momento da SOLICITAÇÃO
    await userRef.update({
      last_withdrawal_date: today
    });

    res.status(201).json({ message: 'Solicitação de saque enviada com sucesso! Aguardando aprovação do administrador.', withdrawalId: withdrawalRef.id });
  } catch (error) {
    console.error('Erro ao solicitar saque:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao solicitar saque.' });
  }
};

// --- FUNÇÕES ADMINISTRATIVAS ---

// Função para listar todos os usuários (apenas para admin)
exports.adminGetUsers = async (req, res) => {
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();

    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Remover a senha dos dados antes de enviar para o frontend
    const usersWithoutPasswords = users.map(user => {
      const { password, ...rest } = user;
      return rest;
    });

    res.status(200).json(usersWithoutPasswords);
  } catch (error) {
    console.error('Erro ao buscar usuários (admin):', error);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar usuários.' });
  }
};

// Função para o administrador listar depósitos pendentes
exports.adminGetPendingDeposits = async (req, res) => {
  try {
    const depositsRef = db.collection('pending_deposits');
    const snapshot = await depositsRef.where('status', '==', 'pending').get();

    const pendingDeposits = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.status(200).json(pendingDeposits);
  } catch (error) {
    console.error('Erro ao buscar depósitos pendentes:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar depósitos pendentes.' });
  }
};

// Função para o administrador aprovar um depósito
exports.adminApproveDeposit = async (req, res) => {
  const { depositId, userId, amount } = req.body;

  if (!depositId || !userId || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'ID do depósito, ID do usuário e valor válidos são obrigatórios.' });
  }

  const transaction = db.runTransaction(async (t) => {
    const userRef = db.collection('users').doc(userId);
    const depositRef = db.collection('pending_deposits').doc(depositId);

    const userDoc = await t.get(userRef);
    const depositDoc = await t.get(depositRef);

    if (!userDoc.exists) {
      throw new Error('Usuário não encontrado.');
    }
    if (!depositDoc.exists || depositDoc.data().status !== 'pending') {
      throw new Error('Depósito não encontrado ou já processado.');
    }

    const user = userDoc.data();

    // REMOVIDO: A linha que somava o valor do depósito ao total_accumulated do usuário.
    // O total_accumulated só deve refletir ganhos de tarefas e convites.
    // const newTotalAccumulated = user.total_accumulated + amount; // ESTA LINHA FOI REMOVIDA

    // Atualiza APENAS o status do pedido de depósito
    t.update(depositRef, { status: 'approved' });

    // Se o usuário foi convidado por alguém, o convidante ganha 1000 Kz
    // ESTA LÓGICA PERMANECE, POIS É UM GANHO PARA O CONVIDANTE
    if (user.invited_by) {
      const invitedByRef = db.collection('users').where('invite_link', '==', user.invited_by).limit(1);
      const invitedBySnapshot = await t.get(invitedByRef);

      if (!invitedBySnapshot.empty) {
        const invitedByDoc = invitedBySnapshot.docs[0];
        const invitedByUserRef = db.collection('users').doc(invitedByDoc.id);
        const inviteEarning = 1000; // Valor da comissão por convite
        t.update(invitedByUserRef, {
          total_invite_earning: admin.firestore.FieldValue.increment(inviteEarning),
          total_accumulated: admin.firestore.FieldValue.increment(inviteEarning)
        });
      }
    }

    // Retorna o total_accumulated atual do usuário (sem o valor do depósito)
    return { newTotalAccumulated: user.total_accumulated };
  });

  try {
    const result = await transaction;
    res.status(200).json({ message: `Depósito de ${amount} Kz aprovado para o usuário ${userId}. O saldo acumulado não inclui o valor do depósito, apenas ganhos.`, newTotalAccumulated: result.newTotalAccumulated });
  } catch (error) {
    console.error('Erro ao aprovar depósito (transação):', error.message);
    res.status(500).json({ message: error.message || 'Erro interno do servidor ao aprovar depósito.' });
  }
};


// Função para o administrador rejeitar um depósito
exports.adminRejectDeposit = async (req, res) => {
  const { depositId } = req.body;

  if (!depositId) {
    return res.status(400).json({ message: 'ID do depósito é obrigatório.' });
  }

  try {
    const depositRef = db.collection('pending_deposits').doc(depositId);
    await depositRef.update({ status: 'rejected' });
    res.status(200).json({ message: `Depósito ${depositId} rejeitado.` });
  } catch (error) {
    console.error('Erro ao rejeitar depósito:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao rejeitar depósito.' });
  }
};

// Função para o administrador listar saques pendentes
exports.adminGetPendingWithdrawals = async (req, res) => {
  try {
    const withdrawalsRef = db.collection('pending_withdrawals');
    const snapshot = await withdrawalsRef.where('status', '==', 'pending').get();

    const pendingWithdrawals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.status(200).json(pendingWithdrawals);
  } catch (error) {
    console.error('Erro ao buscar saques pendentes:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar saques pendentes.' });
  }
};

// Função para o administrador aprovar um saque
exports.adminApproveWithdrawal = async (req, res) => {
  const { withdrawalId, userId, amount } = req.body;
  const MIN_WITHDRAWAL = 1500;

  if (!withdrawalId || !userId || typeof amount !== 'number' || amount < MIN_WITHDRAWAL) {
    return res.status(400).json({ message: `ID do saque, ID do usuário e valor válido (mínimo ${MIN_WITHDRAWAL} Kz) são obrigatórios.` });
  }

  const transaction = db.runTransaction(async (t) => {
    const userRef = db.collection('users').doc(userId);
    const withdrawalRef = db.collection('pending_withdrawals').doc(withdrawalId);

    const userDoc = await t.get(userRef);
    const withdrawalDoc = await t.get(withdrawalRef);

    if (!userDoc.exists) {
      throw new Error('Usuário não encontrado.');
    }
    if (!withdrawalDoc.exists || withdrawalDoc.data().status !== 'pending') {
      throw new Error('Saque não encontrado ou já processado.');
    }

    const user = userDoc.data();

    if (user.total_accumulated < amount) {
      // Isso pode acontecer se o saldo foi gasto entre a solicitação e a aprovação
      t.update(withdrawalRef, { status: 'rejected', rejection_reason: 'Saldo insuficiente no momento da aprovação.' });
      throw new Error('Saldo insuficiente para aprovar este saque. Saque rejeitado automaticamente.');
    }

    const newTotalAccumulated = user.total_accumulated - amount;
    // ATUALIZAÇÃO: Deduz o valor do saque do total_accumulated e incrementa o total_withdrawn
    t.update(userRef, {
      total_accumulated: newTotalAccumulated,
      total_withdrawn: admin.firestore.FieldValue.increment(amount) // Incrementa o total sacado
    });
    t.update(withdrawalRef, { status: 'approved' });

    // Adiciona o saque aprovado a uma nova coleção 'approved_withdrawals' para histórico
    await db.collection('approved_withdrawals').add({
      userId,
      amount,
      bankAccountDetails: withdrawalDoc.data().bankAccountDetails,
      timestamp: new Date().toISOString()
    });

    return { newTotalAccumulated };
  });

  try {
    const result = await transaction;
    res.status(200).json({ message: `Saque de ${amount} Kz aprovado para o usuário ${userId}. Novo saldo: ${result.newTotalAccumulated} Kz.` });
  } catch (error) {
    console.error('Erro ao aprovar saque (transação):', error.message);
    res.status(500).json({ message: error.message || 'Erro interno do servidor ao aprovar saque.' });
  }
};

// Função para o administrador rejeitar um saque
exports.adminRejectWithdrawal = async (req, res) => {
  const { withdrawalId } = req.body;

  if (!withdrawalId) {
    return res.status(400).json({ message: 'ID do saque é obrigatório.' });
  }

  try {
    const withdrawalRef = db.collection('pending_withdrawals').doc(withdrawalId);
    await withdrawalRef.update({ status: 'rejected' });
    res.status(200).json({ message: `Saque ${withdrawalId} rejeitado.` });
  } catch (error) {
    console.error('Erro ao rejeitar saque:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao rejeitar saque.' });
  }
};

exports.adminAssignLevel = async (req, res) => {
  const { userId, level, is_admin } = req.body;

  if (!userId || typeof level !== 'number' || level < 0) {
    return res.status(400).json({ message: 'ID do usuário e nível válido são obrigatórios.' });
  }

  // Garante que is_admin é um booleano (Firestore aceita booleanos diretamente)
  const adminStatus = typeof is_admin === 'boolean' ? is_admin : false; // Convertendo para booleano

  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      level: level,
      is_active: level > 0 ? 1 : 0, // is_active = 1 se level > 0
      is_admin: adminStatus // Salva como booleano no Firestore
    });
    res.status(200).json({ message: `Nível ${level} atribuído ao usuário ${userId}. Status Admin: ${adminStatus ? 'Sim' : 'Não'}.` });
  } catch (error) {
    console.error('Erro ao atribuir nível:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao atribuir nível.' });
  }
};

// Nova função para listar saques aprovados (histórico)
exports.getApprovedWithdrawals = async (req, res) => {
  const { userId } = req.query; // Pode ser para um usuário específico ou todos se for admin

  try {
    let query = db.collection('approved_withdrawals');

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    const snapshot = await query.orderBy('timestamp', 'desc').get(); // Ordena por data mais recente

    const approvedWithdrawals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.status(200).json(approvedWithdrawals);
  } catch (error) {
    console.error('Erro ao buscar saques aprovados:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao buscar saques aprovados.' });
  }
};
