# 🚀 DevPad

O **DevPad** é um bloco de notas tunado e focado no dia a dia do desenvolvedor. Ele é uma aplicação desktop leve, rápida e recheada de funcionalidades que ajudam a organizar tarefas, ideias, trechos de código e anotações gerais.

## 🌟 O que a aplicação faz?
O DevPad foi criado para ser o seu assistente pessoal de produtividade na tela do PC. Ele inclui as seguintes ferramentas:

- 📝 **Editor de Notas Avançado:** Crie anotações com suporte a formatação (negrito, itálico, títulos), inserção de listas, checkboxes, adição de imagens e blocos de código com destaque de sintaxe para várias linguagens.
- 📋 **Painel Kanban:** Organize suas tarefas pendentes, em andamento e concluídas com facilidade.
- 🔔 **Lembretes:** Crie alarmes e lembretes para não esquecer de suas reuniões e daily standups.
- 🎨 **Personalização e Temas:** Mude o tema para Dark, Light ou Dev Glow. Ajuste a opacidade da janela ao seu gosto.
- 👻 **Modo Fantasma:** Uma funcionalidade essencial para devs que compartilham tela (Meet, Teams, Zoom) e não querem que suas anotações sejam vistas.
- 📌 **Always on Top:** Fixe o DevPad no topo de todas as outras janelas abertas.
- 🖼️ **Editor de Imagem Integrado:** Edite, redimensione e desenhe por cima de imagens diretamente na ferramenta.

---

## 🛠️ Como funciona?
O DevPad foi construído utilizando as tecnologias da web: **HTML, CSS e JavaScript** puros no lado da interface (Front-end), em conjunto com o **Electron**, que é o framework responsável por encapsular esse código web e transformá-lo em uma aplicação Desktop executável para Windows, Linux e macOS. O armazenamento dos dados (notas, lembretes, configurações) é feito localmente usando `electron-store`, garantindo que tudo fique salvo apenas na sua máquina.

---

## ⚙️ Pré-requisitos
Para baixar, rodar e buildar (compilar) a aplicação, você precisará ter instalado em seu computador:
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (versão 16 ou superior)

---

## 📥 Como Baixar (Clonar)
Abra o seu terminal (Prompt de Comando, PowerShell ou Terminal do Linux/Mac) e execute o comando abaixo para clonar o repositório:

```bash
git clone https://github.com/Jp-Ribeiro/DevPad.git
```

Entre na pasta do projeto:
```bash
cd DevPad
```

---

## 🚀 Como Executar em modo de Desenvolvimento
Após entrar na pasta do projeto, você precisa instalar as dependências necessárias para ele funcionar. Execute:

```bash
npm install
```

Depois que a instalação terminar, basta rodar o aplicativo com o comando:
```bash
npm start
```
O DevPad abrirá instantaneamente em uma nova janela!

---

## 📦 Como Buildar (Criar o executável final)
Se você quiser criar o arquivo de instalação (`.exe` para Windows, etc) para mandar para outras pessoas, o projeto já vem configurado com o `electron-builder`.

Para gerar o instalador **para Windows**:
```bash
npm run build:win
```

Para gerar os instaladores **para Linux** (.AppImage e .deb):
```bash
npm run build:linux
```

Para compilar **para ambos** (Windows e Linux):
```bash
npm run build:all
```

Após o build terminar, o instalador gerado ficará dentro da pasta `dist/` que será criada automaticamente no projeto.

---

<p align="center" style="font-size: 0.8em; opacity: 0.6; margin-top: 20px;">
  Criado por <a href="https://github.com/Jp-Ribeiro" target="_blank" style="color: inherit;">Jp-Ribeiro</a>
</p>
