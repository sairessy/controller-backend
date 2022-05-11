import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()
app.use(express.json({limit: "3mb"}))
app.use(cookieParser())
app.use(cors({origin: "*"}))
app.use(express.static("public"))

const PORT = process.env.PORT || 8000

app.listen(PORT, () => {
  console.log("Server On!!!")
})

export default app