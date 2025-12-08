# Bíblia ADMA - Prof. Michel Felix

App de Estudos Bíblicos Avançados com IA (Editor Chefe), Dicionário Exegético e Panorama EBD para Assembleia de Deus Ministério Ágape.

## 🚀 Como Configurar na Vercel (Passo a Passo)

Para que o aplicativo funcione corretamente em produção (online), você precisa configurar a Chave da API e o Banco de Dados.

### 1. Criar o Projeto
- Importe este repositório na Vercel.
- Framework Preset: **Vite** (automático).
- Root Directory: `./` (padrão).

### 2. Configurar a Chave da API (Google Gemini)
Vá na aba **Settings** > **Environment Variables** do seu projeto na Vercel e adicione:

- **Key:** `API_KEY`
- **Value:** `Sua_Chave_AIza...` (Pegue no Google AI Studio)

> **Nota:** O sistema possui uma chave de backup no código (`api/gemini.js`), mas é altamente recomendado configurar a variável de ambiente para maior segurança e controle.

### 3. Configurar o Banco de Dados (Vercel KV)
Para que o conteúdo gerado pelo Admin (Devocionais, Estudos, Dicionário) seja visível para todos os usuários:

1. No painel do projeto na Vercel, clique na aba **Storage**.
2. Clique no botão **Connect Database**.
3. Escolha **Vercel KV** (Key-Value Store).
4. Crie um novo banco (ex: `biblia-db`) e selecione a região (Washington D.C. é o padrão recomendado).
5. Clique em **Connect**.

### 4. Senha de Administrador
Para acessar o Painel Admin no app (clicando 5 vezes no título "Bíblia ADMA"):
- A senha de acesso é definida internamente no código fonte.
- Caso precise recuperá-la, verifique o arquivo de configuração de segurança no código ou contate o desenvolvedor.

## 🛠 Tecnologias

- **Frontend:** React, Vite, TailwindCSS, Framer Motion.
- **Backend (Serverless):** Vercel Functions (`api/gemini.js`, `api/storage.js`).
- **AI:** Google Gemini 2.5 Flash via `@google/genai`.
- **Database:** Vercel KV (Redis) + LocalStorage (Híbrido).
- **Ícones:** Lucide React.

## 📱 Funcionalidades

- **Leitura Bíblica:** Texto Almeida completo com TTS (Voz).
- **IA Generativa:** Comentários exegéticos e Dicionário (Hebraico/Grego) sob demanda.
- **Panorama EBD:** Gerador de estudos para Alunos e Professores.
- **Devocional:** Gerador diário automático.
- **Admin:** Painel exclusivo para gerar conteúdo em lote e gerenciar chaves.