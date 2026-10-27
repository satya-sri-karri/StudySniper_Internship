import { Router as ExpressRouter } from 'express';
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
// Express 4 does not forward rejected handler promises automatically.
export function Router() {
  const router = ExpressRouter();
  for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
    const register = router[method].bind(router);
    (router as any)[method] = (path: string, ...handlers: any[]) => register(path,
      ...handlers.map(handler => (req: any, res: any, next: any) => {
        try { Promise.resolve(handler(req, res, next)).catch(next); } catch (error) { next(error); }
      }));
  }
  return router;
}
