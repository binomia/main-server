import userGQL from "./userGQL";
import accountGQL from "./accountGQL";
import cardGQL from "./cardGQL";
import transactionGQL from "./transactionGQL";
import globalGQL from "./globalGQL";



export const typeDefs = `
    ${userGQL.type()}
    ${accountGQL.type()}
    ${cardGQL.type()}
    ${transactionGQL.type()}
    ${globalGQL.type()}
    


    type Query {
        ${userGQL.query()}
        ${accountGQL.query()}
        ${cardGQL.query()}
        ${transactionGQL.query()}
        ${globalGQL.query()}
    }


    type Mutation {
        ${userGQL.mutation()}
        ${cardGQL.mutation()}
        ${transactionGQL.mutation()}
        ${globalGQL.mutation()}
    }


    type Subscription {
        ${userGQL.subscription()}
    }
`;


export const resolvers = {
    Query: {
        ...userGQL.resolvers.query,
        ...accountGQL.resolvers.query,
        ...cardGQL.resolvers.query,
        ...transactionGQL.resolvers.query,
        ...globalGQL.resolvers.query

    },

    Mutation: {
        ...userGQL.resolvers.mutation,
        ...accountGQL.resolvers.mutation,
        ...cardGQL.resolvers.mutation,
        ...transactionGQL.resolvers.mutation,
        ...globalGQL.resolvers.mutation

    },

    Subscription: {
        ...userGQL.resolvers.subscription,
        ...accountGQL.resolvers.subscription,
        ...cardGQL.resolvers.subscription,
        ...transactionGQL.resolvers.subscription,
        ...globalGQL.resolvers.subscription
    }
}

