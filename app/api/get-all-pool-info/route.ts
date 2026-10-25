import { proxyBackend } from "../../lib/backend";
export async function GET(request: Request) {
  return proxyBackend("get-all-pool-info", request);
}
