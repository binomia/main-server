export interface AccountModelType {
    id?: number
    balance: number
    status: string
    sendLimit: number
    receiveLimit: number
    withdrawLimit: number
    hash: string
    currency: string
    createdAt: Date
    updatedAt: Date
}