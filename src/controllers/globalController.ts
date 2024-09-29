import { AccountModel, UsersModel } from '@/models'
import { checkForProtectedRequests, getQueryResponseFields } from '@/helpers'
import { GraphQLError } from 'graphql';
import { Cryptography } from '@/helpers/cryptography';
import { ZERO_SIGN_PRIVATE_KEY, ZERO_ENCRYPTION_KEY } from '@/constants';
import { notificationServer } from '@/rpc/notificationRPC';
import { EmailJoiSchema } from '@/joi/emailSchema';
import { EmailMessageType } from '@/types';

export class GlobalController {
    static signData = async (_: unknown, { hash }: { hash: string }, context: any) => {
        try {
            await checkForProtectedRequests(context.req);

            const hashData = await Cryptography.hash(JSON.stringify({
                hash,
                ZERO_ENCRYPTION_KEY,
                ZERO_SIGN_PRIVATE_KEY
            }))

            console.log({ hashData, ZERO_ENCRYPTION_KEY, hash });

            const signature = Cryptography.sign(hashData, ZERO_SIGN_PRIVATE_KEY)
            return signature

        } catch (error: any) {
            throw new GraphQLError(error.message);
        }
    }

}