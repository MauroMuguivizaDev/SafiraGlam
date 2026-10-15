# Diverse

> Sistema de gestão para pequenos negócios, desenvolvido para simplificar o controlo de produtos, stock, vendas e movimentos financeiros.

![Diverse](https://img.shields.io/badge/Diverse-Stock%20%26%20Sales-111111?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge\&logo=react\&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge\&logo=typescript\&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge\&logo=vite\&logoColor=white)

---

## 📌 Sobre o projeto

O **Diverse** é uma aplicação web de gestão de loja criada para substituir processos manuais, como o registo de vendas, controlo de stock e acompanhamento dos movimentos de produtos.

O projeto foi pensado principalmente para **pequenos negócios**, oferecendo uma interface simples, rápida e adaptada para utilização em computadores e dispositivos móveis.

A aplicação permite centralizar informações importantes da loja num único sistema.

---

## ✨ Funcionalidades

### 📊 Dashboard

* Resumo geral da loja
* Indicadores de vendas
* Informação sobre stock
* Visão rápida da atividade do negócio

### 📦 Produtos

* Registo de produtos
* Preço de compra
* Preço de venda
* Quantidade disponível
* Organização dos produtos

### 🏷️ Stock

* Consulta do stock atual
* Entrada de produtos
* Saída de produtos
* Acompanhamento das quantidades

### 🛒 Vendas

* Registo de vendas
* Seleção de produtos
* Cálculo dos valores
* Atualização do stock após a venda

### 💰 Caixa

* Registo e acompanhamento de movimentos financeiros
* Consulta das operações realizadas

### 🔄 Movimentos de Stock

* Histórico das entradas e saídas
* Acompanhamento das alterações no inventário

### 📈 Relatórios

* Informações sobre o desempenho da loja
* Consulta dos dados registados
* Apoio ao acompanhamento do negócio

### ⚙️ Definições

* Configurações da aplicação
* Preferências do sistema

### 💱 Câmbio

* Conversão de valores entre moedas
* Apoio para operações que envolvem diferentes moedas

---

## 🛠️ Tecnologias

O projeto utiliza:

| Tecnologia                    | Utilização                                       |
| ----------------------------- | ------------------------------------------------ |
| **React**                     | Interface da aplicação                           |
| **TypeScript**                | Tipagem e desenvolvimento                        |
| **Vite**                      | Build e ambiente de desenvolvimento              |
| **CSS**                       | Estilização da interface                         |
| **JavaScript**                | Lógica da aplicação                              |
| **PWA**                       | Experiência semelhante a uma aplicação instalada |
| **Local Storage / IndexedDB** | Persistência de dados no cliente                 |

---

## 📁 Estrutura do projeto

```text
diversetodiverse/
│
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── manifest.webmanifest
│
├── src/
│   ├── assets/
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   └── Sidebar.tsx
│   │   │
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       └── PageHeader.tsx
│   │
│   ├── db/
│   │   └── database.ts
│   │
│   ├── pages/
│   │   ├── Caixa.tsx
│   │   ├── Cambio.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Definicoes.tsx
│   │   ├── MovimentosStock.tsx
│   │   ├── Produtos.tsx
│   │   ├── Relatorios.tsx
│   │   ├── Stock.tsx
│   │   └── Vendas.tsx
│   │
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   └── main.tsx
│
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

## 🚀 Como executar

### 1. Clonar o repositório

```bash
git clone https://github.com/MauroMuguivizaDev/Diverse-To-Diverse.git
```

### 2. Entrar na pasta

```bash
cd Diverse-To-Diverse
```

### 3. Instalar as dependências

```bash
npm install
```

### 4. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Depois, abre no navegador o endereço apresentado pelo Vite, normalmente:

```text
http://localhost:5173
```

---

## 🏗️ Build para produção

Para criar a versão de produção:

```bash
npm run build
```

Para testar a build localmente:

```bash
npm run preview
```

---

## 📱 PWA

O Diverse foi desenvolvido com uma abordagem **mobile-first**, permitindo que a aplicação seja utilizada também em dispositivos móveis.

Através do suporte a PWA, o sistema pode ser adicionado ao ecrã inicial de um dispositivo compatível, proporcionando uma experiência semelhante à de uma aplicação nativa.

---

## 🎯 Objetivo

O principal objetivo do Diverse é tornar a gestão de pequenos negócios mais simples.

Em vez de depender exclusivamente de:

* cadernos;
* folhas de cálculo;
* cálculos manuais;
* registos dispersos;

o proprietário pode utilizar uma única aplicação para acompanhar os principais processos da loja.

---

## 🔮 Próximos passos

Algumas funcionalidades previstas para futuras versões:

* [ ] Sistema de autenticação
* [ ] Perfis de utilizador
* [ ] Backend
* [ ] Base de dados PostgreSQL
* [ ] Sincronização online/offline
* [ ] Backup dos dados
* [ ] Exportação de relatórios
* [ ] Impressão de recibos
* [ ] Gestão de fornecedores
* [ ] Gestão de clientes
* [ ] Notificações
* [ ] Melhorias no modo PWA
* [ ] Suporte para múltiplos utilizadores

---

## 👨‍💻 Desenvolvimento

Projeto desenvolvido por **Mauro Muguiviza** como uma solução prática para gestão de pequenos negócios.

O projeto encontra-se em desenvolvimento e novas funcionalidades serão adicionadas progressivamente.

---

## 📄 Licença

Este projeto é privado e encontra-se em desenvolvimento.

O código não deve ser redistribuído ou utilizado comercialmente sem autorização do autor.

---

<div align="center">

**Diverse**

*Gestão simples. Negócio organizado.*

</div>
