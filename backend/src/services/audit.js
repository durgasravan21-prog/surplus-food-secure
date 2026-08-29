import { insert, newId } from '../db/supabase.js';

export function logAudit(actorId, action, resourceType, resourceId, metadata = {}) {
  const entry = {
    id:            newId(),
    actor_id:      actorId || 'system',
    action:        action || 'ACTION',
    resource_type: resourceType || 'System',
    resource_id:   resourceId || '0',
    metadata:      typeof metadata === 'string' ? metadata : JSON.stringify(metadata),
    timestamp:     new Date().toISOString(),
  };
  
  insert('audit_logs', entry).catch((err) => {
    console.warn('[Audit] Warning writing audit log:', err.message);
  });
  
  console.log(`[Audit] ${action} on ${resourceType}:${resourceId} by ${actorId}`);
}
