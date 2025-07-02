// backend/controllers/taskController.js

const db = require('../config/firebaseConfig');

// Referência para a coleção 'users' no Firestore
const usersCollection = db.collection('users');

// Defina os ganhos por nível (exemplo: você pode ajustar estes valores)
const LEVEL_EARNINGS = {
  0: 50,  // Nível 0 ganha 50 Kz por tarefa
  1: 100, // Nível 1 ganha 100 Kz por tarefa
  2: 200, // Nível 2 ganha 200 Kz por tarefa
  3: 350, // Nível 3 ganha 350 Kz por tarefa
  // Adicione mais níveis conforme necessário
};

// Função para realizar uma tarefa diária
exports.performDailyTask = async (req, res) => {
  const { userId } = req.body; // Em um sistema real, o userId viria da autenticação do usuário

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
    const lastTaskDate = userData.last_task_date ? userData.last_task_date.toDate() : null; // Converte Timestamp para Date
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera a hora para comparar apenas a data

    // Verifica se a tarefa já foi realizada hoje
    if (lastTaskDate && lastTaskDate.toDateString() === today.toDateString()) {
      return res.status(400).json({ message: 'Você já realizou sua tarefa diária hoje. Volte amanhã!' });
    }

    const userLevel = userData.level || 0; // Pega o nível do usuário, padrão para 0 se não definido
    const earning = LEVEL_EARNINGS[userLevel] || LEVEL_EARNINGS[0]; // Pega o ganho com base no nível, padrão para nível 0 se o nível não for encontrado

    const newDailyTaskEarning = (userData.daily_task_earning || 0) + earning;
    const newTotalAccumulated = (userData.total_accumulated || 0) + earning;

    await userRef.update({
      daily_task_earning: newDailyTaskEarning,
      total_accumulated: newTotalAccumulated,
      last_task_date: new Date() // Atualiza a data da última tarefa para hoje
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
