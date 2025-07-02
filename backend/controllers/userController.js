    // backend/controllers/userController.js

    const db = require('../config/firebaseConfig');
    const bcrypt = require('bcrypt');
    const crypto = require('crypto');

    const usersCollection = db.collection('users');

    // Função para lidar com o cadastro de um novo usuário
    exports.registerUser = async (req, res) => {
      const { phone_number, password, confirm_password, invited_by_link } = req.body;

      if (!phone_number || !password || !confirm_password) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios: número de telefone, senha e confirmação de senha.' });
      }

      if (password !== confirm_password) {
        return res.status(400).json({ message: 'A senha e a confirmação de senha não coincidem.' });
      }

      try {
        const userSnapshot = await usersCollection.where('phone_number', '==', phone_number).get();
        if (!userSnapshot.empty) {
          return res.status(409).json({ message: 'Este número de telefone já está cadastrado.' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const inviteLink = crypto.randomBytes(8).toString('hex');

        let inviterUserId = null;
        if (invited_by_link) {
          const inviterSnapshot = await usersCollection.where('invite_link', '==', invited_by_link).get();
          if (!inviterSnapshot.empty) {
            inviterUserId = inviterSnapshot.docs[0].id;
          }
        }

        const newUserRef = await usersCollection.add({
          phone_number: phone_number,
          password: hashedPassword,
          level: 0,
          name: null,
          bank: null,
          iban: null,
          invite_link: inviteLink,
          invited_by: inviterUserId,
          daily_task_earning: 0.0,
          total_invite_earning: 0.0,
          total_accumulated: 0.0,
          last_task_date: null,
          is_active: 0, // Nível inativo por padrão
          is_admin: false, // Não é admin por padrão
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

    // Nova função para login de usuário
    exports.loginUser = async (req, res) => {
      const { phone_number, password } = req.body;

      if (!phone_number || !password) {
        return res.status(400).json({ message: 'Número de telefone e senha são obrigatórios.' });
      }

      try {
        const userSnapshot = await usersCollection.where('phone_number', '==', phone_number).get();

        if (userSnapshot.empty) {
          return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();

        const isPasswordValid = await bcrypt.compare(password, userData.password);

        if (!isPasswordValid) {
          return res.status(401).json({ message: 'Senha incorreta.' });
        }

        // Retorna os dados do usuário (sem a senha)
        res.status(200).json({
          message: 'Login bem-sucedido!',
          userId: userDoc.id,
          phone_number: userData.phone_number,
          level: userData.level,
          total_accumulated: userData.total_accumulated,
          daily_task_earning: userData.daily_task_earning,
          total_invite_earning: userData.total_invite_earning,
          invite_link: userData.invite_link,
          name: userData.name,
          bank: userData.bank,
          iban: userData.iban,
          is_active: userData.is_active,
          is_admin: userData.is_admin || false, // Garante que is_admin seja false se não definido
        });

      } catch (error) {
        console.error('Erro no login de usuário (Firestore):', error.message);
        res.status(500).json({ message: 'Erro interno do servidor ao fazer login.' });
      }
    };

    // Nova função para registrar um investimento e dar bônus ao convidante
    exports.recordInvestment = async (req, res) => {
      const { userId, investmentAmount } = req.body;
      const INVITE_BONUS = 1000;

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

        // Adiciona um campo para controlar se o bônus de convite já foi dado
        // Isso é crucial para evitar que o bônus seja dado múltiplas vezes
        if (userData.invite_bonus_given) {
          return res.status(400).json({ message: 'Bônus de convite já foi concedido para este investimento.' });
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

            // Marca que o bônus foi dado para este usuário convidado
            await userRef.update({ invite_bonus_given: true });

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

    // Nova função para o usuário solicitar saque
    exports.requestWithdrawal = async (req, res) => {
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
          return res.status(403).json({ message: 'Seu nível não está ativo. Não é possível solicitar saque.' });
        }

        if (userData.total_accumulated < amount) {
          return res.status(400).json({ message: 'Saldo insuficiente para solicitar o saque.' });
        }

        // Em um sistema real, você registraria esta solicitação em uma coleção separada
        // (ex: 'withdrawal_requests') para o administrador aprovar.
        // Por simplicidade, vamos apenas retornar uma mensagem de sucesso aqui.
        // O administrador verá isso no painel dele e processará manualmente.
        res.status(200).json({ message: `Solicitação de saque de ${amount} Kz enviada para aprovação.` });

      } catch (error) {
        console.error('Erro ao solicitar saque:', error.message);
        res.status(500).json({ message: 'Erro interno do servidor ao solicitar saque.' });
      }
    };

    // Nova função para o usuário atualizar seu perfil
    exports.updateUserProfile = async (req, res) => {
      const { userId, name, bank, iban } = req.body;

      if (!userId) {
        return res.status(400).json({ message: 'ID do usuário é obrigatório.' });
      }

      try {
        const userRef = usersCollection.doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        await userRef.update({
          name: name,
          bank: bank,
          iban: iban,
        });

        res.status(200).json({ message: 'Perfil atualizado com sucesso!' });
      } catch (error) {
        console.error('Erro ao atualizar perfil:', error.message);
        res.status(500).json({ message: 'Erro interno do servidor ao atualizar perfil.' });
      }
    };
    