const express = require('express')
let Correios = require('node-cep-correios');
let correios = new Correios();
const cors = require('cors');
const bot = require('@wppconnect-team/wppconnect');
const app = express()
http = require('http');
app.use(express.json())
app.use(cors({
  origin: '*'
}));
const server = http.createServer(app);
const { Server } = require("socket.io");
const { default: axios } = require('axios');
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// add new listener to the http server for requests
server.on('request', (req, res) => {
  // check if this is the path we are interested in
  // if there could be query parameters, then you have to parse them off first
  if (req.url === "/somePath") {
    // If desired, set these more specifically such as only specific origins
    // or CORS only allowed on specific methods
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
      // add other headers as needed
    };

    // if pre-flight request, handle it here
    if (req.method === 'OPTIONS') {
      res.writeHead(204, headers);
      res.end();
      return;
    } else if (req.method === "GET") {
      res.writeHead(200, headers);
      // handle rest of the GET request here
      // ...
      res.end();
    } else {
      res.writeHead(405);
      res.end();
    }
  }
});

const port = process.env.PORT || 3000

app.get('', (req, res) => { res.send('ok') })

app.get('/cep/:cep', async (req, res) => {
  const result = await correios.consultaCEP({ cep: req.params.cep })

  const info = {
    cep: result.cep,
    logradouro: result.address,
    bairro: result.district,
    localidade: result.city,
    uf: result.state,
    ibge: result.city_ibge,
    ddd: result.ddd,
    lat: result.lat,
    lon: result.lng
  }
  res.send(info)
})

app.get('/postalcode/:code', async (req, res) => {
  const result = await axios.get(`https://geocoder.ca/${req.params.code}?json=1`)
  const info = {
    cep: result.postal,
    logradouro: result.data.staddress,
    localidade: result.data.city,
    uf: result.data.standard.prov,
    lat: result.data.latt,
    lon: result.data.longt
  }
  res.send(info)
})

let clients = []

app.post('/whatsapp/message', async (req, res) => {
  const { body } = req
  const client = await handleSession(body.session)
  if (client) {
    for (let index = 0; index < body.messages.length; index++) {
      const message = body.messages[index]
      const number = message.number.substr(0, 4) + (message.number.length == 18 ? '' : '9') + message.number.substr(5, 20);
      await client.sendText(number, message.text)
      await sleep(700)
    }
    res.sendStatus(200)
  } else {
    res.sendStatus(404)
  }
})


const sleep = ms => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

var myTokenStore = new bot.tokenStore.FileTokenStore({
  decodeFunction: JSON.parse,
  encodeFunction: JSON.stringify,
  encoding: 'utf8',
  path: './tokens/session',
});

async function handleSession(session) {
  let client = clients.find(x => x.session == session)?.client
  if (!client) {
    client = await bot
      .create({
        session,
        tokenStore: myTokenStore,
        useChrome: false,
        autoClose: 0,
        puppeteerOptions: {
          args: ['--no-sandbox',],
          headless: true,
          ignoreHTTPSErrors: true,
          userDataDir: `./tokens/${session}`, // or your custom directory
          executablePath: 'node_modules\\chromium\\lib\\chromium\\chrome-win\\chrome.exe',
        },
        catchQR: (base64Qr, asciiQR, attempts, urlCode) => {
          var matches = base64Qr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
            response = {};

          if (matches.length !== 3) {
            return new Error("Invalid input string");
          }

          io.emit("session", { connected: false, base64: matches[2] });
        }
      })

    client.onStreamChange((state) => {
      if (state == 'DISCONNECTED') {
        clients = clients.filter(lClient => lClient.session !== session)
      }
    })
    clients.push({ session, client })
    return client
  } else {
    return client
  }

}

io.on("connection", (socket) => {
  socket.on("session", async (session) => {
    await handleSession(session)
    io.emit("session", { connected: true, session });
  });

  socket.on('disconnect', async function () {

  });
});