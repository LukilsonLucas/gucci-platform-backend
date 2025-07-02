    // backend/controllers/taskController.js

    const db = require('../config/firebaseConfig');

    const usersCollection = db.collection('users');

    const LEVEL_EARNINGS = {
      0: 50,
      1: 100,
      2: 200,
      3: 350,
    };

    // Função para realizar uma tarefa diária
    exports.performDailyTask = async (req, res) => {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: 'ID do usuário é obrigatório.' });
      }

      try {
        const userRef = usersCollection.doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const userData = userDoc.data();

        if (userData.is_active === 0) { // Verifica se o nível está ativo
          return res.status(403).json({ message: 'Seu nível não está ativo. Você não pode realizar tarefas.' });
        }

        const lastTaskDate = userData.last_task_date ? userData.last_task_date.toDate() : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (lastTaskDate && lastTaskDate.toDateString() === today.toDateString()) {
          return res.status(400).json({ message: 'Você já realizou sua tarefa diária hoje. Volte amanhã!' });
        }

        const userLevel = userData.level || 0;
        const earning = LEVEL_EARNINGS[userLevel] || LEVEL_EARNINGS[0];

        const newDailyTaskEarning = (userData.daily_task_earning || 0) + earning;
        const newTotalAccumulated = (userData.total_accumulated || 0) + earning;

        await userRef.update({
          daily_task_earning: newDailyTaskEarning,
          total_accumulated: newTotalAccumulated,
          last_task_date: new Date()
        });

        res.status(200).json({
          message: `Tarefa diária concluída! Você ganhou ${earning} Kz.`,
          newTotalAccumulated: newTotalAccumulated
        });

      } catch (error) {
        console.error('Erro ao realizar tarefa diária:', error.message);
        res.status(500).json({ message: 'Erro interno do servidor ao realizar tarefa diária.' });
      }
    };
    