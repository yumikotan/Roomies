import { registerUser } from '../services/authService.js';

(async () => {
  const result = await registerUser(
    'ytanido@scu.edu',
    'test1234',
    'Yumiko Tanido',
    'icon3.png'
  );
  console.log(result);
})();
