import { existsSync } from 'fs';
import { join } from 'path';

const getUploadDirCandidates = () => ([
  join(process.cwd(), 'uploads'),
  join(process.cwd(), 'backend', 'uploads'),
  join(__dirname, '..', '..', 'uploads'),
]);

export const resolveUploadRoot = () => {
  const candidates = getUploadDirCandidates();
  const existing = candidates.find(candidate => existsSync(candidate));
  return existing ?? candidates[candidates.length - 1];
};

export const resolveUploadRootsForStatic = () => {
  const unique = new Set(getUploadDirCandidates());
  return [...unique];
};

