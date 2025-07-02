// backend/controllers/userController.js

// Importa a instância do Firestore do arquivo de configuração do Firebase
const db = require('../config/firebaseConfig');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Referência para a coleção 'users' no Firestore
const usersCollection = db.collection('users');

// Função para lidar com o cadastro de um novo usuário
exports.registerUser = async (req, res) => {
  const { phone_number, password, confirm_password } = req.body;

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

    // 3. Gera um link de convite único
    const inviteLink = crypto.randomBytes(8).toString('hex');

    // 4. Cria um novo documento de usuário no Firestore
    // O Firestore gera um ID automaticamente para o documento
    const newUserRef = await usersCollection.add({
      phone_number: phone_number,
      password: hashedPassword, // Senha criptografada
      level: 0,
      name: null, // Nomes e outros campos podem ser adicionados depois
      bank: null,
      iban: null,
      invite_link: inviteLink,
      daily_task_earning: 0.0,
      total_invite_earning: 0.0,
      total_accumulated: 0.0,
      last_task_date: null,
      is_active: 0,
      created_at: new Date() // Adiciona um timestamp de criação
    });

    // Retorna uma resposta de sucesso com o ID do novo usuário (gerado pelo Firestore)
    res.status(201).json({
      message: 'Usuário cadastrado com sucesso!',
      userId: newUserRef.id, // O ID do documento gerado pelo Firestore
      inviteLink: inviteLink
    });

  } catch (error) {
    console.error('Erro no cadastro de usuário (Firestore):', error.message);
    res.status(500).json({ message: 'Erro interno do servidor ao registrar o usuário.' });
  }
};
