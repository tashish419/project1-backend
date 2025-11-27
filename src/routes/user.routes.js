import { Router } from "express";
import {
    changePassword,
    getCurrentUser,
    getUserChannelProfile,
    getWatchHistory,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    updateUserAvatar,
    updateUserCoverImage,
    updateUserProfile
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(upload.fields([
    {
        name: "avatar",
        maxCount: 1,
    },
    {
        name: "coverImage",
        maxCount: 1,
    }
]), registerUser)

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refreshAccessToken").post(refreshAccessToken)
router.route("/changePassword").post(verifyJWT, changePassword)
router.route("/getCurrentUser").post(verifyJWT, getCurrentUser)
router.route("/updateUserProfile").post(verifyJWT, updateUserProfile)
router.route("/updateUserAvatar").post(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/updateUserCoverImage").post(verifyJWT, upload.single("coverImage"), updateUserCoverImage)
router.route("/getUserChannelProfile/:userName").post(verifyJWT, getUserChannelProfile)
router.route("/getWatchHistory").post(verifyJWT, getWatchHistory)



export default router