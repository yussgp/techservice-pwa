import { Router } from 'express';

export function createReportRoutes({ controller }) {
  const router = Router();

  router.get('/', controller.list);
  router.post('/', controller.create);
  router.post('/sync', controller.sync);
  router.get('/:id', controller.get);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
}
