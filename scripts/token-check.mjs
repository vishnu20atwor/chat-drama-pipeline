// Is the YouTube refresh token still good? Exits 0 if yes, 1 with an
// actionable message if not. Runs early in the workflow so an expired token
// shows up in five seconds instead of after a three-minute render.
import {accessToken} from './lib/google.mjs';

try {
  await accessToken();
  console.log('youtube token ok');
} catch (e) {
  console.error(`  ! ${e.message}`);
  process.exit(1);
}
