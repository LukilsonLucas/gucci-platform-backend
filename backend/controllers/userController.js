// backend/controllers/userController.js

// Importa a instância do Firestore do arquivo de configuração do Firebase
const db = require('../config/firebaseConfig');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Referência para a coleção 'users' no Firestore
const usersCollection = db.collection('users');

// Função para lidar com o cadastro de um novo usuário
exports.registerUser = async (req, res) => {
  const { phone_number, password, confirm_password, invited_by_link } = req.body; // Adicionado invited_by_link

  if (!phone_number || !password || !confirm_password) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios: número de telefone, senha e confirmação de senha.' });
  }

  if (password !== confirm_password) {
    return res.status(400).json({ message: 'A senha e a confirmação de senha não coincidem.' });
  }

  try {
    // 1. Verifica se o número de telefone já está cadastrado no Firestore
    const userSnapshot = await usersCollection.where('phone_number', '==', phone_number).get();

    if (!userSnapshot.empty) {
      return res.status(409).json({ message: 'Este número de telefone já está cadastrado.' });
    }

    // 2. Criptografa a senha
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Gera um link de convite único para o NOVO usuário
    const inviteLink = crypto.randomBytes(8).toString('hex');

    // 4. Encontra o usuário que convidou (se houver um link de convite)
    let inviterUserId = null;
    if (invited_by_link) {
      const inviterSnapshot = await usersCollection.where('invite_link', '==', invited_by_link).get();
      if (!inviterSnapshot.empty) {
        inviterUserId = inviterSnapshot.docs[0].id; // Pega o ID do usuário que convidou
      }
    }

    // 5. Cria um novo documento de usuário no Firestore
    const newUserRef = await usersCollection.add({
      phone_number: phone_number,
      password: hashedPassword, // Senha criptografada
      level: 0,
      name: null,
      bank: null,
      iban: null,
      invite_link: inviteLink,
      invited_by: inviterUserId, // Armazena o ID de quem convidou
      daily_task_earning: 0.0,
      total_invite_earning: 0.0,
      total_accumulated: 0.0,
      last_task_date: null,
      is_active: 0,
      created_at: new Date()
    });

    res.status(201).json({
      message: 'Usuário cadastrado com sucesso!',
      userId: newUserRef.id,
      inviteLink: inviteLink
    });

  } catch (error) {
    console.error('Erro no cadastro de usuário (Firestore):', error.message);
    res.status(500).json({ message: 'Erro interno do servidor ao registrar o usuário.' });
  }
};

// Nova função para registrar um investimento e dar bônus ao convidante
// Esta função seria chamada pelo frontend quando um usuário faz seu primeiro investimento
exports.recordInvestment = async (req, res) => {
  const { userId, investmentAmount } = req.body;
  const INVITE_BONUS = 1000; // Bônus por convite

  if (!userId || !investmentAmount || typeof investmentAmount !== 'number' || investmentAmount <= 0) {
    return res.status(400).json({ message: 'ID do usuário e valor do investimento válidos são obrigatórios.' });
  }

  try {
    const userRef = usersCollection.doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const userData = userDoc.data();

    // Verifica se o usuário já investiu antes (para dar o bônus apenas uma vez)
    // Você pode adicionar um campo 'has_invested' no usuário para controlar isso
    if (userData.has_invested) {
      return res.status(400).json({ message: 'Este usuário já registrou um investimento.' });
    }

    // Atualiza o saldo do usuário que investiu
    const newTotalAccumulated = (userData.total_accumulated || 0) + investmentAmount;
    await userRef.update({
      total_accumulated: newTotalAccumulated,
      has_invested: true // Marca que o usuário já investiu
    });

    // Se o usuário foi convidado por alguém, dê o bônus ao convidante
    if (userData.invited_by) {
      const inviterRef = usersCollection.doc(userData.invited_by);
      const inviterDoc = await inviterRef.get();

      if (inviterDoc.exists) {
        const inviterData = inviterDoc.data();
        const newTotalInviteEarning = (inviterData.total_invite_earning || 0) + INVITE_BONUS;
        const inviterNewTotalAccumulated = (inviterData.total_accumulated || 0) + INVITE_BONUS;

        await inviterRef.update({
          total_invite_earning: newTotalInviteEarning,
          total_accumulated: inviterNewTotalAccumulated
        });
        res.status(200).json({ message: `Investimento registrado para ${userId}. Convidante ${userData.invited_by} recebeu ${INVITE_BONUS} Kz.` });
      } else {
        res.status(200).json({ message: `Investimento registrado para ${userId}. Convidante não encontrado.` });
      }
    } else {
      res.status(200).json({ message: `Investimento registrado para ${userId}.` });
    }

  } catch (error) {
    console.error('Erro ao registrar investimento:', error.message);
    res.status(500).json({ message: 'Erro interno do servidor ao registrar investimento.' });
  }
};
