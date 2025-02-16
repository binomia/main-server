import "dotenv/config"
import cluster from "cluster";
import os from "os";
import express from 'express';
import http from 'http';
import cors from 'cors';
import { ApolloServer, ApolloServerPlugin } from '@apollo/server';
import { KeyvAdapter } from "@apollo/utils.keyvadapter";
import { typeDefs } from './src/gql'
import { resolvers } from './src/gql'
import { db } from './src/config';
import { keyvRedis } from "@/redis";
import { formatError } from "@/helpers";
import { PORT } from "@/constants";
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { collectDefaultMetrics, register } from 'prom-client';
import { initTracing } from "@/tracing";
import { metrics, trace, Context, Counter } from '@opentelemetry/api';



const app = express();
const httpServer = http.createServer(app);

// Collect default Node.js metrics
collectDefaultMetrics();
initTracing();


const errorHandlingPlugin: ApolloServerPlugin = {
    async requestDidStart() {
        return {
            async willSendResponse({ response, errors }: any) {
                if (errors && errors.length > 0) {
                    const errorCode = errors[0]?.extensions?.http?.status || 500;
                    response.http.status = errorCode; // Set HTTP status correctly
                }
            },
        };
    },
};


(async () => {
    if (cluster.isPrimary) {
        os.cpus().forEach(() => {
            cluster.fork()
        })

    } else {
        await db.authenticate().then(() => {
            console.log('\nDatabase connection has been established successfully.');
            db.sync()

        }).catch((err) => {
            console.log('\nUnable to connect to the database:', err);
        })

        const server = new ApolloServer<any>({
            typeDefs,
            resolvers,
            csrfPrevention: false,
            cache: new KeyvAdapter(keyvRedis),
            formatError,
            plugins: [
                errorHandlingPlugin,
                ApolloServerPluginDrainHttpServer({ httpServer })
            ]
        });

        await server.start();

        const meter = metrics.getMeter('binomia-apollo-main-server');
        const counter = meter.createCounter('transactions');

        counter.add(1, { transaction: 'deposit' });

        // // 2) Create a custom /metrics endpoint
        app.get('/metrics', async (req, res) => {
            res.set('Content-Type', register.contentType);
            res.end(await register.metrics());
        });

        app.use('/graphql',
            cors<cors.CorsRequest>({
                origin: "*",
            }),
            express.json(),
            expressMiddleware(server, {
                context: async ({ req, res }) => {
                    return { req, res };
                },
            }),
        );

        httpServer.listen(PORT, () => {
            console.log(`[Main-Server]: worker ${cluster.worker?.id} is running on http://localhost:${PORT}`);
        })
    }
})()



