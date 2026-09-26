import type { UserRole } from '../../shared/types.js';

declare global {
  namespace Express {
    interface User {
      id: string;
      role: UserRole | string;
      name: string;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
