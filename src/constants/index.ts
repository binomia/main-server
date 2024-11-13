import { GlobalZodSchema } from "@/auth"

export const PORT = process.env.PORT || 8000

const evironmentVariables = GlobalZodSchema.evironmentVariables.parse(process.env)
export const {
    REDIS_HOST,
    REDIS_PORT,
    SESSION_SECRET_SECRET_KEY,
    ZERO_ENCRYPTION_KEY,
    AUTH_SERVER_URL,
    NOTIFICATION_SERVER_URL,
    ZERO_SIGN_PRIVATE_KEY

} = evironmentVariables


export const REDIS_SUBSCRIPTION_CHANNEL = {
    TRANSACTION_CREATED: "TRANSACTION_CREATED",
    LOGIN_VERIFICATION_CODE: "LOGIN_VERIFICATION_CODE"
}



export const QUEUE_JOBS_NAME = {
    CREATE_TRANSACTION: "CREATE_TRANSACTION",
}