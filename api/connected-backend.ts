import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  handleAuthorize,
  handleCallback,
  handleOnboardingSessions,
  handleProjects,
  handleSelectProject,
} from './_lib/connectedBackendHandlers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const route = Array.isArray(req.query.route) ? req.query.route[0] : req.query.route;
  switch (route) {
    case 'onboarding-sessions': return handleOnboardingSessions(req, res);
    case 'authorize': return handleAuthorize(req, res);
    case 'callback': return handleCallback(req, res);
    case 'projects': return handleProjects(req, res);
    case 'select-project': return handleSelectProject(req, res);
    default: return res.status(404).json({ success: false, error: 'Unknown connected backend route' });
  }
}