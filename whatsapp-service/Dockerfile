FROM node:18-slim

# Instala dependências do sistema necessárias para o Puppeteer e o GIT (novo)
RUN apt-get update \
    && apt-get install -y wget gnupg git \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Define variáveis de ambiente para o Puppeteer pular o download do Chromium (usaremos o do sistema)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /app

# Copia arquivos de dependência
COPY package.json ./

# Instala dependências do Node (Agora vai funcionar pois temos git)
RUN npm install

# Copia o restante do código
COPY . .

# Expõe a porta
EXPOSE 3001

# Comando de inicialização
CMD ["node", "server.js"]