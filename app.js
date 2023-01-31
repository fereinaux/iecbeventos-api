const express = require('express')
const CepCoords = require("coordenadas-do-cep")
const cors = require('cors');
const app = express()

app.use(express.json())
app.use(cors({
  origin: '*'
}));
const port = process.env.PORT || 3000

app.get('', (req, res) => { res.send('ok') })

app.get('/cep/:cep', async (req, res) => {
  const info = await CepCoords.getByCep(req.params.cep);
  res.send(info)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})