# Usa uma imagem Node.js baseada em Debian (slim) que é leve mas compatível
FROM node:18-slim

# Instala dependências do sistema necessárias para o Puppeteer (Chrome)
# Sem isso, o navegador trava dentro do Docker
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Configura diretório de trabalho
WORKDIR /app

# Copia arquivos de dependência primeiro (para cache do Docker ser eficiente)
COPY package.json ./

# Instala dependências do Node
# Usamos --omit=dev para produção, mas aqui pode ser normal
RUN npm install

# Copia o restante do código
COPY . .

# Expose na porta que definimos no server.js
EXPOSE 3001

# Comando para iniciar
CMD [ "node", "server.js" ]