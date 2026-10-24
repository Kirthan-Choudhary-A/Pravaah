import { handleApi } from '../server/handlers';

// Vercel function: GET /api/health and POST /api/{chat,translate,tts,stt}.
// Keys come from the project's environment variables, never from the browser.
const handler = (req: Request): Promise<Response> => handleApi(req, process.env);

export const GET = handler;
export const POST = handler;
