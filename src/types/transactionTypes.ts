export type TransactionModelType = {
    id: number
    senderId: number
    receiverId: number
    deliveredAmount: number
    balanceAfterTransaction: number
    balanceBeforeTransaction: number
    voidedAmount: number
    refundedAmount: number
    transactionType: string
    currency: string
    description: string
    status: string
    location: {
        latitude: number
        longitude: number
    }
    signature: string
    createdAt: string
    updatedAt: string
}

export interface TransactionAuthorizationType extends TransactionModelType {
    amount: number
}



export type TransactionCreateType = {
    amount: number
    currency: string
    description: string
    transactionType: string
    receiver: string
    location: {
        latitude: number
        longitude: number
    }
}