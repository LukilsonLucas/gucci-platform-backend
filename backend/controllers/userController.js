// backend/controllers/userController.js
const bcrypt = require('bcrypt'); // Importa a biblioteca bcrypt para hash de senhas
const db = require('../database/database'); // Importa a instância do banco de dados

// Função para registrar um novo usuário
exports.registerUser = (req, res) => {
  const { phone_number, password, confirm_password, invited_by_link } = req.body;

  // Validação básica
  if (!phone_number || !password || !confirm_password) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }

  if (password !== confirm_password) {
    return res.status(400).json({ message: 'A senha e a confirmação de senha não coincidem.' });
  }

  // Verifica se o número de telefone já existe
  db.get('SELECT * FROM users WHERE phone_number = ?', [phone_number], async (err, row) => {
    if (err) {
      console.error('Erro ao verificar usuário existente:', err);
      return res.status(500).json({ message: 'Erro interno do servidor.' });
    }
    if (row) {
      return res.status(409).json({ message: 'Número de telefone já cadastrado.' });
    }

    try {
      // Gera o hash da senha antes de salvar no banco de dados
      const hashedPassword = await bcrypt.hash(password, 10); // 10 é o saltRounds

      // Geração de um link de convite único
      const invite_link = Math.random().toString(36).substring(2, 15);

      // Insere o novo usuário no banco de dados
      db.run(
        'INSERT INTO users (phone_number, password, level, total_accumulated, daily_task_earning, total_invite_earning, invite_link, name, bank, iban, is_active, is_admin, last_task_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [phone_number, hashedPassword, 0, 0, 0, 0, invite_link, null, null, null, 0, 0, null], // Valores padrão
        function (err) {
          if (err) {
            console.error('Erro ao inserir novo usuário:', err);
            return res.status(500).json({ message: 'Erro ao registrar usuário.' });
          }
          res.status(201).json({ message: 'Usuário registrado com sucesso!', userId: this.lastID });
        }
      );
    } catch (hashError) {
      console.error('Erro ao gerar hash da senha:', hashError);
      res.status(500).json({ message: 'Erro ao processar senha.' });
    }
  });
};

// Função para login de usuário
exports.loginUser = (req, res) => {
  const { phone_number, password } = req.body;

  if (!phone_number || !password) {
    return res.status(400).json({ message: 'Número de telefone e senha são obrigatórios.' });
  }

  db.get('SELECT * FROM users WHERE phone_number = ?', [phone_number], async (err, user) => {
    if (err) {
      console.error('Erro ao buscar usuário para login:', err);
      return res.status(500).json({ message: 'Erro interno do servidor.' });
    }
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    try {
      // Compara a senha fornecida com o hash armazenado
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ message: 'Credenciais inválidas.' });
      }

      // Login bem-sucedido, retorna dados do usuário (excluindo a senha)
      const userData = { ...user };
      delete userData.password; // Remove a senha antes de enviar para o frontend
      res.status(200).json({ message: 'Login bem-sucedido!', ...userData });
    } catch (compareError) {
      console.error('Erro ao comparar senhas:', compareError);
      res.status(500).json({ message: 'Erro ao processar login.' });
    }
  });
};

// Função para atualizar o perfil do usuário
exports.updateProfile = (req, res) => {
  const { userId, name, bank, iban } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'ID do usuário é obrigatório.' });
  }

  db.run(
    'UPDATE users SET name = ?, bank = ?, iban = ? WHERE id = ?',
    [name, bank, iban, userId],
    function (err) {
      if (err) {
        console.error('Erro ao atualizar perfil:', err);
        return res.status(500).json({ message: 'Erro ao atualizar perfil.' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
      }
      res.status(200).json({ message: 'Perfil atualizado com sucesso.' });
    }
  );
};

// NOVA FUNÇÃO: Função para alterar a senha do usuário
exports.changePassword = (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;

  if (!userId || !oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }

  db.get('SELECT password FROM users WHERE id = ?', [userId], async (err, user) => {
    if (err) {
      console.error('Erro ao buscar senha antiga:', err);
      return res.status(500).json({ message: 'Erro interno do servidor.' });
    }
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    try {
      // Verifica se a senha antiga fornecida corresponde ao hash armazenado
      const match = await bcrypt.compare(oldPassword, user.password);
      if (!match) {
        return res.status(401).json({ message: 'Senha antiga incorreta.' });
      }

      // Gera o hash da nova senha
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Atualiza a senha no banco de dados
      db.run(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedNewPassword, userId],
        function (err) {
          if (err) {
            console.error('Erro ao atualizar senha:', err);
            return res.status(500).json({ message: 'Erro ao alterar senha.' });
          }
          res.status(200).json({ message: 'Senha alterada com sucesso!' });
        }
      );
    } catch (hashError) {
      console.error('Erro ao processar nova senha:', hashError);
      res.status(500).json({ message: 'Erro ao alterar senha.' });
    }
  });
};

// Função para registrar tarefa diária
exports.dailyTask = (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'ID do usuário é obrigatório.' });
  }

  db.get('SELECT level, total_accumulated, daily_task_earning, last_task_date, is_active FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Erro ao buscar usuário para tarefa diária:', err);
      return res.status(500).json({ message: 'Erro interno do servidor.' });
    }
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
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

    const newTotalAccumulated = user.total_accumulated + earning;
    const newDailyTaskEarning = user.daily_task_earning + earning;

    db.run(
      'UPDATE users SET total_accumulated = ?, daily_task_earning = ?, last_task_date = ? WHERE id = ?',
      [newTotalAccumulated, newDailyTaskEarning, today, userId],
      function (err) {
        if (err) {
          console.error('Erro ao atualizar ganhos da tarefa diária:', err);
          return res.status(500).json({ message: 'Erro ao registrar tarefa diária.' });
        }
        res.status(200).json({
          message: `Tarefa diária concluída! Você ganhou ${earning} Kz.`,
          newTotalAccumulated,
          newDailyTaskEarning,
        });
      }
    );
  });
};

// Funções para Admin (aprovar depósito, saque, atribuir nível)
exports.adminApproveDeposit = (req, res) => {
  const { userId, amount } = req.body;

  if (!userId || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'ID do usuário e valor do depósito válidos são obrigatórios.' });
  }

  db.get('SELECT total_accumulated FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Erro ao buscar usuário para depósito:', err);
      return res.status(500).json({ message: 'Erro interno do servidor.' });
    }
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const newTotalAccumulated = user.total_accumulated + amount;

    db.run(
      'UPDATE users SET total_accumulated = ? WHERE id = ?',
      [newTotalAccumulated, userId],
      function (err) {
        if (err) {
          console.error('Erro ao aprovar depósito:', err);
          return res.status(500).json({ message: 'Erro ao aprovar depósito.' });
        }
        res.status(200).json({ message: `Depósito de ${amount} Kz aprovado para o usuário ${userId}. Novo saldo: ${newTotalAccumulated} Kz.` });
      }
    );
  });
};

exports.adminApproveWithdrawal = (req, res) => {
  const { userId, amount } = req.body;
  const MIN_WITHDRAWAL = 1500; // Deve ser consistente com o frontend

  if (!userId || typeof amount !== 'number' || amount < MIN_WITHDRAWAL) {
    return res.status(400).json({ message: `ID do usuário e valor de saque válido (mínimo ${MIN_WITHDRAWAL} Kz) são obrigatórios.` });
  }

  db.get('SELECT total_accumulated FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Erro ao buscar usuário para saque:', err);
      return res.status(500).json({ message: 'Erro interno do servidor.' });
    }
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    if (user.total_accumulated < amount) {
      return res.status(400).json({ message: 'Saldo insuficiente para aprovar este saque.' });
    }

    const newTotalAccumulated = user.total_accumulated - amount;

    db.run(
      'UPDATE users SET total_accumulated = ? WHERE id = ?',
      [newTotalAccumulated, userId],
      function (err) {
        if (err) {
          console.error('Erro ao aprovar saque:', err);
          return res.status(500).json({ message: 'Erro ao aprovar saque.' });
        }
        res.status(200).json({ message: `Saque de ${amount} Kz aprovado para o usuário ${userId}. Novo saldo: ${newTotalAccumulated} Kz.` });
      }
    );
  });
};

exports.adminAssignLevel = (req, res) => {
  const { userId, level, is_admin } = req.body;

  if (!userId || typeof level !== 'number' || level < 0) {
    return res.status(400).json({ message: 'ID do usuário e nível válido são obrigatórios.' });
  }

  // Garante que is_admin é um booleano
  const adminStatus = typeof is_admin === 'boolean' ? (is_admin ? 1 : 0) : 0;

  db.run(
    'UPDATE users SET level = ?, is_active = ?, is_admin = ? WHERE id = ?',
    [level, level > 0 ? 1 : 0, adminStatus, userId], // is_active = 1 se level > 0, is_admin conforme o checkbox
    function (err) {
      if (err) {
        console.error('Erro ao atribuir nível:', err);
        return res.status(500).json({ message: 'Erro ao atribuir nível.' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
      }
      res.status(200).json({ message: `Nível ${level} atribuído ao usuário ${userId}. Status Admin: ${adminStatus ? 'Sim' : 'Não'}.` });
    }
  );
};

// Função para listar todos os usuários (apenas para admin)
exports.adminGetUsers = (req, res) => {
  // Em um ambiente de produção real, você adicionaria autenticação e autorização aqui
  // para garantir que apenas administradores possam acessar esta rota.

  db.all('SELECT id, phone_number, level, total_accumulated, daily_task_earning, total_invite_earning, invite_link, name, bank, iban, is_active, is_admin, invited_by FROM users', [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar usuários (admin):', err);
      return res.status(500).json({ message: 'Erro interno do servidor ao buscar usuários.' });
    }
    res.status(200).json(rows);
  });
};
