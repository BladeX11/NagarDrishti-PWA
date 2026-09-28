import { issueService } from './server/services/issueService.js';
async function test() {
  try {
    const issue = await issueService.getIssue('ND-MUKY6YP3K2P');
    console.log(issue);
  } catch (e: any) {
    console.error("ERROR:", e);
  }
  process.exit(0);
}
test();
