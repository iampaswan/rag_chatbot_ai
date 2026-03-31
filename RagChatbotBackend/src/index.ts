import express from 'express'
import resultRoute from './routes/ragRoutes'
import { connectDB } from './configuration/connectdb'
import cors from 'cors'

import dotenv from 'dotenv'
dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const port = process.env.PORT || 3000
connectDB()

app.use('/', resultRoute)

app.get("/", (req, res) => {
  res.send("RAG Backend is running ");
});

app.listen(port, () => {
  console.log(`app listening on port ${port}`)
})

