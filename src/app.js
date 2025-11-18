import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({ limit: "16kb"})) // for parsing application/json
app.use(express.urlencoded({ extended: true, limit: "16kb"})) //to encode the data from url
app.use(express.static("public")) //to create public folder on server
app.use(cookieParser())

// import router
import userRouter from "./routes/user.routes.js";

//route declaration
app.use("/api/v1/users", userRouter)

// app.get("/healthq",(req,res)=>{return res.send("OK")})

export {app}