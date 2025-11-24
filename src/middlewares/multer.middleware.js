import multer from "multer"
import path from "path"
import fs from "fs"
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const storage = multer.diskStorage({
    destination:  (req, file, cb)=> {

        const uploadPath = path.join(__dirname, "./public/temp");

    // Ensure uploads folder exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);

        // cb(null, './public/temp')
    },
    filename:  (req, file, cb) => {
        cb(null, file.originalname)
    }
})

export const upload = multer(
    {
        storage,
    }
)