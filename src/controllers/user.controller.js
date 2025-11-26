import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token :")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    //get user details for register
    //validation - not empty
    //check if user already registered: userName & email
    //check for avatar image
    //upload them to cloudinary
    //check if avatar uploaded on cloudinary
    //create user object - create entry in db
    //remove password and refresh token field from db response
    //check for user creation
    //return response

    const { email, userName, fullName, password } = req.body

    if (
        [userName, email, fullName, password].some((field) => !field || field.trim() === "")
    ) {
        throw new ApiError(400, "Field is required")
    }

    const existedUser = await User.findOne({
        $or: [{ userName }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files?.coverImage[0]?.path;
    };

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    // console.log("avatar from cloudinary",avatar)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Cloudinary - Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        userName: userName.toLowerCase(),
        email,
        password,
    })
    console.log(user, "DB response after user creation")

    //exclude password & refreshToken from db response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // data from req body
    // find user exist or not - email or userName
    // password check
    // generate access and refresh token
    // send cookies

    const { email, userName, password } = req.body

    if (!email && !userName) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ userName }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Inavlid user credentials ")
    }

    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        // secure: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "None"
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged in Successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    // get token - cookies, header & body
    // decode token -> find user by id
    // update db 
    // remove cookies

    const userId = req.user?._id

    await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                refreshToken: undefined
            },

        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "User Logged Out Successfully")
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.ACCESS_TOKEN_SECRET)

    const user = await User.findById(decodedToken._id)

    if (!user) {
        throw new ApiError(401, "Invalid refresh token")
    }

    if (incomingRefreshToken !== user?.refreshToken) {
        throw new ApiError(401, "Refresh token is expired or used")
    }

    //generate refresh token and send in cookies
    const options = {
        httpOnly: true,
        secure: true
    }

    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id)

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("newRefreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, { accessToken, newRefreshToken: refreshToken }, "Access Token Refreshed Successfully")
        )

})

const changePassword = asyncHandler(async (req, res) => {
    // data from req->body : oldPassword, newPassword
    // find user & verify user
    // check password
    // update password in db
    // return response
    try {
        const { oldPassword, newPassword } = req.body

        const user = await User.findById(req.user?._id)
        console.log(user, "user login")

        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

        if (!isPasswordCorrect) {
            throw new ApiError(400, "Invalid password")
        }

        user.password = newPassword
        await user.save({ validateBeforeSave: false })

        return res
            .status(200)
            .json(
                new ApiResponse(200, {}, "Password Changed Successfully")
            )

    } catch (error) {
        throw new ApiError(401, "Unauthorized request")
    }
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(200, req.user, "User fetched successfully")
    )
})

const updateUserProfile = asyncHandler(async (req, res) => {
    try {
        const { fullName, email } = req.body
        const user = await User.findByIdAndUpdate(req.user?._id,
            {
                $set: {
                    fullName,
                    email
                }
            },
            { new: true }
        ).select("-password")

        return res
            .status(200)
            .json(
                new ApiResponse(200, user, "Profile updated successfully")
            )


    } catch (error) {
        throw new ApiError(400, "Something went wrong while updating the user profile")
    }
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Avatar updated successfully")
        )
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image fle is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading cover Image")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Cover Image updated successfully")
        )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateUserProfile,
    updateUserAvatar,
    updateUserCoverImage
}