import { AuthService } from './src/services/auth.service';

async function test() {
  try {
    const res = await AuthService.register('test_user_local', 'password123');
    console.log('Success:', res);
  } catch (err: any) {
    console.error('Error:', err.message, err.status);
    console.error(err);
  }
}

test();
