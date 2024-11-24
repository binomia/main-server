import { AccountModel, kycModel, BankingTransactionsModel, TransactionsModel, UsersModel, CardsModel } from '@/models'
import { checkForProtectedRequests, getQueryResponseFields, } from '@/helpers'
import { GraphQLError } from 'graphql';
import { TransactionJoiSchema } from '@/auth/transactionJoiSchema';
import { Cryptography } from '@/helpers/cryptography';
import { QUEUE_JOBS_NAME, REDIS_SUBSCRIPTION_CHANNEL, ZERO_ENCRYPTION_KEY, ZERO_SIGN_PRIVATE_KEY } from '@/constants';
import { Op } from 'sequelize';
import redis from '@/redis';
import shortUUID from 'short-uuid';
import RecurrenceTransactionsModel from '@/models/recurrenceTransactionModel';
import { queueServer } from '@/rpc/queueRPC';

export class TransactionsController {
    static createTransaction = async (_: unknown, { data, recurrence }: { data: any, recurrence: any }, context: any) => {
        try {
            await checkForProtectedRequests(context.req);
            const validatedData = await TransactionJoiSchema.createTransaction.parseAsync(data)
            const recurrenceData = await TransactionJoiSchema.recurrenceTransaction.parseAsync(recurrence)

            const { user: sender } = context.req.session
            const senderAccount = await AccountModel.findOne({
                where: { username: sender.username },
                include: [
                    {
                        model: UsersModel,
                        as: 'user',
                        attributes: { exclude: ['createdAt', 'dniNumber', 'updatedAt', 'faceVideoUrl', 'idBackUrl', 'idFrontUrl', 'profileImageUrl', 'password'] },
                        include: [
                            {
                                model: kycModel,
                                as: 'kyc',
                                attributes: ['id', 'dniNumber', 'dob', 'status', 'expiration']
                            }
                        ]
                    }
                ]
            })

            if (!senderAccount)
                throw new GraphQLError("sender account not found");

            const receiverAccount = await AccountModel.findOne({
                attributes: { exclude: ['username'] },
                where: {
                    username: validatedData.receiver
                },
                include: [
                    {
                        model: UsersModel,
                        as: 'user',
                        attributes: { exclude: ['createdAt', 'dniNumber', 'updatedAt', 'faceVideoUrl', 'idBackUrl', 'idFrontUrl', 'profileImageUrl', 'password'] },
                        include: [
                            {
                                model: kycModel,
                                as: 'kyc',
                                attributes: ['id', 'dniNumber', 'dob', 'status', 'expiration']
                            }
                        ]
                    }
                ]
            })

            if (!receiverAccount)
                throw new GraphQLError("receiver account not found");

            const dataToHash = await Cryptography.hash(JSON.stringify({
                receiverUsername: validatedData.receiver,
                receiver: validatedData.receiver,
                amount: validatedData.amount,
                transactionType: validatedData.transactionType,
                currency: validatedData.currency,
                location: validatedData.location
            }))

            const hash = await Cryptography.hash(JSON.stringify({
                hash: dataToHash,
                ZERO_ENCRYPTION_KEY,
                ZERO_SIGN_PRIVATE_KEY,
            }))

            const signature = await Cryptography.sign(hash, ZERO_SIGN_PRIVATE_KEY)
            // const transactionAuthorizationData = {
            //     amount: validatedData.amount,
            //     currency: validatedData.currency,
            //     transactionType: validatedData.transactionType,
            //     // location: validatedData.location,
            //     // userId: sender.id,
            //     // sender,
            //     // receiver: receiverAccount.toJSON(),
            //     signature
            // }

            // const transactionAuthorization: TransactionAuthorizationType = await authServer("echo", {});

            // if (transactionAuthorization.status !== "approved")
            //     throw new Error("Transaction authorization failed");


            const transaction = await TransactionsModel.create({
                fromAccount: senderAccount.toJSON().id,
                toAccount: receiverAccount.toJSON().id,
                amount: validatedData.amount,
                deliveredAmount: validatedData.amount,
                transactionType: validatedData.transactionType,
                currency: validatedData.currency,
                location: validatedData.location,
                signature
            })
            await senderAccount.update({
                balance: senderAccount.toJSON().balance - validatedData.amount
            })

            await receiverAccount.update({
                balance: receiverAccount.toJSON().balance + validatedData.amount
            })

            const transactionData = await transaction.reload({
                include: [
                    {
                        model: AccountModel,
                        as: 'from',
                        include: [{
                            model: UsersModel,
                            as: 'user',
                        }]
                    },
                    {
                        model: AccountModel,
                        as: 'to',
                        include: [{
                            model: UsersModel,
                            as: 'user',
                        }]
                    }
                ]
            })

            await redis.publish(REDIS_SUBSCRIPTION_CHANNEL.TRANSACTION_CREATED, JSON.stringify({
                data: transactionData.toJSON(),
                senderSocketRoom: senderAccount.toJSON().user.username,
                recipientSocketRoom: receiverAccount.toJSON().user.username
            }))

            if (recurrenceData.time !== "oneTime") {
                const recurrenceQueueData = await TransactionJoiSchema.recurrenceQueueTransaction.parseAsync(Object.assign(transactionData.toJSON(), {
                    amount: validatedData.amount,
                    receiver: validatedData.receiver,
                    sender: senderAccount.toJSON().username
                }))

                await redis.publish(QUEUE_JOBS_NAME.CREATE_TRANSACTION, JSON.stringify({
                    jobId: `${recurrenceData.title}@${shortUUID.generate()}${shortUUID.generate()}`,
                    jobName: recurrenceData.title,
                    jobTime: recurrenceData.time,
                    senderId: senderAccount.toJSON().id,
                    receiverId: receiverAccount.toJSON().id,
                    amount: validatedData.amount,
                    data: recurrenceQueueData
                }))
            }

            return transactionData.toJSON()

        } catch (error: any) {
            throw new GraphQLError(error.message);
        }
    }

    static createBankingTransaction = async (_: unknown, { cardId, data }: { cardId: number, data: any }, context: any) => {
        try {
            const session = await checkForProtectedRequests(context.req);
            const validatedData = await TransactionJoiSchema.bankingCreateTransaction.parseAsync(data)

            const card = await CardsModel.findOne({
                where: {
                    [Op.and]: [
                        { userId: session.user.id },
                        { id: cardId }
                    ]
                }
            })

            if (!card)
                throw new GraphQLError('The given card is not linked to the user account');


            const decryptedCardData = await Cryptography.decrypt(card.toJSON().data)
            const cardData = Object.assign({}, card.toJSON(), JSON.parse(decryptedCardData))

            // Need Payment Gateway Integration
            console.error("createBankingTransaction: Need Payment Gateway Integration");


            const hash = await Cryptography.hash(JSON.stringify({
                data: {
                    ...validatedData,
                    deliveredAmount: validatedData.amount,
                    accountId: session.user.account.id,
                    data: {}
                },
                ZERO_ENCRYPTION_KEY,
                ZERO_SIGN_PRIVATE_KEY,
            }))

            const signature = await Cryptography.sign(hash, ZERO_SIGN_PRIVATE_KEY)
            const transaction = await BankingTransactionsModel.create({
                ...validatedData,
                deliveredAmount: validatedData.amount,
                accountId: session.user.account.id,
                cardId: cardData.id,
                signature,
                data: {}
            })


            const newBalance = {
                deposit: session.user.account.balance + validatedData.amount,
                withdraw: session.user.account.balance - validatedData.amount
            }

            await AccountModel.update({
                balance: newBalance[validatedData.transactionType]
            }, {
                where: {
                    id: session.user.account.id
                }
            })

            await redis.publish(REDIS_SUBSCRIPTION_CHANNEL.BANKING_TRANSACTION_CREATED, JSON.stringify(transaction.toJSON()))

            return Object.assign({}, transaction.toJSON(), { card: cardData })

        } catch (error: any) {
            throw new GraphQLError(error.message);
        }
    }

    static accountBankingTransactions = async (_: unknown, { page, pageSize }: { page: number, pageSize: number }, context: any, { fieldNodes }: { fieldNodes: any }) => {
        try {
            const session = await checkForProtectedRequests(context.req);
            const fields = getQueryResponseFields(fieldNodes, 'transactions')

            const _pageSize = pageSize > 50 ? 50 : pageSize
            const limit = _pageSize;
            const offset = (page - 1) * _pageSize;

            const transactions = await BankingTransactionsModel.findAll({
                limit,
                offset,
                order: [['createdAt', 'DESC']],
                attributes: [...fields['transactions']],
                where: {
                    accountId: session.user.account.id
                },
                include: [
                    {
                        model: AccountModel,
                        as: 'account',
                        attributes: fields['account'],
                        include: [{
                            model: UsersModel,
                            as: 'user',
                            attributes: fields['user']
                        }]
                    },
                    {
                        model: CardsModel,
                        as: 'card',
                        attributes: fields['card']
                    }
                ]
            })

            if (!transactions)
                throw new GraphQLError('No transactions found');

            return transactions

        } catch (error: any) {
            throw new GraphQLError(error);
        }
    }

    static accountTransactions = async (_: unknown, { page, pageSize }: { page: number, pageSize: number }, context: any, { fieldNodes }: { fieldNodes: any }) => {
        try {
            const session = await checkForProtectedRequests(context.req);

            const fields = getQueryResponseFields(fieldNodes, 'transactions')
            const { user } = session

            const _pageSize = pageSize > 50 ? 50 : pageSize
            const limit = _pageSize;
            const offset = (page - 1) * _pageSize;

            const transactions = await TransactionsModel.findAll({
                limit,
                offset,
                order: [['createdAt', 'DESC']],
                attributes: [...fields['transactions'], "fromAccount", "toAccount"],
                where: {
                    [Op.or]: [
                        {
                            fromAccount: user.account.id
                        },
                        {
                            toAccount: user.account.id,
                        }
                    ]
                },
                include: [
                    {
                        model: AccountModel,
                        as: 'from',
                        attributes: fields['from'],
                        include: [{
                            model: UsersModel,
                            as: 'user',
                            attributes: fields['user']
                        }]
                    },
                    {
                        model: AccountModel,
                        as: 'to',
                        attributes: fields['to'],
                        include: [{
                            model: UsersModel,
                            as: 'user',
                            attributes: fields['user']
                        }]
                    }
                ]
            })

            if (!transactions)
                throw new GraphQLError('No transactions found');

            return transactions

        } catch (error: any) {
            throw new GraphQLError(error);
        }
    }

    static accountRecurrentTransactions = async (_: unknown, { page, pageSize }: { page: number, pageSize: number }, context: any, { fieldNodes }: { fieldNodes: any }) => {
        try {
            const session = await checkForProtectedRequests(context.req);

            const fields = getQueryResponseFields(fieldNodes, 'transactions')

            const _pageSize = pageSize > 50 ? 50 : pageSize
            const limit = _pageSize;
            const offset = (page - 1) * _pageSize;

            const transactions = await RecurrenceTransactionsModel.findAll({
                limit,
                offset,
                order: [['createdAt', 'DESC']],
                attributes: fields['transactions'],
                where: {
                    [Op.and]: [
                        { senderId: session.user.account.id },
                        { status: "active" }
                    ]
                },
                include: [
                    {
                        model: AccountModel,
                        as: 'sender',
                        attributes: fields['sender'],
                        include: [{
                            model: UsersModel,
                            as: 'user',
                            attributes: fields['user']
                        }]
                    },
                    {
                        model: AccountModel,
                        as: 'receiver',
                        attributes: fields['receiver'],
                        include: [{
                            model: UsersModel,
                            as: 'user',
                            attributes: fields['user']
                        }]
                    },
                ]
            })

            if (!transactions)
                throw new GraphQLError('No transactions found');

            return transactions

        } catch (error: any) {
            throw new GraphQLError(error);
        }
    }

    static deleteRecurrentTransactions = async (_: unknown, { repeatJobKey }: { repeatJobKey: string }, context: any, { fieldNodes }: { fieldNodes: any }) => {
        try {
            await checkForProtectedRequests(context.req);
            const job = await queueServer("removeJob", { jobKey: repeatJobKey })
            return job

        } catch (error: any) {
            throw new GraphQLError(error);
        }
    }

    static updateRecurrentTransactions = async (_: unknown, { data: { repeatJobKey, jobName, jobTime } }: { data: { repeatJobKey: string, jobName: string, jobTime: string } }, context: any) => {
        try {
            await checkForProtectedRequests(context.req);
            const job = await queueServer("updateJob", { jobKey: repeatJobKey, jobName, jobTime })
            return job

        } catch (error: any) {
            throw new GraphQLError(error);
        }
    }
}