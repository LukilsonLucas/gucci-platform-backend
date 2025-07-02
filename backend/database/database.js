// backend/database/database.js

// Importa o módulo sqlite3 para interagir com o banco de dados SQLite
const sqlite3 = require('sqlite3').verbose();
// Importa o módulo 'path' para lidar com caminhos de arquivos de forma segura
const path = require('path');

// Define o caminho absoluto para o arquivo do banco de dados.
// '__dirname' é o diretório atual (backend/database).
// '..' sobe um nível (para backend).
// 'data' entra na pasta 'data' (que será criada se não existir).
// 'gucci_platform.db' é o nome do arquivo do banco de dados.
const dbPath = path.resolve(__dirname, '..', 'data', 'gucci_platform.db');

// Cria uma nova instância do banco de dados SQLite.
// Se o arquivo não existir, ele será criado.
const db = new sqlite3.Database(dbPath, (err) => {
  // Verifica se houve algum erro ao tentar abrir/criar o banco de dados
  if (err) {
    console.error('Erro ao abrir o banco de dados:', err.message);
  } else {
    // Se não houver erro, a conexão foi bem-sucedida
    console.log('Conectado ao banco de dados SQLite.');

    // --- Criação das Tabelas (se não existirem) ---

    // Tabela 'users': Armazena informações dos usuários cadastrados
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        level INTEGER DEFAULT 0,
        name TEXT,
        bank TEXT,
        iban TEXT,
        invite_link TEXT,
        daily_task_earning REAL DEFAULT 0.0,
        total_invite_earning REAL DEFAULT 0.0,
        total_accumulated REAL DEFAULT 0.0,
        last_task_date TEXT,
        is_active INTEGER DEFAULT 0 -- 0 para inativo, 1 para ativo (nível aprovado pelo admin)
      )
    `, (err) => { // Adicionado callback para garantir que a tabela seja criada antes de prosseguir
        if (err) {
            console.error("Erro ao criar tabela 'users':", err.message);
        }
    });

    // Tabela 'deposits': Registra as recargas (depósitos) dos usuários
    db.run(`
      CREATE TABLE IF NOT EXISTS deposits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        amount REAL NOT NULL,
        country TEXT NOT NULL,
        bank_selected TEXT NOT NULL,
        payer_name TEXT NOT NULL,
        proof_image TEXT, -- Caminho para a imagem do comprovante de recarga
        status TEXT DEFAULT 'pending', -- Status do depósito: 'pending', 'approved', 'rejected'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Data e hora do registro
        FOREIGN KEY (user_id) REFERENCES users(id) -- Chave estrangeira para a tabela 'users'
      )
    `, (err) => {
        if (err) {
            console.error("Erro ao criar tabela 'deposits':", err.message);
        }
    });

    // Tabela 'withdrawals': Registra os saques solicitados pelos usuários
    db.run(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'pending', -- Status do saque: 'pending', 'approved', 'rejected'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Data e hora do registro
        FOREIGN KEY (user_id) REFERENCES users(id) -- Chave estrangeira para a tabela 'users'
      )
    `, (err) => {
        if (err) {
            console.error("Erro ao criar tabela 'withdrawals':", err.message);
        }
    });

    // Tabela 'admin_levels': Define os ganhos diários associados a cada nível
    // O callback é crucial aqui para garantir que a tabela seja criada antes de tentar consultá-la
    db.run(`
      CREATE TABLE IF NOT EXISTS admin_levels (
        level INTEGER PRIMARY KEY,
        daily_earning REAL NOT NULL
      )
    `, (err) => {
        if (err) {
            console.error("Erro ao criar tabela 'admin_levels':", err.message);
            return;
        }

        // --- Inserção de Dados Iniciais (Níveis de Exemplo) ---
        // Esta parte verifica se a tabela 'admin_levels' está vazia
        // e, se estiver, insere alguns níveis padrão para teste.
        db.get('SELECT COUNT(*) AS count FROM admin_levels', (err, row) => {
            if (err) {
                console.error('Erro ao verificar níveis existentes:', err.message);
                return;
            }
            if (row.count === 0) {
                // Nível 0: Sem ganho diário
                db.run("INSERT INTO admin_levels (level, daily_earning) VALUES (?, ?)", [0, 0], function(err) {
                    if (err) console.error("Erro ao inserir Nível 0:", err.message);
                });
                // Nível 1: Exemplo de ganho diário (50 KZ/BRL)
                db.run("INSERT INTO admin_levels (level, daily_earning) VALUES (?, ?)", [1, 50.0], function(err) {
                    if (err) console.error("Erro ao inserir Nível 1:", err.message);
                });
                // Nível 2: Exemplo de ganho diário (100 KZ/BRL)
                db.run("INSERT INTO admin_levels (level, daily_earning) VALUES (?, ?)", [2, 100.0], function(err) {
                    if (err) console.error("Erro ao inserir Nível 2:", err.message);
                });
                console.log('Níveis de exemplo inseridos se a tabela estava vazia.');
            }
        });
    }); // Fim do callback para db.run de admin_levels

  }
});

// Exporta a instância do banco de dados para que outros módulos possam usá-la
module.exports = db;
