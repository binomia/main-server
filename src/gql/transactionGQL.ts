import { TransactionsController } from '@/controllers'


const type = () => {
    return `
        input TransactionLocationInput {
            latitude: Float
            longitude: Float
        }  

        input TransactionInput {
            receiver: String
            amount: Float
            transactionType: String
            currency: String
            location: TransactionLocationInput
        }
        input TransactionRecurrenceInput {
            title: String
            time: String
        }

        input BankingTransactionInput {
            amount: Float
            transactionType: String
            currency: String
            location: TransactionLocationInput
        }

        type TransactionType {
            transactionId: String
            amount: Float
            deliveredAmount: Float         
            voidedAmount: Float
            transactionType: String
            currency: String
            status: String
            location: TransactionLocationType
            createdAt: String
            updatedAt: String
            from: AccountTypeWithUser
            to: AccountTypeWithUser
        }

        type TransactionLocationType {
            latitude: Float
            longitude: Float
        } 

        type TransactionCreatedType {
            transactionId: String
            amount: Float
            deliveredAmount: Float
            voidedAmount: Float
            transactionType: String
            currency: String
            status: String
            location: TransactionLocationType
            createdAt: String
            updatedAt: String
            receiver: OnlyUserType
        }  
            
        type BankingTransactionType {
            transactionId: String
            amount: Float
            deliveredAmount: Float         
            voidedAmount: Float
            transactionType: String
            currency: String
            status: String
            location: TransactionLocationType
            createdAt: String
            updatedAt: String
            account: AccountTypeWithUser
            card: OnlyCardType
            data: JSON
        }

        type BankingTransactionCreatedType {
            transactionId: String
            amount: Float
            deliveredAmount: Float
            voidedAmount: Float
            transactionType: String
            currency: String
            status: String
            location: TransactionLocationType
            createdAt: String
            updatedAt: String
            account: AccountTypeWithUser
            card: OnlyCardType
            data: JSON
        }   

        type OnlyTransactionType {
            transactionId: String
            amount: Float
            deliveredAmount: Float
            voidedAmount: Float
            transactionType: String
            currency: String
            status: String
            location: TransactionLocationType
            createdAt: String
            updatedAt: String
        }

        type TransactionsWithAccountType {
            transactionId: String
            amount: Float
            deliveredAmount: Float
            voidedAmount: Float
            transactionType: String
            currency: String
            status: String
            location: TransactionLocationType
            fromAccount: OnlyAccountType
            toAccount: OnlyAccountType
            createdAt: String
            updatedAt: String            
        }

        type RecurrentTransactionType {
            jobId: String
            repeatJobKey: String
            jobName: String
            status: String
            repeatedCount: Int
            data: JSON
            signature: String
            account: OnlyAccountType
            createdAt: String
            updatedAt: String
        }
    `
}


const query = () => {
    return `
        transaction: TransactionType
        accountTransactions(page: Int!, pageSize: Int!): [TransactionType]
        accountRecurrentTransactions(page: Int!, pageSize: Int!): [RecurrentTransactionType]
        accountBankingTransactions(page: Int!, pageSize: Int!): [BankingTransactionType]
    `
}

const mutation = () => {
    return `
        createTransaction(data: TransactionInput!, recurrence: TransactionRecurrenceInput!): TransactionCreatedType
        createBankingTransaction(cardId: Int!, data: BankingTransactionInput!): BankingTransactionCreatedType
    `
}

const subscription = () => {
    return ``
}

const { createTransaction, accountBankingTransactions,accountRecurrentTransactions, accountTransactions, createBankingTransaction } = TransactionsController
const resolvers = {
    query: {
        accountTransactions,
        accountBankingTransactions,
        accountRecurrentTransactions
    },
    mutation: {
        createTransaction,
        createBankingTransaction
    },
    subscription: {

    }
}

export default {
    type,
    query,
    mutation,
    subscription,
    resolvers
}