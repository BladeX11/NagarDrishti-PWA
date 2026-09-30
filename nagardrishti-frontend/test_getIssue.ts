import 'dotenv/config';
import { issueService } from './server/services/issueService.js';
async function test() {
  try {
    const issue = await issueService.getIssue('ND-101');
    console.log("Issue ND-101:", issue?.publicRef, issue?.title);
  } catch (e: any) {
    console.error("ERROR:", e);
  }
  process.exit(0);
}
test();