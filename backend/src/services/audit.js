import { insert, newId } from '../db/database.js';

export function logAudit(actorId, action, resourceType, resourceId, metadata = {}) {
  const entry = {
    id:            newId(),
    actor_id:      actorId,
    action,
    resource_type: resourceType,
    resource_id:   resourceId,
    metadata:      typeof metadata === 'string' ? metadata : JSON.stringify(metadata),
    timestamp:     new Date().toISOString(),
  };
  insert('audit_logs', entry);
  console.log(`[Audit] ${action} on ${resourceType}:${resourceId} by ${actorId}`);
}
