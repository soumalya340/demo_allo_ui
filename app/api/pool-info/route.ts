import { proxyBackend } from "../../lib/backend";
export async function GET(request: Request) {
  return proxyBackend("pool-info", request);
}
