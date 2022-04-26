const express = require('express')
const CepCoords = require("coordenadas-do-cep")
const cors = require('cors');
const app = express()
const fs = require('fs');
const venom = require('venom-bot');
let localClient

venom
  .create(
    'reinaux',
    (base64Qr, asciiQR, attempts, urlCode) => {
      console.log(asciiQR); // Optional to log the QR in the terminal
      var matches = base64Qr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
        response = {};

      if (matches.length !== 3) {
        return new Error('Invalid input string');
      }
      response.type = matches[1];
      response.data = new Buffer.from(matches[2], 'base64');

      var imageBuffer = response;
      require('fs').writeFile(
        'qr.png',
        imageBuffer['data'],
        'binary',
        function (err) {
          if (err != null) {
            console.log(err);
          }
        }
      );
    },
    undefined,
    { logQR: false }
  )
  .then((client) => {
    localClient = client;
  })
  .catch((erro) => {
    console.log(erro);
  });

app.use(express.json())
app.use(cors({
  origin: '*'
}));
const port = process.env.PORT ||3000

app.get('',(req,res) => { res.send('ok') })

app.get('/whatsapp/qr', async (req, res) => {
	res.sendFile('qr.png', { root: __dirname })
})

app.post('/whatsapp/send', async (req, res) => {
	let body = req.body

  localClient.sendText(body.Fone + '@c.us',body.Mensagem)
  res.send(200)
})

app.get('/cep/:cep', async (req, res) => {
  const info = await CepCoords.getByCep(req.params.cep);
	res.send(info)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})