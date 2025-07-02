// backend/controllers/userController.js

const db = require('../database/database'); // Importa a instância do banco de dados
const bcrypt = require('bcrypt'); // Importa a biblioteca bcrypt para criptografia de senha
const crypto = require('crypto'); // Módulo nativo do Node.js para gerar strings aleatórias (link de convite)

// Função para lidar com o cadastro de um novo usuário
exports.registerUser = async (req, res) => {
  // Extrai os dados do corpo da requisição
  const { phone_number, password, confirm_password } = req.body;

  // 1. Validação básica dos dados de entrada
  if (!phone_number || !password || !confirm_password) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios: número de telefone, senha e confirmação de senha.' });
  }

  if (password !== confirm_password) {
    return res.status(400).json({ message: 'A senha e a confirmação de senha não coincidem.' });
  }

  // 2. Verifica se o número de telefone já está cadastrado
  db.get('SELECT id FROM users WHERE phone_number = ?', [phone_number], async (err, row) => {
    if (err) {
      console.error('Erro ao verificar número de telefone existente:', err.message);
      return res.status(500).json({ message: 'Erro interno do servidor durante o cadastro.' });
    }
    if (row) {
      return res.status(409).json({ message: 'Este número de telefone já está cadastrado.' });
    }

    // 3. Criptografa a senha antes de salvar no banco de dados
    try {
      // Gera um 'salt' (valor aleatório) para aumentar a segurança da criptografia
      const saltRounds = 10; // Custo de processamento para a criptografia (quanto maior, mais seguro, mas mais lento)
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 4. Gera um link de convite único
      const inviteLink = crypto.randomBytes(8).toString('hex'); // Gera uma string hexadecimal de 16 caracteres

      // 5. Insere o novo usuário no banco de dados
      db.run(
        `INSERT INTO users (phone_number, password, invite_link) VALUES (?, ?, ?)`,
        [phone_number, hashedPassword, inviteLink],
        function(err) { // Usamos 'function' para ter acesso a 'this.lastID'
          if (err) {
            console.error('Erro ao inserir novo usuário:', err.message);
            return res.status(500).json({ message: 'Erro interno do servidor ao registrar o usuário.' });
          }
          // Retorna uma resposta de sucesso com o ID do novo usuário
          res.status(201).json({
            message: 'Usuário cadastrado com sucesso!',
            userId: this.lastID,
            inviteLink: inviteLink // Opcional: retornar o link de convite para o usuário
          });
        }
      );
    } catch (hashErr) {
      console.error('Erro ao criptografar a senha:', hashErr.message);
      res.status(500).json({ message: 'Erro interno do servidor ao processar a senha.' });
    }
  });
};
