import { Router } from 'itty-router';
import { tutorRouter } from './routes/tutorInteract';
import { explainTestCaseRouter } from './routes/explainTestCase';
import { tutorEvaluateRouter } from './routes/tutorEvaluate';
import { executeCodeRouter } from './routes/executeCodeRouter';
import { generalChatRouter } from './routes/generalChatRouter';

const router = Router();
router.all('/v1/tutor/interact/*', tutorRouter.fetch);
router.all('/v1/tutor/explain_test_case/*', explainTestCaseRouter.fetch);
router.all('/v1/tutor/evaluate', tutorEvaluateRouter.fetch);
router.all('/v1/execute/code/*', executeCodeRouter.fetch);
router.all('/v1/chat/*', generalChatRouter.fetch);
router.all('*', () => new Response('Not Found.', { status: 404 }));

const WHITELIST = new Set([
    'http://localhost:5173',
    'https://ai-classroom.pages.dev',
    'https://demo.ericlighthall.com'
]);

const toCorsHeaders = (origin: string) => {
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
};

const asResponse = (value: unknown): Response => {
    if (value instanceof Response) return value;

    const body =
        (value as { body?: BodyInit | null } | null | undefined)?.body ??
        'Handler error: Invalid response type from route.';
    const init =
        typeof value === 'object' && value !== null
            ? (value as ResponseInit)
            : { status: 500 };
    return new Response(body, init);
};

const applyCors = (response: Response, origin: string): Response => {
    if (!WHITELIST.has(origin)) return response;

    const headers = new Headers(response.headers);
    Object.entries(toCorsHeaders(origin)).forEach(([key, value]) => {
        headers.set(key, value);
    });

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
};

export default {
    async fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> {
        const origin = request.headers.get('Origin') || '';

        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: WHITELIST.has(origin) ? toCorsHeaders(origin) : undefined,
            });
        }

        try {
            const response = asResponse(await router.fetch(request, env, ctx));
            return applyCors(response, origin);
        } catch (err: any) {
            console.error("Unhandled error during router.fetch:", err.stack || err);
            return applyCors(
                new Response("Internal Server Error", { status: 500 }),
                origin
            );
        }
    }
};
