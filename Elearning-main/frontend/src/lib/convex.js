import { ConvexProvider, ConvexReactClient } from "convex/react";

// Convex deployment URL
const convexUrl = process.env.REACT_APP_CONVEX_URL || "https://utmost-walrus-476.convex.cloud";

// Create Convex client
export const convex = new ConvexReactClient(convexUrl);

// Export provider component
export const ConvexClientProvider = ({ children }) => {
  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  );
};
