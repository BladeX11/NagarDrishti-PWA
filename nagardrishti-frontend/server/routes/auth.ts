import { Router } from 'express';

const router = Router();

router.post('/login', (req, res) => {
  try {
    const { role } = req.body;
    if (!['citizen', 'officer', 'admin', 'researcher'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    // In a real app, use proper sessions/JWT
    res.cookie('role', role, { httpOnly: true });
    
    const user = {
      id: `user-${role}-001`,
      role,
      name: `${role.charAt(0).toUpperCase() + role.slice(1)} Demo`
    };

    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('role');
  res.json({ success: true });
});

router.get('/me', (req, res) => {
  try {
    const role = req.headers['x-demo-role'] || req.cookies?.role;
    if (!role) {
      return res.json({ success: true, data: null });
    }
    
    res.json({ 
      success: true, 
      data: {
        id: `user-${role}-001`,
        role,
        name: `${role.charAt(0).toUpperCase() + role.slice(1)} Demo`
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
