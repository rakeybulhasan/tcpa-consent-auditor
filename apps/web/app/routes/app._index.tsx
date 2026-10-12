import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
};

// Placeholder home page. Findings dashboard lands in Task 4.1.
export default function Index() {
  return (
    <s-page heading="TCPA Consent Auditor">
      <s-section heading="Welcome">
        <s-paragraph>
          The app is installed. Compliance scans and findings will appear here once the
          integrations and rule engine are connected.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
