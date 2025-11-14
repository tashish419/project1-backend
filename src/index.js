import dotenv from 'dotenv'
import { PORT } from "./constants.js";
import connectDB from './db/index.js';
import { app } from './app.js';


dotenv.config({
    path: "./.env"
})

connectDB()
    .then(() => {
        app.on("error", (error) => {
            console.log("ERR: ", error)
            throw error
        })
        app.listen(PORT, () => {
            console.log(`Server is running at PORT: ${PORT}`)
        })
    })
    .catch((err) => {
        console.log("MongoDB connection failed !!!", err)
    })

/*
import express from "express";
const app = express()

    (async () => {
        try {
            await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
            app.on("error", (error) => {
                console.log("ERR: ", error)
                throw error
            })

            app.listen(process.env.PORT, () => {
                console.log(`App is listening on port ${process.env.PORT}`)
            })
        } catch (error) {
            console.error("ERROR: ", error)
            throw error
        }
    })
*/