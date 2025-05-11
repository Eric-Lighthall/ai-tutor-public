import { Router } from 'itty-router';
import { tutorRouter } from './routes/tutorInteract';
import { explainTestCaseRouter } from './routes/explainTestCase';
import { tutorEvaluateRouter } from './routes/tutorEvaluate';

const router = Router();

router.all('/v1/tutor/interact', tutorRouter.fetch);
router.all('/v1/tutor/explain_test_case', explainTestCaseRouter.fetch);
router.all('/v1/tutor/evaluate', tutorEvaluateRouter.fetch);

router.all('*', () => new Response('Not Found.', { status: 404 }));

// Change to env vars in the future
const WHITELIST = new Set([
	'http://localhost:5173',
	'https://ai-classroom.pages.dev',
	'https://demo.ericlighthall.com'
]);

function getCorsHeaders(origin: string) {
	return {
		'Access-Control-Allow-Origin': origin,
		'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
	};
}

export default {
	// Handle routing and CORS.
	async fetch(request: Request, env: unknown, ctx: unknown) {
		const origin = request.headers.get('Origin') || '';

		// Handle preflight requests. Remove in future if CORS handling set up in cloudflare/azure.
		if (request.method === 'OPTIONS') {
			if (WHITELIST.has(origin)) {
				return new Response(null, {
					status: 204,
					headers: getCorsHeaders(origin)
				});
			}
			return new Response(null, { status: 204 });
		}

		let response = await router.fetch(request, env, ctx);

		response = new Response(response.body, response);

		if (WHITELIST.has(origin)) {
			for (const [key, value] of Object.entries(getCorsHeaders(origin))) {
				response.headers.set(key, value);
			}
		}

		return response;
	}
};