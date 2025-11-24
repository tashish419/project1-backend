import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

    await User.findByIdAndUpdate(
        req.user._id,
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

    res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "User Logges Successfully")
        )
})

export { registerUser, loginUser, logoutUser }